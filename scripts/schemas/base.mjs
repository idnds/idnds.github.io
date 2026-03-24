import { z } from "zod";

// Ein ISO-Datum ist ein String der Form "2026-03-15T20:00:00+01:00".
// z.string() prueft ob es ein String ist.
// .refine() erlaubt eigene Prueflogik: Date.parse gibt NaN zurueck wenn ungueltig.
export const IsoDateTime = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  { message: "Muss ein gueltiges ISO-Datum sein, z.B. 2026-03-15T20:00:00+01:00" }
);

// Slugs duerfen nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.
export const Slug = z
  .string()
  .min(1, "Slug darf nicht leer sein")
  .regex(
    /^[a-z0-9-]+$/,
    "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten"
  );

// z.enum() stellt sicher, dass nur einer dieser Werte erlaubt ist.
export const EventStatus = z.enum(["active", "cancelled"], {
  errorMap: () => ({
    message: 'Status muss "active" oder "cancelled" sein',
  }),
});