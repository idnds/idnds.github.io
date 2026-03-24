#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import rl from "node:readline";
import yaml from "js-yaml";

// ─────────────────────────────────────────────────────────────
// Readline-Helfer
// ─────────────────────────────────────────────────────────────

function prompt(question) {
    const iface = rl.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve =>
        iface.question(question, ans => { iface.close(); resolve(ans.trim()); })
    );
}

// ─────────────────────────────────────────────────────────────
// Masterdaten laden
// ─────────────────────────────────────────────────────────────

function readYamlDir(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith(".yaml") || f.endsWith(".yml"))
        .flatMap(f => {
            try {
                const data = yaml.load(fs.readFileSync(path.join(dir, f), "utf8"));
                return data ? [data] : [];
            } catch { return []; }
        });
}

const vendors = readYamlDir("data/master/vendors");
const products = readYamlDir("data/master/products");

const vendorsMap = new Map(vendors.map(v => [v.vendorId, v]));
const productsMap = new Map(products.map(p => [p.productId, p]));

// ─────────────────────────────────────────────────────────────
// Fuzzy-Suche auf ID und Name
// ─────────────────────────────────────────────────────────────

function fuzzy(items, query, idKey, nameKey) {
    const q = query.toLowerCase();
    return items.filter(item =>
        String(item[idKey] ?? "").toLowerCase().includes(q) ||
        String(item[nameKey] ?? "").toLowerCase().includes(q)
    );
}

// ─────────────────────────────────────────────────────────────
// Interaktive Auswahl
// ─────────────────────────────────────────────────────────────

async function selectOrInput(label, items, idKey, nameKey) {
    console.log("\n" + label);
    if (items.length === 0) {
        console.log("  (Keine Eintraege in den Stammdaten gefunden)");
        return await prompt("  Wert manuell eingeben: ");
    }
    console.log("  Teileingabe des Namens oder der ID genuegt.\n");

    while (true) {
        const query = await prompt("  Suche: ");
        if (!query) continue;

        const hits = fuzzy(items, query, idKey, nameKey);

        if (hits.length === 0) {
            console.log("  Kein Treffer.");
            const action = await prompt("  (s) Erneut suchen   (n) Wert manuell eingeben: ");
            if (action.toLowerCase() === "n") return await prompt("  Wert: ");
            continue;
        }

        console.log("\n  Treffer:");
        hits.forEach((h, i) =>
            console.log("    " + (i + 1) + ".  " + h[idKey] + "  (" + (h[nameKey] ?? "") + ")")
        );

        const sel = await prompt("\n  Nummer auswaehlen oder Wert direkt eingeben: ");
        const num = parseInt(sel, 10);
        if (!isNaN(num) && num >= 1 && num <= hits.length) return hits[num - 1][idKey];
        if (sel.trim()) return sel.trim();
    }
}

// ─────────────────────────────────────────────────────────────
// Typ-Mappings
//
// Ordner:  Verzeichnis unter data/content/
// typeId:  Wert im YAML-Feld typeId, muss in event-types/ existieren
// ─────────────────────────────────────────────────────────────

const FOLDER = {
    maintenance: "maintenance",
    security: "security",
    release: "release",
    announcement: "announcement",
};

const TYPE_ID = {
    maintenance: "maintenance",
    security: "security",
    release: "release",
    announcement: "announcement",
};

const VALID_TYPES = Object.keys(FOLDER);

// ─────────────────────────────────────────────────────────────
// CLI-Argumente
// ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name) {
    const idx = args.indexOf("--" + name);
    return idx !== -1 ? args[idx + 1] : null;
}

// ─────────────────────────────────────────────────────────────
// Hauptlogik
// ─────────────────────────────────────────────────────────────

