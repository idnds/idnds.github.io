export function useEventValidation(form, mode = "create") {
    function validate(meta) {
        // meta = { shortname, hasActionRequired } aus useEventMeta
        const errs = [];

        if (!form.typeId)
            errs.push("Event-Typ ist Pflichtfeld.");
        if (!form.productId)
            errs.push("Produkt ist Pflichtfeld.");
        if (!form.title.trim() || form.title.trim().length < 3)
            errs.push("Titel muss mindestens 3 Zeichen lang sein.");
        if (!meta.shortname.value)
            errs.push("Kurzname ist Pflichtfeld (nur Kleinbuchstaben, Zahlen, Bindestriche).");
        if (!form.publishedAt)
            errs.push("Veröffentlichungsdatum ist Pflichtfeld.");
        if (!form.summaryMd.trim())
            errs.push("Zusammenfassung ist Pflichtfeld.");

        if (form.typeId === "maintenance") {
            if (!form.eventDate)
                errs.push("Wartungsbeginn ist Pflichtfeld bei Wartungs-Events.");
            if (!form.endDate)
                errs.push("Wartungsende ist Pflichtfeld bei Wartungs-Events.");
            if (form.eventDate && form.endDate &&
                new Date(form.eventDate) >= new Date(form.endDate))
                errs.push("Wartungsende muss zeitlich nach dem Wartungsbeginn liegen.");
        }

        if (form.typeId === "release" && !form.version.trim())
            errs.push("Version ist Pflichtfeld bei Release-Events.");

        if (meta.hasActionRequired.value && !form.customerActionMd.trim())
            errs.push("Handlungshinweise sind Pflichtfeld wenn 'Action Required' gewählt ist.");

        if (form.changelogUrl && !form.changelogUrl.match(/^https?:\/\/.+/))
            errs.push("Changelog-URL muss mit https:// oder http:// beginnen.");

        const cveIds = form.cveIdsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
        for (const cve of cveIds) {
            if (!/^CVE-\d{4}-\d+$/.test(cve))
                errs.push('CVE-ID "' + cve + '" hat kein gültiges Format. Erwartet: CVE-YYYY-NNNNN');
        }

        // updatedAt wird im Edit-Modus automatisch gesetzt -- keine manuelle Validierung nötig

        return errs;
    }

    return { validate };
}