import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

/**
 * Liest alle YAML-Dateien aus einem Ordner rekursiv.
 * Gibt ein Array von Objekten zurueck: { filePath, data }
 */
export function readYamlFiles(dir) {
    const results = [];

    if (!fs.existsSync(dir)) {
        console.warn("Ordner nicht gefunden: " + dir);
        return results;
    }

    // { withFileTypes: true } gibt Objekte zurueck, die sagen ob es Datei oder Ordner ist.
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            results.push(...readYamlFiles(fullPath));
        } else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) {
            try {
                const raw = fs.readFileSync(fullPath, "utf8");
                // yaml.load wandelt YAML-Text in ein JavaScript-Objekt um.
                const data = yaml.load(raw);
                results.push({ filePath: fullPath, data });
            } catch (err) {
                console.error("YAML-Syntaxfehler in " + fullPath + ": " + err.message);
                process.exit(1);
            }
        }
    }

    return results;
}

/**
 * Validiert ein Objekt gegen ein Zod-Schema.
 * safeParse gibt { success, data/error } zurueck statt einen Fehler zu werfen.
 * Das erlaubt es, alle Fehler zu sammeln statt beim ersten abzubrechen.
 */
export function validateWithZod(schema, data, filePath) {
    const result = schema.safeParse(data);

    if (!result.success) {
        console.error("\nValidierungsfehler in: " + filePath);
        for (const issue of result.error.errors) {
            const field = issue.path.join(".") || "(root)";
            console.error('  Feld "' + field + '": ' + issue.message);
        }
        return false;
    }

    return true;
}