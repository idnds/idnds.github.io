import { ref, watch, onMounted, reactive } from "vue";
import { useEventFormState } from "./useEventFormState.js";
import { useEventMeta } from "./useEventMeta.js";
import { useEventValidation } from "./useEventValidation.js";
import { useEventYaml } from "./useEventYaml.js";
import { useMarkdownPreview } from "./useMarkdownPreview.js";
import { useYamlIO } from "./useYamlIO.js";

export function useEventForm(options = {}) {
    const { mode = "create" } = options;

    // Masterdaten (Produkte, Hersteller für Dropdowns)
    const masters = reactive({ vendors: [], products: [] });
    onMounted(async () => {
        try {
            const res = await fetch("/data/_generated/masters.json");
            const data = await res.json();
            masters.vendors = data.vendors ?? [];
            masters.products = data.products ?? [];
        } catch (e) {
            console.warn("Masterdaten konnten nicht geladen werden:", e.message);
        }
    });

    const { form, formatForDatetimeLocal } = useEventFormState(mode);
    const meta = useEventMeta(form, masters);
    const { validate } = useEventValidation(form, mode);
    const { buildYaml, toIso } = useEventYaml(form, meta, mode);
    const previews = useMarkdownPreview(form);
    const { downloadYaml } = useYamlIO();

    // Globaler Zustand: Gültigkeit und Änderungen nach letztem Export
    const errors = ref([]);
    const yamlOutput = ref("");
    const isValid = ref(false);
    const isDirty = ref(false);

    watch(form, () => {
        if (yamlOutput.value) { isDirty.value = true; isValid.value = false; }
    }, { deep: true });

    function generate() {
        errors.value = validate(meta);
        if (errors.value.length) {
            yamlOutput.value = "";
            isValid.value = false;
            if (typeof window !== "undefined")
                window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        yamlOutput.value = buildYaml();
        isValid.value = true;
        isDirty.value = false;
    }

    function download() {
        if (!yamlOutput.value || !isValid.value || isDirty.value) return;
        downloadYaml(yamlOutput.value, meta.previewFilename.value);
    }

    // Relations-Hilfsfunktionen
    function addRelation() { form.relations.push({ type: "relates-to", eventId: "" }); }
    function removeRelation(index) { form.relations.splice(index, 1); }

    return {
        form, masters, meta, errors,
        yamlOutput, isValid, isDirty,
        ...previews,
        generate, download,
        addRelation, removeRelation,
        formatForDatetimeLocal,
    };
}