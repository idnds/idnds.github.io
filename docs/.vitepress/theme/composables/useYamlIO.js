// useYamlIO.js
//
// Verantwortung: YAML-String → normalisiertes Form-Objekt (Import)
// und YAML-String → Datei-Download (Export-Hilfsfunktion).
//
// Datumsformat-Strategie:
//   YAML enthält UTC ISO ("...Z") oder Altdaten mit Offset ("+01:00").
//   Form-State erwartet datetime-local-Format ("YYYY-MM-DDTHH:MM").
//   Konvertierungsstelle: utcToLocal() aus dateUtils.mjs -- einmalig in normalize().

import yaml from "js-yaml";
import { utcToLocal } from "@shared/dateUtils.mjs";

/**
 * Extrahiert den Kurznamen aus einem Slug.
 * Slug-Format: "<typeId>-YYYY-MM-DD-<productId>-<kurzname>"
 * Segmente 0–4: typeId, Jahr, Monat, Tag, productId → Rest = Kurzname.
 *
 * Hinweis: funktioniert exakt wenn productId kein "-" enthält.
 * Bei mehrgliedrigem productId (z.B. "lpc-cloud-prod") ist das Ergebnis ungenau,
 * aber für den Edit-Flow ausreichend (Slug wird readonly angezeigt).
 *
 * @param {string} slug
 * @returns {string} Kurzname oder ""
 */
function extractShortname(slug) {
    if (!slug) return "";
    const parts = slug.split("-");
    if (parts.length > 5) return parts.slice(5).join("-");
    return "";
}

export function useYamlIO() {

    /**
     * Normalisiert ein rohes geparste YAML-Objekt in ein Form-kompatibles Objekt.
     *
     * Datumsfelder: UTC/Offset ISO → datetime-local via utcToLocal() (dateUtils.mjs).
     * Akzeptiert neue UTC-Strings ("...Z") und alte Offset-Strings ("+01:00").
     * Fehlende Felder erhalten sichere Defaults (leere Strings, leere Arrays).
     * Unbekannte Felder werden ignoriert.
     *
     * @param {object|null} data - geparste YAML-Daten
     * @returns {object} form-kompatibles Objekt mit datetime-local-Datumswerten
     */
    function normalize(data) {
        if (!data || typeof data !== "object") return normalize({});

        return {
            // Identifikation (im Edit-Modus readonly)
            id: data.id ?? "",
            slug: data.slug ?? "",

            // Basis
            typeId: data.typeId ?? "announcement",
            vendorId: data.vendorId ?? "",
            productId: (data.productIds ?? [])[0] ?? "",
            title: data.title ?? "",
            shortnameRaw: extractShortname(data.slug ?? ""),

            // Datumswerte: UTC/Offset → datetime-local (utcToLocal aus dateUtils.mjs).
            // Nach normalize() enthält der form-State datetime-local-Werte --
            // identisch zu manuellem Eintippen durch den Nutzer.
            publishedAt: utcToLocal(data.publishedAt),
            updatedAt: utcToLocal(data.updatedAt),  // nur für Info-Anzeige, kein Input
            eventDate: utcToLocal(data.eventDate),
            endDate: utcToLocal(data.endDate),

            // Maintenance
            status: data.status ?? "active",

            // Markdown
            summaryMd: data.summaryMd ?? "",
            detailsMd: data.detailsMd ?? "",
            impact: data.impact ?? [],
            customerActionMd: data.customerActionMd ?? "",

            // Relations
            relations: (data.relations ?? []).map((r) => ({
                type: r.type ?? "relates-to",
                eventId: r.eventId ?? "",
            })),

            // Release
            version: data.version ?? "",
            changelogUrl: data.changelogUrl ?? "",

            // Security
            severity: data.severity ?? "",
            cveIdsRaw: (data.cveIds ?? []).join("\n"),
            affectedVersionsRaw: (data.affectedVersions ?? []).join("\n"),
            fixedVersion: data.fixedVersion ?? "",
        };
    }

    /**
     * Parst einen YAML-String und gibt ein normalisiertes Form-Objekt zurück.
     * Unbekannte YAML-Felder werden von normalize() ignoriert.
     *
     * @param {string} yamlString
     * @returns {object} normalisiertes Form-Objekt
     * @throws {Error} bei YAML-Syntaxfehler
     */
    function importYaml(yamlString) {
        const raw = yaml.load(yamlString);
        return normalize(raw);
    }

    /**
     * Löst einen Browser-Download für einen YAML-String aus.
     *
     * @param {string} content  - YAML-String
     * @param {string} filename - z.B. "2026-04-16-lpc-prod-update.yaml"
     */
    function downloadYaml(content, filename) {
        const blob = new Blob([content], { type: "text/yaml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    return { importYaml, normalize, downloadYaml };
}
