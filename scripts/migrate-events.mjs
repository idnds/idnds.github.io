import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const contentTypes = ["maintenance", "security", "release", "announcement"];
let count = 0;

for (const type of contentTypes) {
    const dir = "data/content/" + type;
    if (!fs.existsSync(dir)) continue;

    for (const yearDir of fs.readdirSync(dir)) {
        const yearPath = path.join(dir, yearDir);
        if (!fs.statSync(yearPath).isDirectory()) continue;

        for (const file of fs.readdirSync(yearPath)) {
            if (!file.endsWith(".yaml")) continue;
            const filePath = path.join(yearPath, file);
            const raw = fs.readFileSync(filePath, "utf8");
            const data = yaml.load(raw);
            let changed = false;

            // relatedEventIds -> relations vom Typ "relates-to"
            if (data.relatedEventIds && Array.isArray(data.relatedEventIds)) {
                const existing = data.relations ?? [];
                const existingIds = new Set(existing.map((r) => r.eventId));

                for (const eventId of data.relatedEventIds) {
                    if (!existingIds.has(eventId)) {
                        existing.push({ type: "relates-to", eventId });
                    }
                }

                data.relations = existing;
                delete data.relatedEventIds;
                changed = true;
                console.log("  Migriert relatedEventIds: " + filePath);
            }

            // downtimeMinutes entfernen, impact: [downtime] sicherstellen
            if (data.downtimeMinutes !== undefined) {
                data.impact = data.impact ?? [];
                if (!data.impact.includes("downtime")) {
                    data.impact.push("downtime");
                }
                delete data.downtimeMinutes;
                changed = true;
                console.log("  Migriert downtimeMinutes: " + filePath);
            }

            // isCustomerActionRequired entfernen, impact: [action-required] sicherstellen
            if (data.isCustomerActionRequired !== undefined) {
                if (data.isCustomerActionRequired === true) {
                    data.impact = data.impact ?? [];
                    if (!data.impact.includes("action-required")) {
                        data.impact.push("action-required");
                    }
                }
                delete data.isCustomerActionRequired;
                changed = true;
                console.log("  Migriert isCustomerActionRequired: " + filePath);
            }

            if (changed) {
                // YAML-Dump: Zeilenbreite gross genug damit Strings nicht umgebrochen werden
                const out = yaml.dump(data, {
                    lineWidth: 120,
                    quotingType: '"',
                    forceQuotes: false,
                    noRefs: true,
                });
                fs.writeFileSync(filePath, out, "utf8");
                count++;
            }
        }
    }
}

console.log("\nMigration abgeschlossen. " + count + " Dateien aktualisiert.");