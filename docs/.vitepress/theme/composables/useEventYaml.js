// useEventYaml.js
//
// Verantwortung: Form-State → YAML-String.
// Einziger Ort wo datetime-local → UTC konvertiert wird (via toIso aus dateUtils).
//
// Datumsformat-Strategie:
//   Form-State: datetime-local ("YYYY-MM-DDTHH:MM", lokale Zeit)
//   YAML-Output: UTC ISO 8601 ("...Z")
//   Konvertierungsstelle: toIso() -- genau einmal pro Datumswert hier.

import yaml from "js-yaml";
import { toIso } from "./dateUtils.js";

// ── Literal-Block-Schema ──────────────────────────────────────────────────────
// Markdown-Felder werden als YAML-Literal-Block ausgegeben (|).
// extend() statt new yaml.Schema() -- erbt alle internen Handler vollständig.
// new yaml.Schema() würde interne Handler verlieren → einfache Anführungszeichen
// um Datums-Strings.
const STR_LITERAL = new yaml.Type("tag:yaml.org,2002:str", {
    kind: "scalar",
    predicate: (data) => typeof data === "string" && data.endsWith("\n"),
    represent: (data) => data,
    defaultStyle: "literal",
});
const LITERAL_SCHEMA = yaml.DEFAULT_SCHEMA.extend([STR_LITERAL]);

/**
 * Bereitet einen Markdown-String für YAML-Literal-Block vor.
 * Trimmt + abschließendes \n. Gibt undefined zurück wenn leer.
 * @param {string|null|undefined} str
 * @returns {string|undefined}
 */
function lit(str) {
    const trimmed = (str ?? "").trim();
    return trimmed ? trimmed + "\n" : undefined;
}

/**
 * @param {object} form - reaktiver Form-State (datetime-local-Werte)
 * @param {object} meta - berechnete Felder (previewId, derivedVendor, ...)
 * @param {string} mode - "create" | "edit"
 */
export function useEventYaml(form, meta, mode = "create") {

    /**
     * Baut den vollständigen YAML-String aus dem Form-State.
     *
     * Alle Datumswerte werden via toIso() (aus dateUtils.js) nach UTC konvertiert.
     * Im Edit-Modus: updatedAt automatisch auf aktuellen Zeitpunkt gesetzt.
     *
     * @returns {string} gültiger YAML-String mit UTC-Datumswerten
     */
    function buildYaml() {
        const id = meta.previewId.value;
        const vendorId = meta.derivedVendor.value?.vendorId ?? form.productId;

        const obj = {
            id,
            slug: id,
            typeId: form.typeId,
            vendorId,
            productIds: [form.productId],
            title: form.title.trim(),
            // datetime-local → UTC ISO: toIso() aus dateUtils.js
            publishedAt: toIso(form.publishedAt),
            summaryMd: lit(form.summaryMd),
        };

        // updatedAt: im Edit-Modus automatisch auf Export-Zeitpunkt setzen (immer UTC).
        // Kein manuelles Eingabefeld -- verhindert falsche Zeitstempel durch Nutzereingabe.
        if (mode === "edit") {
            obj.updatedAt = new Date().toISOString(); // "...Z"
        }

        const detailsLit = lit(form.detailsMd);
        if (detailsLit) obj.detailsMd = detailsLit;

        // impact immer ausgeben (auch leer) -- signalisiert: bewusst leer, nicht vergessen
        obj.impact = form.impact.length ? [...form.impact] : [];

        const actionLit = meta.hasActionRequired.value ? lit(form.customerActionMd) : undefined;
        if (actionLit) obj.customerActionMd = actionLit;

        const cleanRelations = form.relations.filter((r) => r.eventId.trim());
        obj.relations = cleanRelations.map((r) => ({
            type: r.type,
            eventId: r.eventId.trim(),
        }));

        if (form.typeId === "maintenance") {
            obj.status = form.status ?? "active";
            obj.eventDate = toIso(form.eventDate); // datetime-local → UTC
            obj.endDate = toIso(form.endDate);   // datetime-local → UTC
        }

        if (form.typeId === "release") {
            obj.version = form.version.trim();
            if (form.changelogUrl.trim()) obj.changelogUrl = form.changelogUrl.trim();
        }

        if (form.typeId === "security") {
            const cveIds = form.cveIdsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
            const affected = form.affectedVersionsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
            if (cveIds.length) obj.cveIds = cveIds;
            if (form.severity) obj.severity = form.severity;
            if (affected.length) obj.affectedVersions = affected;
            if (form.fixedVersion.trim()) obj.fixedVersion = form.fixedVersion.trim();
        }

        return yaml.dump(obj, {
            schema: LITERAL_SCHEMA,
            lineWidth: 120,
            noRefs: true,
            quotingType: '"',
            forceQuotes: false,
        });
    }

    return { buildYaml };
}
