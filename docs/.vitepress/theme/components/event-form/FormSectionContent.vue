<template>
  <section class="ecf-section">
    <h2 class="ecf-section-title">{{ sectionNumber }}. Inhalt</h2>

    <div class="ecf-field">
      <label class="ecf-label" for="f-summary">Zusammenfassung * (Markdown)</label>
      <div class="ecf-split">
        <div class="ecf-split-input">
          <textarea id="f-summary" :value="form.summaryMd"
            @input="$emit('update:summaryMd', $event.target.value)"
            class="ecf-input ecf-textarea" rows="4"
            placeholder="Kurze Beschreibung (1-3 Sätze)." />
          <p class="ecf-hint ecf-hint--format">
            Erlaubte Inline-Formatierungen:
            <strong>**fett**</strong>, <em>*kursiv*</em>, <code>`inline-Code`</code>.
            Listen und Überschriften: bitte im Feld Details verwenden.
          </p>
        </div>
        <div v-if="form.summaryMd" class="ecf-split-preview"
          aria-live="polite" aria-label="Vorschau Zusammenfassung">
          <span class="ecf-preview-label">Vorschau</span>
          <div class="ecf-rendered" v-html="summaryPreview" />
        </div>
      </div>
    </div>

    <div class="ecf-field">
      <label class="ecf-label" for="f-details">Details (Markdown, optional)</label>
      <div class="ecf-split">
        <div class="ecf-split-input">
          <textarea id="f-details" :value="form.detailsMd"
            @input="$emit('update:detailsMd', $event.target.value)"
            class="ecf-input ecf-textarea" rows="10"
            placeholder="Ausführliche Beschreibung..." />
        </div>
        <div v-if="form.detailsMd" class="ecf-split-preview"
          aria-live="polite" aria-label="Vorschau Details">
          <span class="ecf-preview-label">Vorschau</span>
          <div class="ecf-rendered" v-html="detailsPreview" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  form:           { type: Object, required: true },
  summaryPreview: { type: String, default: "" },
  detailsPreview: { type: String, default: "" },
  sectionNumber:  { type: Number, default: 3 },
});
defineEmits(["update:summaryMd", "update:detailsMd"]);
</script>