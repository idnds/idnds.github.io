// scripts/build-feed.mjs
//
// ─────────────────────────────────────────────────────────────────────────────
// Erzeugt zwei Feeds aus derselben Datenbasis:
//
//   1. RSS 2.0  → docs/public/feed.xml
//      Sortierung nach publishedAt DESC.
//      Kein Update-Tracking (RSS hat kein sauberes Item-<updated>).
//
//   2. Atom 1.0 → docs/public/atom.xml
//      Sortierung nach updatedAt ?? publishedAt DESC.
//      Aktualisierte Events erscheinen damit oben -- das entspricht dem
//      Atom-Usecase besser als eine reine publishedAt-Sortierung.
//      Spec: RFC 4287
//
// Architekturprinzipien:
//   - Single Source of Truth: data/_generated/index/all.json
//   - Gemeinsame Selektion (selectFeedEvents), getrennte Sortierung
//   - Getrennte Formatter (buildRss / buildAtom)
//   - Fehlerisolation: Build bricht nur ab wenn BEIDE Feeds fehlschlagen
//   - Datumsformatierung: Intl.DateTimeFormat + timeZone: "Europe/Berlin"
//     (deterministisch auf CI -- Node hat keine definierte Browser-Zeitzone)
//
// Datumsformate:
//   YAML / all.json       → UTC ISO 8601 ("...Z")
//   Beschreibungstext     → "Europe/Berlin" via Intl.DateTimeFormat
//   Atom <updated>/<published> → UTC ISO via toIso() aus dateUtils.mjs
//   RSS <pubDate>         → RFC 822 via Date.toUTCString()
//
// summaryMd-Handling:
//   summaryMd wird als Plaintext übergeben (kein Markdown→HTML-Rendering).
//   Das ist eine bewusste Entscheidung: RSS/Atom-Reader zeigen Plaintext
//   zuverlässiger als HTML an; escapeXml() verhindert Markup-Injection.
//   Falls später HTML gewünscht wird: marked.parse(e.summaryMd) + type="html"
//   im Atom-<summary> ergänzen und escapeXml() entfernen.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { toIso } from "./shared/dateUtils.mjs";

// ── Konfiguration ─────────────────────────────────────────────────────────────

const BASE_URL = process.env.VITEPRESS_BASE_URL ?? "https://lieblingsplatz.cloud";
const INPUT_PATH = "data/_generated/index/all.json";
const OUTPUT_DIR = "docs/public";

const FEED_AUTHOR = "id-netsolutions Digital Solutions GmbH";
const FEED_TITLE = "Lieblingsplatz.cloud \u2013 News & Ank\u00FCndigungen";
const FEED_DESC = "Aktuelle Wartungen, Security-Meldungen, Releases und Ank\u00FCndigungen";

const MS_4_WEEKS = 28 * 24 * 60 * 60 * 1000;
const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 50;

// ── Utility ───────────────────────────────────────────────────────────────────

function escapeXml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * Gibt den relevanten "updated"-Zeitpunkt zurück.
 * updatedAt wenn vorhanden (letzte inhaltliche Änderung), sonst publishedAt.
 *
 * @param {object} e
 * @returns {string} UTC ISO-String
 */
function getUpdatedDate(e) {
    return e.updatedAt ?? e.publishedAt;
}

/**
 * Parst einen Datumswert sicher zu einem Timestamp.
 * Gibt -Infinity zurück wenn der Wert ungültig ist (NaN-Guard).
 * Verhindert dass ein kaputtes updatedAt-Feld die Reduce-Logik stört.
 *
 * @param {string|null|undefined} dateStr
 * @returns {number} Timestamp oder -Infinity
 */
function safeTimestamp(dateStr) {
    if (!dateStr) return -Infinity;
    const t = new Date(dateStr).getTime();
    return isNaN(t) ? -Infinity : t;
}

/**
 * Formatiert ein Wartungsfenster als lesbaren deutschen Datumsstring.
 * Intl.DateTimeFormat mit timeZone: "Europe/Berlin" -- deterministisch auf CI.
 *
 * @param {string} eventDate - UTC ISO
 * @param {string|null} endDate   - UTC ISO oder null
 * @returns {string} z.B. "16.04.2026, 20:00 bis 22:00 Uhr"
 */
