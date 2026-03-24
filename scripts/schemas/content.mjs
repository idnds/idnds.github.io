import { z } from "zod";
import { IsoDateTime, Slug, EventStatus } from "./base.mjs";

// Gemeinsames Grundschema für alle Events
const BaseEventSchema = z.object({
  id: z.string().min(1, "ID darf nicht leer sein"),
  slug: Slug,
  typeId: Slug,
  vendorId: Slug,
  productIds: z.array(Slug).min(1, "Mindestens ein Produkt muss angegeben sein"),
  title: z.string().min(3, "Titel muss mindestens 3 Zeichen lang sein"),
  publishedAt: IsoDateTime,
  summaryMd: z.string().min(1, "Zusammenfassung darf nicht leer sein"),
  detailsMd: z.string().optional().default(""),
  relatedEventIds: z.array(z.string()).optional().default([]),
});

// Nur Maintenance-Events haben Status, eventDate und endDate
export const MaintenanceEventSchema = BaseEventSchema.extend({
  status: EventStatus.default("active"),
  eventDate: IsoDateTime,
  endDate: IsoDateTime,
  downtimeMinutes: z
    .number()
    .int()
    .nonnegative("Downtime kann nicht negativ sein")
    .optional(),
});

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

export const ReleaseEventSchema = BaseEventSchema.extend({
  version: z.string().min(1, "Versionsnummer ist Pflicht"),
  changelogUrl: z
    .string()
    .url("Muss eine gueltige URL sein")
    .optional(),
});

export const AnnouncementEventSchema = BaseEventSchema;

// Hilfsfunktion: gibt das richtige Schema für einen Typ zurück
export function getSchemaForType(typeId) {
  const map = {
    maintenance: MaintenanceEventSchema,
    security: SecurityEventSchema,
    release: ReleaseEventSchema,
    announcement: AnnouncementEventSchema,
  };
  return map[typeId] ?? BaseEventSchema;
}