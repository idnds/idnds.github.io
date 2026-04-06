<template>
  <section class="ecf-section ecf-section--output">
    <h2 class="ecf-section-title">{{ sectionNumber }}. YAML generieren</h2>

    <div v-if="previewId && form.productId && form.publishedAt" class="ecf-preview-meta">
      <p><strong>Dateiname:</strong> <code>{{ previewFilename }}</code></p>
      <p><strong>ID / Slug:</strong> <code>{{ previewId }}</code></p>
      <p><strong>Zielordner:</strong>
        <code>data/content/{{ form.typeId }}/{{ previewYear }}/</code></p>
    </div>

    <button class="ecf-btn ecf-btn--primary" type="button" @click="$emit('generate')">
      {{ mode === "edit" ? "Aktualisierung generieren" : "YAML generieren" }}
    </button>

    <div v-if="yamlOutput" class="ecf-output">
      <div class="ecf-output-header">
        <h3>Generierte YAML</h3>
        <button class="ecf-btn ecf-btn--download" type="button"
          :disabled="!isValid || isDirty"
          :title="isDirty ? 'Bitte erneut generieren nach Änderungen' : ''"
          @click="$emit('download')">
          Herunterladen: {{ previewFilename }}
        </button>
      </div>
      <textarea class="ecf-yaml-output" readonly :value="yamlOutput"
        rows="20" aria-label="Generierte YAML" />
      <div class="ecf-next-steps">
        <h4>Nächste Schritte</h4>
        <ol v-if="mode === 'create'">
          <li>YAML-Datei herunterladen.</li>
          <li>Datei im Repository unter
            <code>data/content/{{ form.typeId }}/{{ previewYear }}/</code> ablegen.</li>
          <li>Pull Request eröffnen.</li>
          <li>Maintainer prüft Referenzen und merged den PR.</li>
        </ol>
        <ol v-else>
          <li>YAML-Datei herunterladen.</li>
          <li>Bestehende Datei im Repository ersetzen.</li>
          <li>Pull Request eröffnen.</li>
        </ol>
      </div>
    </div>
  </section>
</template>
<script setup>
defineProps({
  form:           { type: Object, required: true },
  yamlOutput:     { type: String, default: "" },
  isValid:        { type: Boolean, default: false },
  isDirty:        { type: Boolean, default: false },
  previewId:      { type: String, default: "" },
  previewFilename:{ type: String, default: "" },
  previewYear:    { type: String, default: "" },
  mode:           { type: String, default: "create" },
  sectionNumber:  { type: Number, default: 7 },
});
defineEmits(["generate", "download"]);
</script>