function formatMaintenanceWindow(eventDate, endDate) {
    const fmtDateTime = new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
    });
    const fmtTimeOnly = new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit", minute: "2-digit",
    });
    const start = fmtDateTime.format(new Date(eventDate));
    const end = endDate ? fmtTimeOnly.format(new Date(endDate)) : null;
    return end ? start + " bis " + end + " Uhr" : start + " Uhr";
}

/**
 * Baut den Beschreibungstext für einen Feed-Eintrag.
 * Wartungen: formatiertes Wartungsfenster vorangestellt.
 * summaryMd: als Plaintext (bewusste Entscheidung, siehe Datei-Kommentar).
 *
 * @param {object} e
 * @returns {string}
 */
function buildDescription(e) {
    let text = e.summaryMd ?? "";
    if (e.typeId === "maintenance" && e.eventDate) {
        const window = formatMaintenanceWindow(e.eventDate, e.endDate ?? null);
        text = "Wartungsfenster: " + window + ". " + text;
    }
    // TODO (künftiges Feature): e.updates[] wenn im Datenmodell definiert
    return text;
}

// ── Daten-Selektion ───────────────────────────────────────────────────────────

/**
 * Selektiert Feed-relevante Events. Gemeinsame Logik für RSS und Atom.
 *
 * Wartungen: zukünftig + kurzfristig (< 4 Wochen Vorlauf, max. 7 Tage vergangen).
 * Alle anderen: letzte 90 Tage nach publishedAt.
 *
 * Gibt einen UNSORTIERTEN deduplizierten Pool zurück.
 * Sortierung erfolgt getrennt in buildRss / buildAtom.
 *
 * @param {object[]} allEvents
 * @returns {object[]}
 */
function selectFeedEvents(allEvents) {
    const now = new Date();

    const maintenance = allEvents.filter((e) => {
        if (e.typeId !== "maintenance") return false;
        const eventDate = new Date(e.eventDate);
        const published = new Date(e.publishedAt);
        const isFuture = eventDate > now;
        const leadTime = eventDate.getTime() - published.getTime();
        const isShort = leadTime < MS_4_WEEKS;
        const justPassed = (now.getTime() - eventDate.getTime()) < MS_7_DAYS;
        return isFuture || (isShort && justPassed);
    });

    const other = allEvents.filter((e) => {
        if (e.typeId === "maintenance") return false;
        return (now.getTime() - new Date(e.publishedAt).getTime()) < MS_90_DAYS;
    });

    const seen = new Set();
    const combined = [];
    for (const e of [...maintenance, ...other]) {
        if (!seen.has(e.id)) { seen.add(e.id); combined.push(e); }
    }

    return combined; // unsortiert -- Sortierung in buildRss / buildAtom
}

// ── RSS 2.0 Builder ───────────────────────────────────────────────────────────

/**
 * Erzeugt RSS 2.0 XML.
 *
 * Sortierung: publishedAt DESC.
 * RSS kennt kein Update-Tracking auf Item-Ebene -- publishedAt ist der richtige
 * Sortierschlüssel. Feed-Reader erwarten <lastBuildDate> als Build-Zeitpunkt.
 *
 * @param {object[]} feedEvents - unsortierter Pool aus selectFeedEvents
 * @returns {string}
 */
