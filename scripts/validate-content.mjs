import path from "node:path";
import { readYamlFiles, validateWithZod } from "./utils.mjs";
import { getSchemaForType } from "./schemas/content.mjs";

let hasErrors = false;
let hasWarnings = false;

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

    // Dateinamen-Format
    if (!/^\d{4}-\d{2}-\d{2}-/.test(filename)) {
        console.error("Dateiname muss mit YYYY-MM-DD- beginnen: " + filePath);
        hasErrors = true;
        continue;
    }

    // Jahresordner-Konsistenz
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

    // Deprecation-Warnungen fuer entfernte Felder
    if (data?.relatedEventIds !== undefined) {
        console.warn(
            "  Warnung: relatedEventIds ist veraltet in " + filePath + "\n" +
            "  Bitte in 'relations' migrieren (siehe Schritt 4 der Anleitung)."
        );
        hasWarnings = true;
    }
    if (data?.downtimeMinutes !== undefined) {
        console.warn(
            "  Warnung: downtimeMinutes ist veraltet in " + filePath + "\n" +
            "  Bitte entfernen -- Downtime wird ueber impact: [downtime] und eventDate/endDate beschrieben."
        );
        hasWarnings = true;
    }
    if (data?.isCustomerActionRequired !== undefined) {
        console.warn(
            "  Warnung: isCustomerActionRequired ist veraltet in " + filePath + "\n" +
            "  Bitte entfernen -- Handlungsbedarf wird ueber impact: [action-required] signalisiert."
        );
        hasWarnings = true;
    }

    // Zod-Schema-Validierung
    const schema = getSchemaForType(data?.typeId);
    const valid = validateWithZod(schema, data, filePath);
    if (!valid) { hasErrors = true; continue; }

    // ID-Eindeutigkeit
    if (allEventIds.has(data.id)) {
        console.error('Doppelte Event-ID "' + data.id + '" in ' + filePath);
        hasErrors = true;
    } else {
        allEventIds.add(data.id);
    }

    // Slug-Eindeutigkeit
    if (allSlugs.has(data.slug)) {
        console.error('Doppelter Slug "' + data.slug + '" in ' + filePath);
        hasErrors = true;
    } else {
        allSlugs.add(data.slug);
    }

    // Stammdaten-Referenzen
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

    if (!hasErrors) console.log("  OK: " + data.id);
}

// Zweiter Durchlauf: relations pruefen
// Muss nach dem ersten Durchlauf stattfinden, weil Events sich gegenseitig referenzieren
console.log("\nPruefe Relations...");

for (const { filePath, data } of allEvents) {
    for (const rel of data?.relations ?? []) {

        // Selbstreferenz
        if (rel.eventId === data.id) {
            console.error(
                'Selbstreferenz: Event "' + data.id + '" referenziert sich selbst in ' + filePath
            );
            hasErrors = true;
        }

        // Existenz des referenzierten Events
        if (!allEventIds.has(rel.eventId)) {
            console.error(
                'relations.eventId "' + rel.eventId + '" nicht gefunden, referenziert in ' + filePath
            );
            hasErrors = true;
        }
    }

    // Altfeld relatedEventIds: Existenzpruefung weiterhin durchfuehren
    for (const relatedId of data?.relatedEventIds ?? []) {
        if (!allEventIds.has(relatedId)) {
            console.error(
                'relatedEventIds "' + relatedId + '" nicht gefunden in ' + filePath
            );
            hasErrors = true;
        }
    }
}

if (hasErrors) {
    console.error("\nContent-Validierung fehlgeschlagen. Build abgebrochen.\n");
    process.exit(1);
} else {
    if (hasWarnings) {
        console.warn("\nContent-Validierung erfolgreich mit Warnungen.");
        console.warn("Bitte die veralteten Felder migrieren (siehe Warnungen oben).\n");
    } else {
        console.log(
            "\nContent-Validierung erfolgreich." +
            "\n  " + allEvents.length + " Events geprueft.\n"
        );
    }
}