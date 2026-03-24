import fs from "node:fs";
import { z } from "zod";
import { VendorSchema, ProductSchema, EventTypeSchema } from "./schemas/master.mjs";
import {
  MaintenanceEventSchema,
  SecurityEventSchema,
  ReleaseEventSchema,
  AnnouncementEventSchema,
} from "./schemas/content.mjs";

// ─────────────────────────────────────────────────────────────
// Hilfsfunktionen fuer die Nachbearbeitung der Schemas
// ─────────────────────────────────────────────────────────────

// Entfernt Felder aus "required" die in Zod als optional().default() definiert sind.
// zod-to-json-schema uebersetzt Defaults nicht immer korrekt und
// landet diese Felder faelschlicherweise in required.
function removeFromRequired(schema, ...fields) {
  if (Array.isArray(schema.required)) {
    schema.required = schema.required.filter((f) => !fields.includes(f));
  }
  return schema;
}

// Ergaenzt ein pattern fuer URL-Felder, weil die Red Hat YAML-Extension
// das "format": "uri" Keyword nicht auswertet -- pattern wird jedoch geprueft.
function addUrlPattern(schema, fieldName) {
  if (schema.properties?.[fieldName]) {
    schema.properties[fieldName].pattern = "^https?://.+";
  }
  return schema;
}

// ─────────────────────────────────────────────────────────────
// Schema schreiben mit optionaler Nachbearbeitung
// ─────────────────────────────────────────────────────────────

function writeSchema(schema, filename, postProcess) {
  // z.toJSONSchema() ist in Zod v4 eingebaut -- kein externes Paket noetig
  const jsonSchema = z.toJSONSchema(schema);

  if (!jsonSchema.properties) {
    console.error("Fehler: Schema fuer " + filename + " hat keine properties.");
    process.exit(1);
  }

  const processed = postProcess ? postProcess(jsonSchema) : jsonSchema;

  fs.writeFileSync("schemas/" + filename, JSON.stringify(processed, null, 2), "utf8");
  console.log("Erzeugt: schemas/" + filename);
}

// ─────────────────────────────────────────────────────────────
// Schemas erzeugen
// ─────────────────────────────────────────────────────────────

if (!fs.existsSync("schemas")) {
  fs.mkdirSync("schemas", { recursive: true });
}

// Stammdaten -- keine optionalen Default-Felder, kein Nachbearbeitungsbedarf
writeSchema(VendorSchema, "vendor.schema.json");
writeSchema(ProductSchema, "product.schema.json");
writeSchema(EventTypeSchema, "event-type.schema.json");

// Content -- detailsMd und relatedEventIds sind ueberall optional().default()
// und muessen aus required entfernt werden
writeSchema(
  MaintenanceEventSchema,
  "maintenance.schema.json",
  (s) => removeFromRequired(s, "detailsMd", "relatedEventIds")
);

writeSchema(
  SecurityEventSchema,
  "security.schema.json",
  (s) => removeFromRequired(s, "detailsMd", "relatedEventIds")
);

writeSchema(
  AnnouncementEventSchema,
  "announcement.schema.json",
  (s) => removeFromRequired(s, "detailsMd", "relatedEventIds")
);

// Release: zusaetzlich URL-Pattern fuer changelogUrl ergaenzen,
// weil "format": "uri" von der YAML-Extension ignoriert wird
writeSchema(
  ReleaseEventSchema,
  "release.schema.json",
  (s) => {
    removeFromRequired(s, "detailsMd", "relatedEventIds");
    addUrlPattern(s, "changelogUrl");
    return s;
  }
);

console.log("\nAlle JSON Schemas erzeugt.");