function buildRss(feedEvents) {
    // RSS: nach publishedAt absteigend sortieren
    const sorted = [...feedEvents]
        .sort((a, b) => safeTimestamp(b.publishedAt) - safeTimestamp(a.publishedAt))
        .slice(0, MAX_ENTRIES);

    const items = sorted.map((e) => `
  <item>
    <title>${escapeXml(e.title)}</title>
    <link>${BASE_URL}/news/${escapeXml(e.slug)}</link>
    <guid isPermaLink="true">${BASE_URL}/news/${escapeXml(e.slug)}</guid>
    <pubDate>${new Date(e.publishedAt).toUTCString()}</pubDate>
    <description>${escapeXml(buildDescription(e))}</description>
    <category>${escapeXml(e.typeId)}</category>
  </item>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(FEED_TITLE)}</title>
  <link>${BASE_URL}</link>
  <description>${escapeXml(FEED_DESC)}</description>
  <language>de-DE</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`;
}

// ── Atom 1.0 Builder ──────────────────────────────────────────────────────────

/**
 * Erzeugt Atom 1.0 XML (RFC 4287).
 *
 * Sortierung: updatedAt ?? publishedAt DESC.
 * Aktualisierte Events erscheinen oben -- das entspricht dem Atom-Usecase.
 * RSS und Atom haben bewusst unterschiedliche Sortierungen:
 *   RSS  → Erstveröffentlichung (publishedAt)
 *   Atom → letzte Änderung (updatedAt ?? publishedAt)
 *
 * Feed-<updated>: neuester getUpdatedDate-Wert aller Einträge (nicht Build-Zeit).
 * <author> auf Feed-Ebene: RFC 4287 §4.1.1 verpflichtend.
 *
 * @param {object[]} feedEvents - unsortierter Pool aus selectFeedEvents
 * @returns {string}
 */
function buildAtom(feedEvents) {
    // Atom: nach updatedAt ?? publishedAt absteigend sortieren
    const sorted = [...feedEvents]
        .sort((a, b) => safeTimestamp(getUpdatedDate(b)) - safeTimestamp(getUpdatedDate(a)))
        .slice(0, MAX_ENTRIES);

    // Feed-<updated>: neuester Entry-Zeitpunkt -- NICHT Build-Zeitpunkt.
    // safeTimestamp() verhindert NaN bei ungültigen Datumswerten.
    const feedUpdated = sorted.reduce(
        (latest, e) => Math.max(latest, safeTimestamp(getUpdatedDate(e))),
        -Infinity
    );
    const feedUpdatedStr = feedUpdated > -Infinity
        ? new Date(feedUpdated).toISOString()
        : new Date().toISOString(); // Fallback: leerer Feed

    const entries = sorted.map((e) => `
  <entry>
    <title>${escapeXml(e.title)}</title>
    <link href="${BASE_URL}/news/${escapeXml(e.slug)}"/>
    <id>${BASE_URL}/news/${escapeXml(e.slug)}</id>
    <published>${toIso(e.publishedAt)}</published>
    <updated>${toIso(getUpdatedDate(e))}</updated>
    <summary type="text">${escapeXml(buildDescription(e))}</summary>
    <category term="${escapeXml(e.typeId)}"/>
  </entry>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(FEED_TITLE)}</title>
  <link href="${BASE_URL}/atom.xml" rel="self"/>
  <link href="${BASE_URL}"/>
  <id>${BASE_URL}/atom.xml</id>
  <updated>${feedUpdatedStr}</updated>
  <author><n>${escapeXml(FEED_AUTHOR)}</n></author>
  <subtitle>${escapeXml(FEED_DESC)}</subtitle>
${entries}
</feed>
`;
}

// ── Safe Writer ───────────────────────────────────────────────────────────────

function writeFileSafe(filePath, content, label) {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, "utf8");
        console.log(label + " erfolgreich erzeugt: " + filePath);
        return true;
    } catch (err) {
        console.error(label + " fehlgeschlagen:", err.message);
        return false;
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (!fs.existsSync(INPUT_PATH)) {
    console.error("all.json nicht gefunden. Erst npm run build:index ausführen.");
    process.exit(1);
}

const allEvents = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
const feedEvents = selectFeedEvents(allEvents);

const rssOk = writeFileSafe(path.join(OUTPUT_DIR, "feed.xml"), buildRss(feedEvents), "RSS 2.0");
const atomOk = writeFileSafe(path.join(OUTPUT_DIR, "atom.xml"), buildAtom(feedEvents), "Atom 1.0");

// Build bricht nur ab wenn BEIDE Feeds fehlschlagen
if (!rssOk && !atomOk) process.exit(1);

console.log(
    "\nFeeds erzeugt: " + feedEvents.length + " Einträge" +
    "\n  RSS:  " + (rssOk ? "OK" : "FEHLER") +
    "\n  Atom: " + (atomOk ? "OK" : "FEHLER") + "\n"
);
