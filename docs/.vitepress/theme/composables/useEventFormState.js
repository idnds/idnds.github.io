// useEventFormState.js
//
// Verantwortung: reaktiver Formular-Zustand + Defaults.
// Keine Validierungslogik, keine YAML-Verarbeitung, keine Computed-Felder.
//
// Datumswerte im Form-State: datetime-local-Format ("YYYY-MM-DDTHH:MM", lokal).
// datetime-local-Inputs akzeptieren ausschließlich dieses Format als :value.
// UTC-Konvertierung für den YAML-Export erfolgt in useEventYaml.js → toIso().
// Für Datumskonvertierungen: siehe dateUtils.mjs.

import { reactive } from "vue";
import { formatForDatetimeLocal } from "@shared/dateUtils.mjs";

export function useEventFormState(mode = "create") {
    const form = reactive({
        // ── Identifikation ────────────────────────────────────────────────────────
        // Im Edit-Modus readonly (Bestandteil von Dateiname, ID und Slug).
        id: "",
        slug: "",

        // ── Basis-Pflichtfelder ───────────────────────────────────────────────────
        typeId: "announcement",
        productId: "",  // Formular nutzt Singular; YAML exportiert productIds: [value]
        title: "",
        shortnameRaw: "",

        // publishedAt: lokale Zeit im datetime-local-Format.
        // UTC-Export in useEventYaml.js → toIso(form.publishedAt).
        publishedAt: formatForDatetimeLocal(new Date()),

        // updatedAt: kein Eingabefeld.
        // Im Edit-Modus beim YAML-Export automatisch auf new Date().toISOString() gesetzt.
        updatedAt: "",

        // ── Zeitfelder (nur maintenance) ─────────────────────────────────────────
        // datetime-local-Format -- UTC-Export in useEventYaml.js → toIso().
        eventDate: "",
        endDate: "",

        // ── Maintenance-Status ────────────────────────────────────────────────────
        // Create-Modus: immer "active" (implizit, kein Dropdown).
        // Edit-Modus: als Dropdown für maintenance-Events wählbar.
        status: "active",

        // ── Markdown-Felder ───────────────────────────────────────────────────────
        summaryMd: "",
        detailsMd: "",
        impact: [],  // "downtime" | "limited-availability" | "action-required"
        customerActionMd: "",

        // ── Release-Felder ────────────────────────────────────────────────────────
        version: "",
        changelogUrl: "",

        // ── Security-Felder ───────────────────────────────────────────────────────
        severity: "",
        cveIdsRaw: "",  // Textarea: eine CVE-ID pro Zeile
        affectedVersionsRaw: "",  // Textarea: eine Version pro Zeile
        fixedVersion: "",

        // ── Relations ─────────────────────────────────────────────────────────────
        // [{ type: "relates-to"|"resolves"|"follow-up-to"|"supersedes", eventId: string }]
        relations: [],
    });

    return { form };
}
