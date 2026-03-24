import { readYamlFiles, validateWithZod } from "./utils.mjs";
import { VendorSchema, ProductSchema, EventTypeSchema } from "./schemas/master.mjs";

let hasErrors = false;

console.log("\nPruefe Hersteller...");
const vendors = readYamlFiles("data/master/vendors");
const vendorIds = new Set();

for (const { filePath, data } of vendors) {
    const valid = validateWithZod(VendorSchema, data, filePath);
    if (!valid) { hasErrors = true; continue; }

    if (vendorIds.has(data.vendorId)) {
        console.error('Doppelte vendorId "' + data.vendorId + '" in ' + filePath);
        hasErrors = true;
    } else {
        vendorIds.add(data.vendorId);
        console.log("  OK: " + data.vendorId);
    }
}

console.log("\nPruefe Produkte...");
const products = readYamlFiles("data/master/products");
const productIds = new Set();

for (const { filePath, data } of products) {
    const valid = validateWithZod(ProductSchema, data, filePath);
    if (!valid) { hasErrors = true; continue; }

    if (productIds.has(data.productId)) {
        console.error('Doppelte productId "' + data.productId + '" in ' + filePath);
        hasErrors = true;
    } else {
        productIds.add(data.productId);
    }

    // Referenzielle Integritaet: vendorId muss auf einen existierenden Hersteller zeigen.
    if (!vendorIds.has(data.vendorId)) {
        console.error(
            'Produkt "' + data.productId + '" verweist auf unbekannten Hersteller "' +
            data.vendorId + '"'
        );
        hasErrors = true;
    } else {
        console.log("  OK: " + data.productId + " (Hersteller: " + data.vendorId + ")");
    }
}

console.log("\nPruefe Eventtypen...");
const eventTypes = readYamlFiles("data/master/event-types");
const typeIds = new Set();

for (const { filePath, data } of eventTypes) {
    const valid = validateWithZod(EventTypeSchema, data, filePath);
    if (!valid) { hasErrors = true; continue; }

    if (typeIds.has(data.typeId)) {
        console.error('Doppelte typeId "' + data.typeId + '" in ' + filePath);
        hasErrors = true;
    } else {
        typeIds.add(data.typeId);
        console.log("  OK: " + data.typeId);
    }
}

if (hasErrors) {
    console.error("\nStammdaten-Validierung fehlgeschlagen. Build abgebrochen.\n");
    process.exit(1);
} else {
    console.log(
        "\nStammdaten-Validierung erfolgreich." +
        "\n  " + vendorIds.size + " Hersteller, " +
        productIds.size + " Produkte, " +
        typeIds.size + " Eventtypen\n"
    );
}