async function main() {
    console.log("");
    console.log("============================================");
    console.log("  scaffold-event  --  Neues Event anlegen  ");
    console.log("============================================");
    console.log("");
    console.log("Erstellt eine YAML-Vorlage in data/content/.");
    console.log("TODO-Felder danach manuell ausfuellen.");
    console.log("Abschliessend: npm run validate:content");
    console.log("");

    // ── 1. Typ ───────────────────────────────────────────────
    let type = getArg("type");
    if (!type || !VALID_TYPES.includes(type)) {
        console.log("Erlaubte Typen: " + VALID_TYPES.join("  |  "));
        do {
            type = await prompt("Typ des Events: ");
            if (!VALID_TYPES.includes(type)) {
                console.log("Ungueltig. Erlaubt: " + VALID_TYPES.join(", "));
            }
        } while (!VALID_TYPES.includes(type));
    }

    // ── 2. Produkt ───────────────────────────────────────────
    const productId = await selectOrInput(
        "Produkt auswaehlen:",
        products, "productId", "name"
    );

    if (!productsMap.has(productId)) {
        console.warn(
            "\n  Warnung: Produkt \"" + productId + "\" existiert nicht in den Stammdaten.\n" +
            "  Bitte unter data/master/products/ anlegen,\n" +
            "  sonst schlaegt npm run validate:content fehl.\n"
        );
    }

    // ── 3. Vendor ────────────────────────────────────────────
    let vendorId;
    const knownProduct = productsMap.get(productId);

    if (knownProduct?.vendorId) {
        vendorId = knownProduct.vendorId;
        const vendorName = vendorsMap.get(vendorId)?.name ?? vendorId;
        console.log(
            "\n  Hersteller automatisch abgeleitet: " +
            vendorId + "  (" + vendorName + ")"
        );
    } else {
        vendorId = await selectOrInput(
            "Hersteller auswaehlen (nicht aus Produkt ableitbar):",
            vendors, "vendorId", "name"
        );
        if (!vendorsMap.has(vendorId)) {
            console.warn(
                "\n  Warnung: Hersteller \"" + vendorId + "\" existiert nicht in den Stammdaten.\n" +
                "  Bitte unter data/master/vendors/ anlegen.\n"
            );
        }
    }

    // ── 4. Kurzname ──────────────────────────────────────────
    console.log(
        "\n  Kurzname fuer den Dateinamen.\n" +
        "  Erlaubt: Kleinbuchstaben, Zahlen, Bindestriche.\n" +
        "  Beispiel: operator-update   patch-march   cve-fix\n"
    );
    let shortname = getArg("name") || await prompt("  Kurzname: ");
    shortname = shortname
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    if (!shortname) {
        console.error("Fehler: Kurzname darf nicht leer sein.");
        process.exit(1);
    }

    // ── 5. Datum und Pfade ───────────────────────────────────
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const year = dateStr.split("-")[0];
    const isoNow = today.toISOString().replace(/\.\d{3}Z$/, "+01:00");

    const dir = path.join("data", "content", FOLDER[type], year);
    const basename = dateStr + "-" + productId + "-" + shortname;
    const filePath = path.join(dir, basename + ".yaml");
    const id = type + "-" + dateStr + "-" + productId + "-" + shortname;
    const slug = id;

    fs.mkdirSync(dir, { recursive: true });

    // ── 6. YAML-Inhalt ───────────────────────────────────────
    const lines = [];
    const add = (line) => lines.push(line);
    const gap = () => lines.push("");
    const todo = (field, hint) => add(field + ": \"TODO: " + hint + "\"");

    // Basis-Felder
    add("id: " + id);
    add("slug: " + slug);
    add("typeId: " + TYPE_ID[type]);
    add("vendorId: " + vendorId);
    add("productIds:");
    add("  - " + productId);
    gap();
    todo("title", "Titel eintragen");
    add("publishedAt: \"" + isoNow + "\"");
    gap();

    // eventDate, endDate und status nur fuer maintenance
    if (type === "maintenance") {
        add("eventDate: \"" + dateStr + "T20:00:00+01:00\"");
        add("endDate:   \"" + dateStr + "T22:00:00+01:00\"");
        add("status: active");
        gap();
    }
    // Kein else -- alle anderen Typen erhalten weder status noch Datumsfenster

    gap();
    add("summaryMd: |");
    add("  TODO: Kurze Zusammenfassung (1-3 Saetze).");
    add("detailsMd: |");
    add("  TODO: Ausfuehrliche Beschreibung.");
    add("relatedEventIds: []");

    // Typ-spezifische Felder
    if (type === "maintenance") {
        gap();
        add("downtimeMinutes: 30");
    } else if (type === "security") {
        gap();
        add("cveIds:");
        add("  - \"TODO: CVE-YYYY-NNNNN\"");
        add("severity: high");
        add("affectedVersions: []");
        add("fixedVersion: \"\"");
    } else if (type === "release") {
        gap();
        todo("version", "1.0.0");
        add("# changelogUrl: \"https://...\"  # optional, wenn leer Zeile loeschen");
    }

    fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");

    // ── 7. Ausgabe ───────────────────────────────────────────
    console.log("");
    console.log("  Datei erstellt: " + filePath);
    console.log("");
    console.log("  Naechste Schritte:");
    console.log("  1. Datei oeffnen und TODO-Felder ausfuellen");
    console.log("  2. npm run validate:content ausfuehren");
    console.log("");
}

main().catch(err => {
    console.error("Fehler: " + err.message);
    process.exit(1);
});