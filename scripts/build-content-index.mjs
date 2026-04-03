import fs from "node:fs";
import path from "node:path";
import { readYamlFiles } from "./utils.mjs";
import { getSchemaForType } from "./schemas/content.mjs";

// ── Stammdaten laden ──────────────────────────────────────────
const vendors = new Map(
    readYamlFiles("data/master/vendors").map((v) => [v.data.vendorId, v.data])
);
const products = new Map(
    readYamlFiles("data/master/products").map((p) => [p.data.productId, p.data])
);
const eventTypes = new Map(
    readYamlFiles("data/master/event-types").map((t) => [t.data.typeId, t.data])
);

// ── Events laden, validieren, anreichern ─────────────────────
const contentDirs = ["maintenance", "security", "release", "announcement"];
const allEventsFull = [];

for (const dir of contentDirs) {
    for (const { filePath, data } of readYamlFiles("data/content/" + dir)) {
        const result = getSchemaForType(data?.typeId).safeParse(data);
        if (!result.success) {
            console.warn("Übersprungen (Validierungsfehler): " + filePath);
            continue;
        }

        const d = result.data;

        // sortDate: fachlicher Sortierschlüssel.
        // Architekturprinzip: by-year verwendet das Jahr von sortDate --
        // eine Wartung im März 2027, angekündigt im Dezember 2026, liegt in 2027.json.
        // Maintenance: wann das Event Wirkung entfaltet (nicht wann angekündigt).
        // Alle anderen: wann veröffentlicht.
        const sortDate = (d.typeId === "maintenance" && d.eventDate)
            ? d.eventDate
            : d.publishedAt;

        allEventsFull.push({
            id: d.id,
            slug: d.slug,
            typeId: d.typeId,
            vendorId: d.vendorId,
            productIds: d.productIds,
            sortDate,
            title: d.title,
            publishedAt: d.publishedAt,
            updatedAt: d.updatedAt ?? null,
            summaryMd: d.summaryMd,
            status: d.status ?? null,
            eventDate: d.eventDate ?? null,
            endDate: d.endDate ?? null,
            version: d.version ?? null,
            changelogUrl: d.changelogUrl ?? null,
            severity: d.severity ?? null,
            cveIds: d.cveIds?.length ? d.cveIds : null,
            affectedVersions: d.affectedVersions?.length
                ? d.affectedVersions : null,
            fixedVersion: d.fixedVersion ?? null,
            impact: d.impact ?? [],
            isCustomerActionRequired: (d.impact ?? []).includes("action-required"),
            hasRelations: (d.relations?.length ?? 0) > 0,
            vendor: vendors.get(d.vendorId) ?? null,
            products: (d.productIds ?? []).map((id) => products.get(id)).filter(Boolean),
            eventType: eventTypes.get(d.typeId) ?? null,
            // Vollständige Felder -- nur in all.json, nicht in Übersichts-Indizes
            detailsMd: d.detailsMd ?? "",
            customerActionMd: d.customerActionMd ?? null,
            relations: d.relations ?? [],
        });
    }
}

// Nach sortDate absteigend sortieren (neueste / nächste zuerst)
allEventsFull.sort(
    (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
);

// ── slim(): Übersichts-Indizes von großen Feldern bereinigen ──
// detailsMd, customerActionMd, relations nicht in Browser-Indizes.
// Das hält die vom Browser geladenen JSON-Dateien klein.
function slim(event) {
    // eslint-disable-next-line no-unused-vars
    const { detailsMd, customerActionMd, relations, ...rest } = event;
    return rest;
}

// ── Schreib-Hilfsfunktion ─────────────────────────────────────
function writeIndex(filename, data) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
    console.log("Erzeugt: " + filename + " (" + data.length + " Einträge)");
}

// ── all.json: vollständig, nur intern ────────────────────────
// Enthält alle Felder. Wird von build-detail-pages.mjs und build-feed.mjs
// verwendet. Wird NICHT nach docs/public/ kopiert -- Browser soll niemals
// den vollständigen Eventbestand laden.
writeIndex("data/_generated/index/all.json", allEventsFull);

// ── Jahres-Indizes (slim) ─────────────────────────────────────
// Jahr aus sortDate: Wartungen landen im Archivjahr ihrer Durchführung.
const byYear = {};
for (const e of allEventsFull) {
    const year = new Date(e.sortDate).getFullYear().toString();
    (byYear[year] = byYear[year] ?? []).push(slim(e));
}
for (const [year, events] of Object.entries(byYear)) {
    writeIndex("data/_generated/index/by-year/" + year + ".json", events);
}

