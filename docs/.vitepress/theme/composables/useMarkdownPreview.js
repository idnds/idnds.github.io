import { ref, computed, watch } from "vue";
import { marked } from "marked";

marked.use({ breaks: true, gfm: true });

export function useMarkdownPreview(form) {
    const debounceTimer = ref(null);
    const debouncedSummary = ref(form.summaryMd);
    const debouncedDetails = ref(form.detailsMd);
    const debouncedCustomerAction = ref(form.customerActionMd);

    function debounce(target, value) {
        clearTimeout(debounceTimer.value);
        debounceTimer.value = setTimeout(() => { target.value = value; }, 200);
    }

    watch(() => form.summaryMd, (v) => debounce(debouncedSummary, v));
    watch(() => form.detailsMd, (v) => debounce(debouncedDetails, v));
    watch(() => form.customerActionMd, (v) => debounce(debouncedCustomerAction, v));

    const summaryPreview = computed(() =>
        debouncedSummary.value ? marked.parseInline(debouncedSummary.value) : ""
    );
    const detailsPreview = computed(() =>
        debouncedDetails.value ? marked.parse(debouncedDetails.value) : ""
    );
    const customerActionPreview = computed(() =>
        debouncedCustomerAction.value ? marked.parse(debouncedCustomerAction.value) : ""
    );

    return { summaryPreview, detailsPreview, customerActionPreview };
}