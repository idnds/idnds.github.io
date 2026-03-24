import { VendorSchema } from "./schemas/master.mjs";

const valid = {
  vendorId: "elo",
  name: "ELO Digital Office GmbH",
  website: "https://elo.com",
  deprecatedAt: null,
};

// Gueltiges Objekt -- parse() gibt das Objekt zurueck wenn alles stimmt
const result = VendorSchema.parse(valid);
console.log("OK:", result.vendorId);

// Ungueltiges Objekt -- parse() wirft einen ZodError
try {
  VendorSchema.parse({ vendorId: "Cisco MIT LEERZEICHEN" });
} catch (err) {
  // err.issues ist das zuverlaessige Array in allen Zod-Versionen
  // err.errors existiert in manchen Versionen als Alias, aber nicht immer
  const message = err.issues?.[0]?.message ?? err.message;
  console.log("Ungueltig korrekt abgelehnt:", message);
}