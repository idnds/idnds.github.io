import fs from "node:fs";
import path from "node:path";
import { readYamlFiles } from "./utils.mjs";
import { getSchemaForType } from "./schemas/content.mjs";

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

for (const dir of contentDirs) {
    for (const { filePath, data } of readYamlFiles("data/content/" + dir)) {
        const result = getSchemaForType(data?.typeId).safeParse(data);
        if (!result.success) { console.warn("Uebersprungen: " + filePath); continue; }

        const d = result.data;

        // relatedEventIds -> relations transformieren falls noch nicht migriert
        let relations = d.relations ?? [];
        if (d.relatedEventIds?.length) {
            const existingIds = new Set(relations.map((r) => r.eventId));
            for (const eventId of d.relatedEventIds) {
                if (!existingIds.has(eventId)) {
                    relations.push({ type: "relates-to", eventId });
                }
            }
        }

        // isCustomerActionRequired als berechnetes Feld ableiten
        const isCustomerActionRequired = d.impact?.includes("action-required") ?? false;

        allEvents.push({
            ...d,
            relations,
            isCustomerActionRequired,
            vendor: vendors.get(d.vendorId) ?? null,
            products: d.productIds.map((id) => products.get(id)).filter(Boolean),
            eventType: eventTypes.get(d.typeId) ?? null,
        });
    }
}

function getSortTimestamp(event) {
    if (event.typeId === "maintenance") {
        return new Date(event.eventDate ?? event.publishedAt ?? 0).getTime();
    }

    return new Date(event.publishedAt ?? event.eventDate ?? 0).getTime();
}

allEvents.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));

function writeIndex(filename, data) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
    console.log("Erzeugt: " + filename + " (" + data.length + " Eintraege)");
}

// Indizes nach _generated
const byYear = {};
for (const e of allEvents) {
    const y = new Date(e.publishedAt).getFullYear().toString();
    (byYear[y] = byYear[y] ?? []).push(e);
}
for (const [y, events] of Object.entries(byYear)) {
    writeIndex("data/_generated/index/by-year/" + y + ".json", events);
}

const byType = {};
for (const e of allEvents) { (byType[e.typeId] = byType[e.typeId] ?? []).push(e); }
for (const [t, events] of Object.entries(byType)) {
    writeIndex("data/_generated/index/by-type/" + t + ".json", events);
}

const byVendor = {};
for (const e of allEvents) { (byVendor[e.vendorId] = byVendor[e.vendorId] ?? []).push(e); }
for (const [v, events] of Object.entries(byVendor)) {
    writeIndex("data/_generated/index/by-vendor/" + v + ".json", events);
}

const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 90);
const latest = allEvents.filter((e) => new Date(e.publishedAt) >= cutoff);
writeIndex("data/_generated/index/latest.json", latest);

// Gesamtindex fuer Detailseiten-Generierung
writeIndex("data/_generated/index/all.json", allEvents);

// Indizes nach docs/public/ kopieren
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
for (const f of ["latest.json", "all.json"]) {
    fs.copyFileSync("data/_generated/index/" + f, publicBase + "/" + f);
}

console.log("\nIndex-Build abgeschlossen. " + allEvents.length + " Events insgesamt.\n");