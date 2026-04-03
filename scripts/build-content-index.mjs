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

        const sortDate =
            (d.typeId === "maintenance" && d.eventDate)
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
                ? d.affectedVersions
                : null,
            fixedVersion: d.fixedVersion ?? null,
            impact: d.impact ?? [],
            isCustomerActionRequired: (d.impact ?? []).includes("action-required"),
            hasRelations: (d.relations?.length ?? 0) > 0,
            vendor: vendors.get(d.vendorId) ?? null,
            products: (d.productIds ?? [])
                .map((id) => products.get(id))
                .filter(Boolean),
            eventType: eventTypes.get(d.typeId) ?? null,
            detailsMd: d.detailsMd ?? "",
            customerActionMd: d.customerActionMd ?? null,
            relations: d.relations ?? [],
        });
    }
}

// ── Sortierung global ─────────────────────────────────────────
allEventsFull.sort(
    (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
);

// ── slim ──────────────────────────────────────────────────────
function slim(event) {
    const { detailsMd, customerActionMd, relations, ...rest } = event;
    return rest;
}

function writeIndex(filename, data) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
    console.log("Erzeugt: " + filename + " (" + data.length + " Einträge)");
}

// ── all.json ──────────────────────────────────────────────────
writeIndex("data/_generated/index/all.json", allEventsFull);

// ── by-year ───────────────────────────────────────────────────
const byYear = {};
for (const e of allEventsFull) {
    const year = new Date(e.sortDate).getFullYear().toString();
    (byYear[year] = byYear[year] ?? []).push(slim(e));
}
for (const [year, events] of Object.entries(byYear)) {
    writeIndex("data/_generated/index/by-year/" + year + ".json", events);
}

// ── by-type ────────────────────────────────────────────────────
const byType = {};
for (const e of allEventsFull) {
    (byType[e.typeId] = byType[e.typeId] ?? []).push(slim(e));
}
for (const [typeId, events] of Object.entries(byType)) {
    writeIndex("data/_generated/index/by-type/" + typeId + ".json", events);
}

// ── by-vendor ──────────────────────────────────────────────────
const byVendor = {};
for (const e of allEventsFull) {
    (byVendor[e.vendorId] = byVendor[e.vendorId] ?? []).push(slim(e));
}
for (const [vendorId, events] of Object.entries(byVendor)) {
    writeIndex("data/_generated/index/by-vendor/" + vendorId + ".json", events);
}

// ── latest.json (KORRIGIERT: einheitliche Zeitlogik) ──────────
const now = new Date();
const MS_2_YEARS = 2 * 365 * 24 * 60 * 60 * 1000;
const MAX_TOTAL = 200;

// zukünftige Maintenance bleibt separat priorisiert
const maintenanceFuture = allEventsFull
    .filter(e =>
        e.typeId === "maintenance" &&
        new Date(e.eventDate) > now
    )
    .sort((a, b) =>
        new Date(a.eventDate) - new Date(b.eventDate)
    );

// EINHEITLICHER HISTORIENFILTER (keine Sonderfälle mehr)
const cutoff = now.getTime() - MS_2_YEARS;

const recentEvents = allEventsFull.filter(e => {
    const ts = new Date(e.sortDate).getTime();
    return ts >= cutoff;
});

// Pool zusammenführen
const pool = [
    ...maintenanceFuture,
    ...recentEvents
];

// Dedup + Limit
const seen = new Set();
const latest = [];

for (const e of pool) {
    if (!seen.has(e.id)) {
        seen.add(e.id);
        latest.push(e);
    }
    if (latest.length >= MAX_TOTAL) break;
}

// finale Sortierung
const latestSlim = latest
    .map(slim)
    .sort((a, b) =>
        new Date(b.sortDate).getTime() -
        new Date(a.sortDate).getTime()
    );

writeIndex("data/_generated/index/latest.json", latestSlim);

// ── options.json ──────────────────────────────────────────────
const usedTypeIds = new Set(allEventsFull.map(e => e.typeId));
const usedVendorIds = new Set(allEventsFull.map(e => e.vendorId));

const optionsData = {
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

// ── masters.json ──────────────────────────────────────────────
writePair(
    "data/_generated/masters.json",
    "docs/public/data/_generated/masters.json",
    JSON.stringify({
        vendors: readYamlFiles("data/master/vendors").map(v => v.data),
        products: readYamlFiles("data/master/products").map(p => p.data),
    }, null, 2)
);

// ── Kopie nach public ─────────────────────────────────────────
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

// ── Abschluss ────────────────────────────────────────────────
console.log(
    "\nIndex-Build abgeschlossen." +
    "\n  " + allEventsFull.length + " Events gesamt" +
    "\n  latest.json: " + latestSlim.length + " Events" +
    "\n  all.json ist nur intern verfügbar\n"
);