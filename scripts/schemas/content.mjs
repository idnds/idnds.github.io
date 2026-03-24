import { z } from "zod";
import { IsoDateTime, Slug, EventStatus } from "./base.mjs";

// ─────────────────────────────────────────────────────────────
// Wiederverwendbare Typen fuer die neuen Felder
// ─────────────────────────────────────────────────────────────

// Erlaubte Auswirkungswerte.
// downtime          = geplante oder tatsaechliche Nichtverfuegbarkeit
// limited-availability = eingeschraenkte Nutzung, keine vollstaendige Nichtverfuegbarkeit
// action-required   = Handlungsbedarf auf Kundenseite
export const ImpactValue = z.enum([
  "downtime",
  "limited-availability",
  "action-required",
]);

// Typisierte Verknuepfungen zwischen Events.
// relates-to    = allgemeine inhaltliche Verbindung
// resolves      = dieses Event behebt das referenzierte Event
// follow-up-to  = dieses Event folgt auf das referenzierte Event
// supersedes    = dieses Event ersetzt das referenzierte Event
export const RelationSchema = z.object({
  type: z.enum(["relates-to", "resolves", "follow-up-to", "supersedes"]),
  eventId: z.string().min(1, "eventId darf nicht leer sein"),
});

// ─────────────────────────────────────────────────────────────
// Gemeinsames Grundschema fuer alle Event-Typen
// ─────────────────────────────────────────────────────────────

const BaseEventSchema = z
  .object({
    id: z.string().min(1, "ID darf nicht leer sein"),
    slug: Slug,
    typeId: Slug,
    vendorId: Slug,
    productIds: z.array(Slug).min(1, "Mindestens ein Produkt muss angegeben sein"),
    title: z.string().min(3, "Titel muss mindestens 3 Zeichen lang sein"),
    publishedAt: IsoDateTime,
    updatedAt: IsoDateTime.optional(),

    summaryMd: z.string().min(1, "Zusammenfassung darf nicht leer sein"),
    detailsMd: z.string().optional().default(""),
    customerActionMd: z.string().optional(),

    impact: z.array(ImpactValue).optional().default([]),
    relations: z.array(RelationSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {

    // updatedAt darf nicht vor publishedAt liegen und nicht in der Zukunft liegen
    if (data.updatedAt && data.publishedAt) {
      if (new Date(data.updatedAt) < new Date(data.publishedAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["updatedAt"],
          message: "updatedAt darf nicht vor publishedAt liegen",
        });
      }
      if (new Date(data.updatedAt) > Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["updatedAt"],
          message: "updatedAt darf nicht in der Zukunft liegen",
        });
      }
    }

    // customerActionMd erfordert action-required in impact
    if (data.customerActionMd && !data.impact?.includes("action-required")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["impact"],
        message:
          "impact muss 'action-required' enthalten wenn customerActionMd gesetzt ist",
      });
    }

    // impact darf keine doppelten Werte enthalten
    if (data.impact && new Set(data.impact).size !== data.impact.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["impact"],
        message: "impact darf keine doppelten Werte enthalten",
      });
    }

  });

// ─────────────────────────────────────────────────────────────
// Typ-spezifische Schemas
// ─────────────────────────────────────────────────────────────

// Maintenance: einziger Typ mit Zeitfenster und manuellem Status.
// downtimeMinutes wurde entfernt -- Downtime wird ueber impact und
// eventDate/endDate beschrieben.
export const MaintenanceEventSchema = BaseEventSchema.extend({
  status: EventStatus.default("active"),
  eventDate: IsoDateTime,
  endDate: IsoDateTime,
}).superRefine((data, ctx) => {
  if (data.eventDate && data.endDate) {
    if (new Date(data.eventDate) >= new Date(data.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate muss nach eventDate liegen",
      });
    }
  }
});

// Security: typeId ist "security"
export const SecurityEventSchema = BaseEventSchema.extend({
  cveIds: z
    .array(
      z.string().regex(/^CVE-\d{4}-\d+$/, "CVE-ID muss das Format CVE-YYYY-NNNNN haben")
    )
    .optional()
    .default([]),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  affectedVersions: z.array(z.string()).optional().default([]),
  fixedVersion: z.string().optional(),
});

// Release: version und changelogUrl gehoeren nur zum Release-Typ
export const ReleaseEventSchema = BaseEventSchema.extend({
  version: z.string().min(1, "Versionsnummer ist Pflicht"),
  changelogUrl: z
    .string()
    .url("Muss eine gueltige URL sein")
    .optional(),
});

// Announcement: keine zusaetzlichen Felder
export const AnnouncementEventSchema = BaseEventSchema;

// ─────────────────────────────────────────────────────────────
// Schema-Auswahl nach typeId
// ─────────────────────────────────────────────────────────────

export function getSchemaForType(typeId) {
  const map = {
    "maintenance": MaintenanceEventSchema,
    "security": SecurityEventSchema,
    "release": ReleaseEventSchema,
    "announcement": AnnouncementEventSchema,
  };
  return map[typeId] ?? BaseEventSchema;
}