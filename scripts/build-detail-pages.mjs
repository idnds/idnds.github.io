// build-detail-pages.mjs
//
// Liest data/_generated/index/all.json und erzeugt für jedes Event
// eine statische Markdown-Datei unter docs/news/<slug>.md.
// VitePress rendert diese Dateien zu HTML; Pagefind indiziert sie.
//
// ── Datums-Handling ───────────────────────────────────────────────────────────
// all.json enthält Datumswerte als UTC ISO 8601: "2026-04-16T16:00:00.000Z"
//
// Problem mit new Date(iso).toLocaleString("de-DE"):
//   Node.js-Prozesse auf CI (z.B. GitHub Actions) laufen typischerweise in UTC.
//   toLocaleString() ohne explizite timeZone-Option interpretiert abhängig vom
//   System-Locale des Node-Prozesses → nicht deterministisch → falsche Zeiten.
//
// Lösung: Intl.DateTimeFormat mit timeZone: "Europe/Berlin"
//   - deterministisch auf jedem CI-Server unabhängig vom System-Locale
//   - korrekte Sommer-/Winterzeit (CEST = UTC+2, CET = UTC+1)
//   - "Europe/Berlin" weil lieblingsplatz.cloud ein deutschsprachiger Service ist
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";

const indexPath = "data/_generated/index/all.json";
if (!fs.existsSync(indexPath)) {
    console.error("all.json nicht gefunden. Erst npm run build:index ausführen.");
    process.exit(1);
}

const events = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const outDir = "docs/news";
const BASE_URL = process.env.VITEPRESS_BASE_URL ?? "https://lieblingsplatz.cloud";

fs.mkdirSync(outDir, { recursive: true });

// Lookup-Map für Relations-Verlinkung und bidirektionale Relations
const eventMap = new Map(events.map((e) => [e.id, e]));

// ── Bidirektionale Relations ──────────────────────────────────────────────────
// Wenn Event A → B (z.B. resolves), wird B automatisch auch → A (resolved-by).
// Die YAML-Quelldateien bleiben unverändert -- nur die Anzeige wird erweitert.
const reverseRelationMap = new Map();
const invertType = {
    "resolves": "resolved-by",
    "supersedes": "superseded-by",
    "follow-up-to": "followed-by",
    "relates-to": "relates-to", // symmetrisch
};

for (const event of events) {
    for (const rel of event.relations ?? []) {
        if (!reverseRelationMap.has(rel.eventId)) {
            reverseRelationMap.set(rel.eventId, []);
        }
        reverseRelationMap.get(rel.eventId).push({
            type: invertType[rel.type] ?? "relates-to",
            eventId: event.id,
        });
    }
}

function getEffectiveRelations(event) {
    const explicit = event.relations ?? [];
    const inferred = reverseRelationMap.get(event.id) ?? [];
    const seen = new Set(explicit.map((r) => r.eventId));
    const merged = [...explicit];
    for (const r of inferred) {
        if (!seen.has(r.eventId)) {
            seen.add(r.eventId);
            merged.push(r);
        }
    }
    return merged;
}

// ── Datums-Formatierung ───────────────────────────────────────────────────────
/**
 * Formatiert einen UTC ISO-String für die HTML-Anzeige auf statischen Detailseiten.
 *
 * Verwendet Intl.DateTimeFormat mit timeZone: "Europe/Berlin" statt
 * new Date(iso).toLocaleString("de-DE") (wäre system-locale-abhängig auf CI).
 *
 * Beispiel:
 *   Input:  "2026-04-16T16:00:00.000Z"
 *   Output: "16.04.2026, 18:00 Uhr" (bei CEST = UTC+2)
 *
 * @param {string|null} iso - UTC ISO 8601-String
 * @returns {string} Formatierter String im deutschen Datumsformat, oder ""
 */
function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";

    return new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin", // explizit -- deterministisch auf jedem CI-Server
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d) + " Uhr";
}

/**
 * Formatiert ein Wartungsfenster als lesbaren Zeitraum.
 *
 * Gleicher Tag:   "16.04.2026, 20:00–22:00 Uhr"
 * Verschiedene:   "16.04.2026, 22:00 Uhr – 17.04.2026, 02:00 Uhr"
 *
 * @param {string} start - UTC ISO eventDate
 * @param {string} end   - UTC ISO endDate
 * @returns {string}
 */
function formatDateRange(start, end) {
    if (!start || !end) return formatDateTime(start);

    const fmt = new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric", month: "2-digit", day: "2-digit",
    });
    const fmtTime = new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit", minute: "2-digit",
    });

    const ds = new Date(start);
    const de = new Date(end);
    const sameDay = fmt.format(ds) === fmt.format(de);

    if (sameDay) {
        return fmt.format(ds) + ", " + fmtTime.format(ds) + "\u2013" + fmtTime.format(de) + " Uhr";
    }
    return fmt.format(ds) + ", " + fmtTime.format(ds) + " Uhr \u2013 " +
        fmt.format(de) + ", " + fmtTime.format(de) + " Uhr";
}

