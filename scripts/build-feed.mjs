import fs from "node:fs";

// Architekturprinzip: Feed und UI-Startmenge (latest.json) sind getrennte
// Sichten auf dieselben Daten (all.json). Sie dürfen sich überschneiden,
// dürfen aber nicht voneinander abhängen.
//
// Feed-Selektionslogik (typabhängig -- bewusste Entscheidung):
//
// Wartungen: nach eventDate selektiert, nicht nach publishedAt.
//   Ein Wartungsfenster in 12 Wochen ist für RSS-Abonnenten relevant.
//   Ein reiner publishedAt-90-Tage-Filter würde es ausschliessen.
//   → zukünftige Wartungen: immer enthalten
//   → kurzfristige Wartungen (Vorlauf < 4 Wochen): immer enthalten
//
// security, release, announcement: nach publishedAt der letzten 90 Tage.
//   Für diese Typen ist der Veröffentlichungszeitpunkt der fachlich
//   relevante Zeitpunkt. Das ist eine bewusste Entscheidung -- nicht
//   eine Vereinfachung.
//
// Sortierung des Feeds: nach publishedAt absteigend.
//   RSS-Reader erwarten chronologische Reihenfolge nach Veröffentlichung,
//   nicht nach fachlichem Wirkungszeitpunkt.

const BASE_URL = process.env.VITEPRESS_BASE_URL ?? "https://lieblingsplatz.cloud";

const allEvents = JSON.parse(
    fs.readFileSync("data/_generated/index/all.json", "utf8")
);

const now = new Date();
const MS_4_WEEKS = 28 * 24 * 60 * 60 * 1000;
const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000;

const feedMaintenance = allEvents.filter((e) => {
    if (e.typeId !== "maintenance") return false;
    const eventDate = new Date(e.eventDate);
    const published = new Date(e.publishedAt);
    const isFuture = eventDate > now;
    const leadTime = eventDate.getTime() - published.getTime();
    const isShort = leadTime < MS_4_WEEKS;
    const justPassed = (now.getTime() - eventDate.getTime()) < MS_7_DAYS;
    return isFuture || (isShort && justPassed);
});

const feedOther = allEvents.filter((e) => {
    if (e.typeId === "maintenance") return false;
    return (now.getTime() - new Date(e.publishedAt).getTime()) < MS_90_DAYS;
});

// Deduplizieren, nach publishedAt sortieren, auf 50 begrenzen
const seenIds = new Set();
const combined = [];
for (const e of [...feedMaintenance, ...feedOther]) {
    if (!seenIds.has(e.id)) {
        seenIds.add(e.id);
        combined.push(e);
    }
}
combined.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
);
const feedFinal = combined.slice(0, 50);

// ── XML-Hilfsfunktion ─────────────────────────────────────────
function escapeXml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// ── Feed-Items ────────────────────────────────────────────────
// Kein <lastBuildDate> pro Item -- das ist ein Channel-Level-Feld in RSS 2.0.
// Item-Level-Änderungszeitstempel wären Atom (<updated>) -- aktuell nicht benötigt.
const items = feedFinal.map((e) => {
    const titlePrefix = e.isCustomerActionRequired ? "[Handlungsbedarf] " : "";

    // Für Wartungen: Wartungsfenster in der Beschreibung
    let description = e.summaryMd ?? "";
    if (e.typeId === "maintenance" && e.eventDate) {
        const start = new Date(e.eventDate).toLocaleString("de-DE", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit",
        });
        const end = e.endDate
            ? new Date(e.endDate).toLocaleString("de-DE", {
                hour: "2-digit", minute: "2-digit",
            })
            : null;
        const window = end
            ? start + " bis " + end + " Uhr"
            : start + " Uhr";
        description = "Wartungsfenster: " + window + ". " + description;
    }

    return (
        "\n  <item>" +
        "\n    <title>" + escapeXml(titlePrefix + e.title) + "</title>" +
        "\n    <link>" + BASE_URL + "/news/" + escapeXml(e.slug) + "</link>" +
        "\n    <guid isPermaLink=\"true\">" +
        BASE_URL + "/news/" + escapeXml(e.slug) +
        "</guid>" +
        "\n    <pubDate>" + new Date(e.publishedAt).toUTCString() + "</pubDate>" +
        "\n    <description>" + escapeXml(description) + "</description>" +
        "\n    <category>" + escapeXml(e.typeId) + "</category>" +
        "\n  </item>"
    );
}).join("");

// ── Feed-XML ──────────────────────────────────────────────────
const xml = (
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<rss version=\"2.0\">\n" +
    "<channel>\n" +
    "  <title>lieblingsplatz.cloud -- News &amp; Ankündigungen</title>\n" +
    "  <link>" + BASE_URL + "</link>\n" +
    "  <description>" +
    "Aktuelle Wartungen, Security-Meldungen, Releases und Ankündigungen" +
    "</description>\n" +
    "  <language>de-DE</language>\n" +
    "  <lastBuildDate>" + now.toUTCString() + "</lastBuildDate>\n" +
    items +
    "\n</channel>\n</rss>\n"
);

fs.mkdirSync("docs/public", { recursive: true });
fs.writeFileSync("docs/public/feed.xml", xml, "utf8");
console.log(
    "Feed erzeugt: docs/public/feed.xml (" +
    feedFinal.length + " Einträge, davon " +
    feedMaintenance.length + " Wartungen)"
);