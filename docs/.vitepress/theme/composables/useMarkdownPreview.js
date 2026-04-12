// useMarkdownPreview.js -- komplett vereinfacht
import { computed } from "vue";
import { marked } from "marked";

marked.use({ breaks: true, gfm: true });

export function useMarkdownPreview(form) {
    // Direkte computed properties statt debounced refs.
    // Vue's computed-Caching stellt sicher dass nur bei tatsächlicher Änderung
    // neu berechnet wird -- kein Debouncing, kein nextTick, kein initializePreviews.
    // marked.parseInline/parse sind für typische Event-Texte unter 1ms schnell.
    const summaryPreview = computed(() =>
        form.summaryMd ? marked.parseInline(form.summaryMd) : ""
    );
    const detailsPreview = computed(() =>
        form.detailsMd ? marked.parse(form.detailsMd) : ""
    );
    const customerActionPreview = computed(() =>
        form.customerActionMd ? marked.parse(form.customerActionMd) : ""
    );

    return { summaryPreview, detailsPreview, customerActionPreview };
}