// ── Typ-Indizes (slim) ────────────────────────────────────────
const byType = {};
for (const e of allEventsFull) {
    (byType[e.typeId] = byType[e.typeId] ?? []).push(slim(e));
}
for (const [typeId, events] of Object.entries(byType)) {
    writeIndex("data/_generated/index/by-type/" + typeId + ".json", events);
}

// ── Hersteller-Indizes (slim) ─────────────────────────────────
const byVendor = {};
for (const e of allEventsFull) {
    (byVendor[e.vendorId] = byVendor[e.vendorId] ?? []).push(slim(e));
}
for (const [vendorId, events] of Object.entries(byVendor)) {
    writeIndex("data/_generated/index/by-vendor/" + vendorId + ".json", events);
}

// ── latest.json: priorisierte kuratierte Startmenge (slim) ────
//
// Architekturprinzip: latest.json zeigt was für Nutzer gerade relevant ist.
// Keine starre Zeitscheibe -- fachliche Priorisierung.
//
// Explizite Prioritätsstruktur:
//
// Priorität 1 -- Kurzfristige Wartungen (GARANTIERT enthalten, kein Limit)
//   Wartungen bei denen Vorlaufzeit < 4 Wochen.
//   Aktuell bevorstehend ODER in den letzten 7 Tagen abgelaufen.
//   Diese Gruppe wird IMMER vollständig in latest.json aufgenommen.
//   Das globale Limit greift hier NICHT.
//
// Priorität 2 -- Zukünftige Wartungen (max. MAX_FUTURE)
//   Alle Maintenance-Events mit eventDate in der Zukunft.
//   Aufsteigend nach eventDate (nächster Termin oben).
//   Begrenzt auf MAX_FUTURE -- mehr würde die Startansicht dominieren.
//
// Priorität 3 -- Aktuelle nicht-Wartungs-Events (letzte 2 Jahre)
//   security, release, announcement nach publishedAt.
//
// Gesamtbegrenzung:
//   P1 ist garantiert -- keine Begrenzung.
//   P2+P3 zusammen füllen die verbleibenden Plätze bis MAX_TOTAL.
//   Das heißt: bei vielen P1-Events kann P2/P3 kleiner werden.
//   Das ist fachlich richtig: kurzfristige Dringlichkeit hat Vorrang.

const now = new Date();
const MS_4_WEEKS = 28 * 24 * 60 * 60 * 1000;
const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const MS_2_YEARS = 2 * 365 * 24 * 60 * 60 * 1000;
const MAX_FUTURE = 4;
const MAX_TOTAL = 200;

// Priorität 1: kurzfristige Wartungen (garantiert, kein Limit)
const p1ShortNotice = allEventsFull.filter((e) => {
    if (e.typeId !== "maintenance") return false;
    const eventDate = new Date(e.eventDate);
    const published = new Date(e.publishedAt);
    const leadTime = eventDate.getTime() - published.getTime();
    const isShort = leadTime < MS_4_WEEKS;
    const upcoming = eventDate > now;
    const veryRecent = (now.getTime() - eventDate.getTime()) < MS_7_DAYS;
    return isShort && (upcoming || veryRecent);
});

const p1Ids = new Set(p1ShortNotice.map((e) => e.id));

// Priorität 2: zukünftige Wartungen (max. MAX_FUTURE)
// Bereits in P1 enthaltene Events nicht doppelt aufnehmen.
const p2Future = allEventsFull
    .filter((e) =>
        e.typeId === "maintenance" &&
        new Date(e.eventDate) > now &&
        !p1Ids.has(e.id)
    )
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, MAX_FUTURE);

// vergangene Wartungen (garantiert, kein Limit)
const pPastMaintenance = allEventsFull.filter((e) =>
    e.typeId === "maintenance" &&
    new Date(e.eventDate) <= now &&
    !p1Ids.has(e.id)
);

// Priorität 3: nicht-Wartungs-Events der letzten 2 Jahre
const p3Other = allEventsFull.filter((e) => {
    if (e.typeId === "maintenance") return false;
    return (now.getTime() - new Date(e.publishedAt).getTime()) < MS_2_YEARS;
});

// Zusammenführung:
// P1 vollständig voranstellen (garantiert).
// Verbleibende Plätze (MAX_TOTAL - p1.length) mit P2+P3 auffüllen.
const remainingSlots = Math.max(0, MAX_TOTAL - p1ShortNotice.length);

const p2p3Pool = [
    ...pPastMaintenance,
    ...p2Future,
    ...p3Other,
];

// Erst global nach sortDate sortieren → verhindert Typ-Dominanz
p2p3Pool.sort(
    (a, b) =>
        new Date(b.sortDate).getTime() -
        new Date(a.sortDate).getTime()
);