// ── Label-Maps ────────────────────────────────────────────────────────────────
const relationLabel = {
    "relates-to": "Verwandtes Event",
    "resolves": "Behebt",
    "follow-up-to": "Nachfolger von",
    "supersedes": "Ersetzt",
    "resolved-by": "Behoben durch",
    "followed-by": "Vorgänger von",
    "superseded-by": "Ersetzt durch",
};

const typeSymbol = {
    // maintenance: "🔧",
    maintenance: "⚙",
    security: "🛡️",
    release: "🚀",
    // announcement: "📣",
    announcement: "📢",
};

// ── Seitengenerierung ─────────────────────────────────────────────────────────
for (const event of events) {
    const lines = [];
    const add = (l) => lines.push(l);
    const gap = () => lines.push("");

    // VitePress Frontmatter
    add("---");
    add("title: \"" + event.title.replace(/"/g, '\\"') + "\"");
    add("layout: doc");
    add("---");
    gap();

    // Badges (EventDetailBadges-Komponente -- registriert in theme/index.js)
    const eventJsonSafe = JSON.stringify({
        id: event.id,
        typeId: event.typeId,
        slug: event.slug,
        impact: event.impact,
        products: event.products,
        eventType: event.eventType,
        status: event.status,
        eventDate: event.eventDate,
        endDate: event.endDate,
    }).replace(/"/g, "&quot;");
    add('<EventDetailBadges event-json="' + eventJsonSafe + '" />');
    gap();

    // Titel mit Unicode-Symbol
    const symbol = typeSymbol[event.typeId] ?? "";
    add("# " + event.title);
    gap();

    // Meta-Tabelle
    // add("| **Typ** | " + (event.eventType?.name ?? event.typeId) + (symbol ? symbol + " " : "") + " |");
    add("| **Typ** | " + (event.eventType?.name ?? event.typeId) + " |");
    add("|---|---|");
    add("| **Hersteller** | " + (event.vendor?.name ?? event.vendorId) + " |");
    add("| **Produkte** | " +
        (event.products?.map((p) => p.name).join(", ") || event.productIds.join(", ")) + " |");

    // Datum: formatDateTime(UTC-ISO) → lokale Zeit "Europe/Berlin"
    add("| **Veröffentlicht** | " + formatDateTime(event.publishedAt) + " |");
    if (event.updatedAt) {
        add("| **Zuletzt aktualisiert** | " + formatDateTime(event.updatedAt) + " |");
    }
    if (event.typeId === "maintenance" && event.eventDate) {
        // Wartungsfenster als lesbaren Zeitraum anzeigen
        add("| **Wartungsfenster** | " + formatDateRange(event.eventDate, event.endDate) + " |");
    }
    if (event.typeId === "release" && event.version) {
        add("| **Version** | " + event.version + " |");
        if (event.changelogUrl) {
            add("| **Changelog** | [Link](" + event.changelogUrl + ") |");
        }
    }
    if (event.typeId === "security") {
        if (event.severity) add("| **Severity** | " + event.severity + " |");
        if (event.cveIds?.length) {
            const cveLinks = event.cveIds.map((cve) =>
                "[" + cve + "](https://nvd.nist.gov/vuln/detail/" + cve + ")"
            ).join(", ");
            add("| **CVE-IDs** | " + cveLinks + " |");
        }
        if (event.affectedVersions?.length) {
            add("| **Betroffene Versionen** | " + event.affectedVersions.join(", ") + " |");
        }
        if (event.fixedVersion) add("| **Behoben in** | " + event.fixedVersion + " |");
    }
    gap();

    // Zusammenfassung
    if (event.summaryMd) {
        add("## 📝 Zusammenfassung {#summary}");
        gap();
        add(event.summaryMd);
        gap();
    }

    // Details
    if (event.detailsMd) {
        add("## 🔍 Details {#details}");
        gap();
        add(event.detailsMd);
        gap();
    }

    // Handlungsbedarf: ohne "Handlungsbedarf"-Label im warning-Block
    // (Überschrift "Was jetzt zu tun ist" ist ausreichend)
    if (event.customerActionMd) {
        add("## ⚠️ Was jetzt zu tun ist {#action}");
        gap();
        add(event.customerActionMd);
        gap();
    }

    // Verwandte Events (bidirektional)
    const effectiveRelations = getEffectiveRelations(event);
    if (effectiveRelations.length) {
        add("## 🔗 Verwandte Events {#relations}");
        gap();
        for (const rel of effectiveRelations) {
            const related = eventMap.get(rel.eventId);
            const label = relationLabel[rel.type] ?? rel.type;
            if (related) {
                add("- **" + label + ":** [" + related.title + "](/news/" + related.slug + ")");
            } else {
                add("- **" + label + ":** `" + rel.eventId + "`");
            }
        }
        gap();
    }

    // ── Support-Hinweis immer als letzter Abschnitt ──────────────────────────────────────
    add("## 💬 Können wir helfen?");
    gap();
    add("Bei Fragen oder Unterstützungsbedarf wenden Sie sich bitte an unseren Support unter [servicedesk@idnds.de](mailto:servicedesk@idnds.de).");
    gap();

    const outPath = path.join(outDir, event.slug + ".md");
    fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
}

console.log("Detailseiten erzeugt: " + events.length + " Seiten unter docs/news/");
