import { computed } from "vue";

export function useEventMeta(form, masters) {
    // Normalisierter Kurzname: nur a-z, 0-9, Bindestrich
    const shortname = computed(() =>
        (form.shortnameRaw ?? "")
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
    );

    // Hersteller wird automatisch aus dem gewählten Produkt abgeleitet
    const derivedVendor = computed(() => {
        const product = masters.products.find((p) => p.productId === form.productId);
        if (!product) return null;
        return (
            masters.vendors.find((v) => v.vendorId === product.vendorId) ??
            { vendorId: product.vendorId, name: product.vendorId }
        );
    });

    const hasActionRequired = computed(() =>
        form.impact.includes("action-required")
    );

    const publishedDate = computed(() => form.publishedAt?.substring(0, 10) ?? "");
    const previewYear = computed(() => publishedDate.value.substring(0, 4));

    // ID/Slug: typeId-Präfix + Datum + ProductId + Kurzname
    // Im Edit-Modus wird form.id direkt verwendet (readonly)
    const previewId = computed(() =>
        form.id ||
        (form.typeId + "-" + publishedDate.value + "-" + form.productId + "-" + shortname.value)
    );

    // Dateiname: kein typeId-Präfix (der Ordner macht den Typ eindeutig)
    const previewFilename = computed(() =>
        publishedDate.value + "-" + form.productId + "-" + shortname.value + ".yaml"
    );

    // Typ-Label für Badge-Vorschau
    const typeLabel = computed(() => {
        const labels = {
            announcement: "Ankündigung",
            maintenance: "Wartung",
            release: "Release",
            security: "Security / CVE",
        };
        return labels[form.typeId] ?? form.typeId;
    });

    return {
        shortname, derivedVendor, hasActionRequired,
        publishedDate, previewYear, previewId, previewFilename, typeLabel,
    };
}