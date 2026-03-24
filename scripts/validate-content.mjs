import path from "node:path";
import { readYamlFiles, validateWithZod } from "./utils.mjs";
import { getSchemaForType } from "./schemas/content.mjs";

let hasErrors = false;

const vendorIds = new Set(
    readYamlFiles("data/master/vendors").map((v) => v.data.vendorId)
);
const productIds = new Set(
    readYamlFiles("data/master/products").map((p) => p.data.productId)
);
const typeIds = new Set(
    readYamlFiles("data/master/event-types").map((t) => t.data.typeId)
);

const contentTypes = ["maintenance", "security", "release", "announcement"];
const allEventIds = new Set();
const allSlugs = new Set();
const allEvents = [];

for (const contentType of contentTypes) {
    const files = readYamlFiles("data/content/" + contentType);
    for (const entry of files) {
        allEvents.push({ ...entry, contentType });
    }
}

console.log("\nPruefe " + allEvents.length + " Events...\n");

for (const { filePath, data } of allEvents) {
    const filename = path.basename(filePath);

    // Dateiname muss mit YYYY-MM-DD- beginnen.
    if (!/^\d{4}-\d{2}-\d{2}-/.test(filename)) {
        console.error("Dateiname muss mit YYYY-MM-DD- beginnen: " + filePath);
        hasErrors = true;
        continue;
    }

    // Jahresordner muss zum Datum im Dateinamen passen.
    const yearInFilename = filename.substring(0, 4);
    const yearInPath = path.basename(path.dirname(filePath));

    if (yearInFilename !== yearInPath) {
        console.error(
            "Jahresordner (" + yearInPath + ") stimmt nicht mit Dateidatum (" +
            yearInFilename + ") ueberein: " + filePath
        );
        hasErrors = true;
        continue;
    }

    const schema = getSchemaForType(data?.typeId);
    const valid = validateWithZod(schema, data, filePath);
    if (!valid) { hasErrors = true; continue; }

    if (allEventIds.has(data.id)) {
        console.error('Doppelte Event-ID "' + data.id + '" in ' + filePath);
        hasErrors = true;
    } else {
        allEventIds.add(data.id);
    }

    if (allSlugs.has(data.slug)) {
        console.error('Doppelter Slug "' + data.slug + '" in ' + filePath);
        hasErrors = true;
    } else {
        allSlugs.add(data.slug);
    }

    if (!vendorIds.has(data.vendorId)) {
        console.error('Unbekannte vendorId "' + data.vendorId + '" in ' + filePath);
        hasErrors = true;
    }
    if (!typeIds.has(data.typeId)) {
        console.error('Unbekannte typeId "' + data.typeId + '" in ' + filePath);
        hasErrors = true;
    }
    for (const pid of data.productIds ?? []) {
        if (!productIds.has(pid)) {
            console.error('Unbekannte productId "' + pid + '" in ' + filePath);
            hasErrors = true;
        }
    }

    const start = new Date(data.eventDate);
    const end = new Date(data.endDate);
    if (start >= end) {
        console.error("eventDate muss vor endDate liegen in " + filePath);
        hasErrors = true;
    }

    if (!hasErrors) {
        console.log("  OK: " + data.id);
    }
}

// Zweiter Durchlauf: Event-Verknuepfungen pruefen.
// Muss nach dem ersten Durchlauf stattfinden, weil sich Events gegenseitig referenzieren.
console.log("\nPruefe Event-Verknuepfungen...");
for (const { filePath, data } of allEvents) {
    for (const relatedId of data?.relatedEventIds ?? []) {
        if (!allEventIds.has(relatedId)) {
            console.error(
                'relatedEventId "' + relatedId + '" nicht gefunden, referenziert in ' + filePath
            );
            hasErrors = true;
        }
    }
}

if (hasErrors) {
    console.error("\nContent-Validierung fehlgeschlagen. Build abgebrochen.\n");
    process.exit(1);
} else {
    console.log(
        "\nContent-Validierung erfolgreich." +
        "\n  " + allEvents.length + " Events geprueft, alle Referenzen gueltig.\n"
    );
}