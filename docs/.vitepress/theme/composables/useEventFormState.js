import { reactive } from "vue";

// Wandelt ein Date-Objekt in den Wert für einen datetime-local-Input um.
// Wird hier definiert weil sie nur für Defaults benötigt wird.
function formatForDatetimeLocal(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        date.getFullYear() + "-" +
        pad(date.getMonth() + 1) + "-" +
        pad(date.getDate()) + "T" +
        pad(date.getHours()) + ":" +
        pad(date.getMinutes())
    );
}

export function useEventFormState(mode = "create") {
    const form = reactive({
        // Identifikation (im Edit-Modus readonly)
        id: "",
        slug: "",

        // Basis-Pflichtfelder
        typeId: "announcement",
        productId: "",
        title: "",
        shortnameRaw: "",
        publishedAt: formatForDatetimeLocal(new Date()),

        // Optionale Basis-Felder
        updatedAt: "",  // wird im Edit-Modus beim Export automatisch gesetzt

        // Zeitfelder (nur maintenance)
        eventDate: "",
        endDate: "",

        // Markdown-Felder
        summaryMd: "",
        detailsMd: "",
        impact: [],
        customerActionMd: "",

        // Release-Felder
        version: "",
        changelogUrl: "",

        // Security-Felder
        severity: "",
        cveIdsRaw: "",
        affectedVersionsRaw: "",
        fixedVersion: "",

        // Relations
        relations: [],
    });

    return { form, formatForDatetimeLocal };
}