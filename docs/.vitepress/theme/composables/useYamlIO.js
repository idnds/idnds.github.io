import yaml from "js-yaml";

export function useYamlIO() {
    // normalize(): fehlende Felder erhalten sichere Defaults.
    // Wird nach yaml.load() aufgerufen bevor das Ergebnis ins Formular geht.
    // Schützt das Formular vor undefined-Werten aus beliebigen YAML-Dateien.
    function normalize(data) {
        if (!data || typeof data !== "object") return normalize({});
        return {
            id: data.id ?? "",
            slug: data.slug ?? "",
            typeId: data.typeId ?? "announcement",
            vendorId: data.vendorId ?? "",
            productId: (data.productIds ?? [])[0] ?? "", // Formular nutzt einzelne productId
            title: data.title ?? "",
            shortnameRaw: extractShortname(data.slug ?? "", data.typeId ?? ""),
            publishedAt: isoToLocal(data.publishedAt) ?? "",
            updatedAt: isoToLocal(data.updatedAt) ?? "",
            summaryMd: data.summaryMd ?? "",
            detailsMd: data.detailsMd ?? "",
            impact: data.impact ?? [],
            customerActionMd: data.customerActionMd ?? "",
            relations: (data.relations ?? []).map((r) => ({
                type: r.type ?? "relates-to",
                eventId: r.eventId ?? "",
            })),
            status: data.status ?? "active",
            eventDate: isoToLocal(data.eventDate) ?? "",
            endDate: isoToLocal(data.endDate) ?? "",
            version: data.version ?? "",
            changelogUrl: data.changelogUrl ?? "",
            severity: data.severity ?? "",
            cveIdsRaw: (data.cveIds ?? []).join("\n"),
            affectedVersionsRaw: (data.affectedVersions ?? []).join("\n"),
            fixedVersion: data.fixedVersion ?? "",
        };
    }

    // Extrahiert den Kurznamen aus dem Slug (letzter Abschnitt nach typeId+Datum+ProductId)
    function extractShortname(slug, typeId) {
        if (!slug) return "";
        // slug = typeId-YYYY-MM-DD-productId-kurzname
        // Entfernt die ersten 3 Segmente (typeId, Datum, productId)
        const parts = slug.split("-");
        if (parts.length > 5) return parts.slice(5).join("-");
        return "";
    }

    // Konvertiert ISO-8601-String in datetime-local-Format (YYYY-MM-DDTHH:MM)
    function isoToLocal(isoString) {
        if (!isoString) return "";
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return "";
            const pad = (n) => String(n).padStart(2, "0");
            return (
                d.getFullYear() + "-" +
                pad(d.getMonth() + 1) + "-" +
                pad(d.getDate()) + "T" +
                pad(d.getHours()) + ":" +
                pad(d.getMinutes())
            );
        } catch { return ""; }
    }

    function importYaml(yamlString) {
        const raw = yaml.load(yamlString);
        return normalize(raw);
    }

    function downloadYaml(content, filename) {
        const blob = new Blob([content], { type: "text/yaml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    return { importYaml, normalize, downloadYaml };
}