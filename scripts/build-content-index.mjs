import fs from "node:fs";
import path from "node:path";
import { readYamlFiles } from "./utils.mjs";
import { getSchemaForType } from "./schemas/content.mjs";

// Master-Daten laden
const vendors = new Map(
    readYamlFiles("data/master/vendors").map((v) => [v.data.vendorId, v.data])
);
const products = new Map(
    readYamlFiles("data/master/products").map((p) => [p.data.productId, p.data])
);
const eventTypes = new Map(
    readYamlFiles("data/master/event-types").map((t) => [t.data.typeId, t.data])
);

const contentDirs = ["maintenance", "security", "release", "announcement"];
const allEvents = [];

// Alle Events laden und validieren
for (const dir of contentDirs) {
    for (const { filePath, data } of readYamlFiles("data/content/" + dir)) {
        const result = getSchemaForType(data?.typeId).safeParse(data);
        if (!result.success) {
            console.warn("Uebersprungen (Validation fehlgeschlagen): " + filePath);
            continue;
        }
        allEvents.push({
            ...result.data,
            vendor: vendors.get(result.data.vendorId) ?? null,
            products: result.data.productIds.map((id) => products.get(id)).filter(Boolean),
            eventType: eventTypes.get(result.data.typeId) ?? null,
        });
    }
}

// Sortierung: Maintenance nach eventDate, andere nach publishedAt
allEvents.sort((a, b) => {
    const dateA = a.eventDate ? new Date(a.eventDate).getTime() : new Date(a.publishedAt).getTime();
    const dateB = b.eventDate ? new Date(b.eventDate).getTime() : new Date(b.publishedAt).getTime();
    return dateB - dateA;
});

// Hilfsfunktion zum Schreiben von Index-Dateien
function writeIndex(filename, data) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
    console.log("Erzeugt: " + filename + " (" + data.length + " Eintraege)");
}

// Index nach Jahr (eventDate fallback publishedAt)
const byYear = {};
for (const e of allEvents) {
    const date = e.eventDate ? new Date(e.eventDate) : new Date(e.publishedAt);
    const y = date.getFullYear().toString();
    (byYear[y] = byYear[y] ?? []).push(e);
}
for (const [y, events] of Object.entries(byYear)) {
    writeIndex("data/_generated/index/by-year/" + y + ".json", events);
}

// Index nach Typ
const byType = {};
for (const e of allEvents) {
    (byType[e.typeId] = byType[e.typeId] ?? []).push(e);
}
for (const [t, events] of Object.entries(byType)) {
    writeIndex("data/_generated/index/by-type/" + t + ".json", events);
}

// Index nach Vendor
const byVendor = {};
for (const e of allEvents) {
    (byVendor[e.vendorId] = byVendor[e.vendorId] ?? []).push(e);
}
for (const [v, events] of Object.entries(byVendor)) {
    writeIndex("data/_generated/index/by-vendor/" + v + ".json", events);
}

// Latest-Index: 90 Tage zurück, Maintenance nach eventDate, andere nach publishedAt
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 90);
const latest = allEvents.filter(e => {
    const date = e.eventDate ? new Date(e.eventDate) : new Date(e.publishedAt);
    return date >= cutoff;
});
writeIndex("data/_generated/index/latest.json", latest);

// Kopieren nach docs/public für Fetch im Browser
const publicBase = "docs/public/data/_generated/index";
fs.mkdirSync(publicBase, { recursive: true });

for (const subdir of ["by-year", "by-type", "by-vendor"]) {
    const src = "data/_generated/index/" + subdir;
    const dst = publicBase + "/" + subdir;
    fs.mkdirSync(dst, { recursive: true });
    if (fs.existsSync(src)) {
        for (const f of fs.readdirSync(src)) {
            fs.copyFileSync(src + "/" + f, dst + "/" + f);
        }
    }
}

fs.copyFileSync(
    "data/_generated/index/latest.json",
    publicBase + "/latest.json"
);

console.log("\nIndex-Build abgeschlossen. " + allEvents.length + " Events insgesamt.\n");