const seenIds = new Set(p1Ids);
const p2p3 = [];

for (const e of p2p3Pool) {
    if (!seenIds.has(e.id)) {
        seenIds.add(e.id);
        p2p3.push(e);
    }
}

const p2p3Capped = p2p3.slice(0, remainingSlots);

// nur Zeitachse entscheidet
const latestUnsorted = [
    ...p1ShortNotice,
    ...p2p3Capped,
];

const latest = latestUnsorted
    .map(slim)
    .sort(
        (a, b) =>
            new Date(b.sortDate).getTime() -
            new Date(a.sortDate).getTime()
    );

writeIndex("data/_generated/index/latest.json", latest);

// ── options.json: Facettenindex für EventFilter-Dropdowns ─────
//
// Architekturprinzip: options.json ist ausschließlich ein Facettenindex
// für die EventFilter-Dropdowns.
//   - Enthält nur Typen/Hersteller die mindestens ein Event haben
//   - Nicht die fachliche Wahrheit aller Stammdaten
//   - Nicht für Detailseiten oder den Feed bestimmt
//
// Verhindert "verschwindende" Dropdown-Optionen wenn ein Typ oder Hersteller
// gerade nicht in latest.json vorkommt.

const usedTypeIds = new Set(allEventsFull.map((e) => e.typeId));
const usedVendorIds = new Set(allEventsFull.map((e) => e.vendorId));

const optionsData = {
    // localeCompare(compareString, locale) -- Reihenfolge der Parameter beachten
    types: Array.from(eventTypes.entries())
        .filter(([typeId]) => usedTypeIds.has(typeId))
        .map(([value, t]) => ({ value, label: t.name, color: t.color }))
        .sort((a, b) => a.label.localeCompare(b.label, "de")),

    vendors: Array.from(vendors.entries())
        .filter(([vendorId, v]) => usedVendorIds.has(vendorId) && !v.deprecatedAt)
        .map(([value, v]) => ({ value, label: v.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "de")),
};

const writePair = (internalPath, publicPath, content) => {
    fs.mkdirSync(path.dirname(internalPath), { recursive: true });
    fs.mkdirSync(path.dirname(publicPath), { recursive: true });
    fs.writeFileSync(internalPath, content, "utf8");
    fs.writeFileSync(publicPath, content, "utf8");
};

writePair(
    "data/_generated/options.json",
    "docs/public/data/_generated/options.json",
    JSON.stringify(optionsData, null, 2)
);
console.log(
    "Erzeugt: options.json (" +
    optionsData.types.length + " Typen, " +
    optionsData.vendors.length + " Hersteller)"
);

// ── masters.json für das Formular (/news/add) ─────────────────
const mastersJson = JSON.stringify(
    {
        vendors: readYamlFiles("data/master/vendors").map((v) => v.data),
        products: readYamlFiles("data/master/products").map((p) => p.data),
    },
    null, 2
);
writePair(
    "data/_generated/masters.json",
    "docs/public/data/_generated/masters.json",
    mastersJson
);

// ── Indizes nach docs/public/ kopieren ───────────────────────
// all.json wird NICHT kopiert -- Browser soll vollständigen Bestand nie laden.
const publicBase = "docs/public/data/_generated/index";
fs.mkdirSync(publicBase, { recursive: true });

for (const subdir of ["by-year", "by-type", "by-vendor"]) {
    const src = "data/_generated/index/" + subdir;
    const dst = publicBase + "/" + subdir;
    fs.mkdirSync(dst, { recursive: true });
    if (fs.existsSync(src)) {
        for (const f of fs.readdirSync(src)) {
            fs.copyFileSync(path.join(src, f), path.join(dst, f));
        }
    }
}
fs.copyFileSync(
    "data/_generated/index/latest.json",
    path.join(publicBase, "latest.json")
);
// all.json wird bewusst NICHT nach public/ kopiert.

// ── Abschlussmeldung ──────────────────────────────────────────
console.log(
    "\nIndex-Build abgeschlossen." +
    "\n  " + allEventsFull.length + " Events gesamt (all.json, nur intern)" +
    "\n  latest.json: " + latest.length + " Events (priorisiert kuratiert)" +
    "\n    P1 kurzfristige Wartungen (garantiert): " + p1ShortNotice.length +
    "\n    P2 zukünftige Wartungen (max. " + MAX_FUTURE + "):  " + p2Future.length +
    "\n    P3 andere (2 Jahre):                   " + p3Other.length +
    "\n    P2+P3 nach Deduplizierung + Limit:      " + p2p3Capped.length +
    "\n  all.json wurde NICHT nach public/ kopiert\n"
);
