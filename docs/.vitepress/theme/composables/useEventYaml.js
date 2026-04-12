// docs/.vitepress/theme/composables/useEventYaml.js

import yaml from "js-yaml";

// Literal-Block-Schema: Strings mit abschließendem \n werden als | ausgegeben.
// predicate prüft auf nativen String -- kein !!str-Tag in der Ausgabe.
const STR_LITERAL = new yaml.Type("tag:yaml.org,2002:str", {
    kind: "scalar",
    predicate: (data) => typeof data === "string" && data.endsWith("\n"),
    represent: (data) => data,
    defaultStyle: "literal",
});
const LITERAL_SCHEMA = yaml.DEFAULT_SCHEMA.extend([STR_LITERAL]);

function lit(str) {
    const trimmed = (str ?? "").trim();
    return trimmed ? trimmed + "\n" : undefined;
}

function toIso(localDatetime) {
    if (!localDatetime) return null;
    const d = new Date(localDatetime);
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const pad = (n) => String(Math.abs(n)).padStart(2, "0");
    const hh = pad(Math.floor(Math.abs(offset) / 60));
    const mm = pad(Math.abs(offset) % 60);
    return (
        d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" +
        pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":00" + sign + hh + ":" + mm
    );
}

export function useEventYaml(form, meta, mode = "create") {
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
            publishedAt: toIso(form.publishedAt),
            summaryMd: lit(form.summaryMd),
        };

        // Im Edit-Modus: updatedAt automatisch auf jetzt setzen (Go-Beschluss #1)
        if (mode === "edit") {
            obj.updatedAt = toIso(new Date().toISOString().slice(0, 16));
        }

        const detailsLit = lit(form.detailsMd);
        if (detailsLit) obj.detailsMd = detailsLit;

        obj.impact = form.impact.length ? [...form.impact] : [];

        const actionLit = meta.hasActionRequired.value ? lit(form.customerActionMd) : undefined;
        if (actionLit) obj.customerActionMd = actionLit;

        const cleanRelations = form.relations.filter((r) => r.eventId.trim());
        obj.relations = cleanRelations.map((r) => ({ type: r.type, eventId: r.eventId.trim() }));

        if (form.typeId === "maintenance") {
            obj.status = form.status ?? "active";
            obj.eventDate = toIso(form.eventDate);
            obj.endDate = toIso(form.endDate);
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
            quotingType: '"',       // doppelte statt einfache Anführungszeichen
            forceQuotes: false,     // nur wo nötig, nicht pauschal
        });
    }

    return { buildYaml, toIso };
}