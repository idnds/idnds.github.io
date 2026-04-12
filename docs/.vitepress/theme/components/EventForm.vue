<template>
  <div class="ecf">

    <!-- Fehler -->
    <div v-if="errors.length" class="ecf-errors" role="alert">
      <strong>Bitte korrigiere folgende Felder:</strong>
      <ul><li v-for="err in errors" :key="err">{{ err }}</li></ul>
    </div>

    <div v-if="isDirty && yamlOutput" class="ecf-state-warning" role="status">
      Änderungen vorhanden -- bitte erneut generieren.
    </div>
    <div v-if="isValid && !isDirty" class="ecf-state-success" role="status">
      YAML ist aktuell und kann heruntergeladen werden.
    </div>

    <!-- Create: Template-Auswahl -->
    <TemplateSelector
      v-if="mode === 'create'"
      base-path="/data/_generated/templates/news"
      @apply="onApplyTemplate"
    />

    <!-- Edit: YAML-Import (verschwindet nach erfolgreichem Import) -->
    <YamlImporter
      v-if="mode === 'edit' && !importDone"
      @imported="onImported"
    />

    <!-- Formular-Sections (immer sichtbar im Create-Modus, nach Import im Edit-Modus) -->
    <template v-if="mode === 'create' || importDone">
      <FormSectionTypeProduct
        :form="form" :masters="masters"
        :derived-vendor="meta.derivedVendor.value"
        :shortname="meta.shortname.value"
        :type-label="meta.typeLabel.value"
        :mode="mode" :section-number="sectionOffset + 1"
        @update:typeId="form.typeId = $event"
        @update:productId="form.productId = $event"
        @update:title="form.title = $event"
        @update:shortnameRaw="form.shortnameRaw = $event"
      />

      <FormSectionDates
        :form="form" :preview-date="previewDate"
        :mode="mode" :section-number="sectionOffset + 2"
        @update:publishedAt="form.publishedAt = $event"
        @update:eventDate="form.eventDate = $event"
        @update:endDate="form.endDate = $event"
      />

      <FormSectionContent
        :form="form"
        :summary-preview="summaryPreview"
        :details-preview="detailsPreview"
        :section-number="sectionOffset + 3"
        @update:summaryMd="form.summaryMd = $event"
        @update:detailsMd="form.detailsMd = $event"
      />

      <FormSectionImpact
        :form="form"
        :has-action-required="meta.hasActionRequired.value"
        :customer-action-preview="customerActionPreview"
        :section-number="sectionOffset + 4"
        @update:impact="form.impact = $event"
        @update:customerActionMd="form.customerActionMd = $event"
      />

      <FormSectionRelease
        v-if="form.typeId === 'release'"
        :form="form" :section-number="sectionOffset + 5"
        @update:version="form.version = $event"
        @update:changelogUrl="form.changelogUrl = $event"
      />

      <FormSectionSecurity
        v-if="form.typeId === 'security'"
        :form="form" :section-number="sectionOffset + 5"
        @update:severity="form.severity = $event"
        @update:cveIdsRaw="form.cveIdsRaw = $event"
        @update:affectedVersionsRaw="form.affectedVersionsRaw = $event"
        @update:fixedVersion="form.fixedVersion = $event"
      />

      <FormSectionRelations
        :form="form" :section-number="sectionOffset + 6"
        @add-relation="addRelation"
        @remove-relation="removeRelation"
        @update-relation="onUpdateRelation"
      />

      <FormSectionOutput
        :form="form" :yaml-output="yamlOutput"
        :is-valid="isValid" :is-dirty="isDirty"
        :preview-id="meta.previewId.value"
        :preview-filename="meta.previewFilename.value"
        :preview-year="meta.previewYear.value"
        :mode="mode" :section-number="sectionOffset + 7"
        @generate="generate" @download="download"
      />
    </template>

  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import { useEventForm }  from "../composables/useEventForm.js";
import { useYamlIO }     from "../composables/useYamlIO.js";

import FormSectionTypeProduct from "./event-form/FormSectionTypeProduct.vue";
import FormSectionDates       from "./event-form/FormSectionDates.vue";
import FormSectionContent     from "./event-form/FormSectionContent.vue";
import FormSectionImpact      from "./event-form/FormSectionImpact.vue";
import FormSectionRelease     from "./event-form/FormSectionRelease.vue";
import FormSectionSecurity    from "./event-form/FormSectionSecurity.vue";
import FormSectionRelations   from "./event-form/FormSectionRelations.vue";
import FormSectionOutput      from "./event-form/FormSectionOutput.vue";
import TemplateSelector       from "./TemplateSelector.vue";
import YamlImporter           from "./YamlImporter.vue";

const props = defineProps({
  mode: { type: String, default: "create" }, // "create" | "edit"
});

const {
  form, masters, meta, errors,
  yamlOutput, isValid, isDirty,
  summaryPreview, detailsPreview, customerActionPreview, initializePreviews,
  generate, download, addRelation, removeRelation,
} = useEventForm({ mode: props.mode });

const { importYaml } = useYamlIO();

const importDone = ref(false);

// Template anwenden (nur Create-Modus)
function onApplyTemplate(templateData) {
  applyTemplate(form, templateData);
  nextTick(() => {
    initializePreviews();
  });
}

// YAML importieren (nur Edit-Modus)
function onImported(yamlString) {
  const data = importYaml(yamlString);
  Object.assign(form, data);
  importDone.value = true;
}

function onUpdateRelation({ idx, field, value }) {
  form.relations[idx][field] = value;
}

// Section-Nummern: im Edit-Modus ist YamlImporter Schritt 1, daher +1
const sectionOffset = computed(() => props.mode === "edit" ? 1 : 0);

// Datums-Vorschau (identisch zu EventCard)
const previewDate = computed(() => formatDateRange(form.eventDate, form.endDate, form.publishedAt));

function formatDateRange(start, end, publishedAt) {
  if (!start || !end) {
    if (!publishedAt) return "";
    const date = new Date(publishedAt);
    return date.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" }) +
      ", " + date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
  }
  const s = new Date(start), e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return s.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" }) +
      ", " + s.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) +
      "\u2013" + e.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
  }
  return s.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" }) + ", " +
    s.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr \u2013 " +
    e.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" }) + ", " +
    e.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
}

// Template-Anwendungslogik mit klar definierten Merge-Regeln:
// Arrays  → ersetzen (nicht mergen)
// Objekte → shallow merge
// Primitive → überschreiben
// Zeitfelder → immer Default beibehalten
function applyTemplate(form, template) {
  for (const [key, value] of Object.entries(template)) {
    if (key === "_meta") continue;

    // productIds (YAML-Format) → productId (Formular-Format: Singular)
    if (key === "productIds" && Array.isArray(value) && value.length > 0) {
      form.productId = value[0];
      continue;
    }

    if (!(key in form)) continue; // Unbekannte Felder ignorieren

    if (Array.isArray(value))
      form[key] = [...value];
    else if (value !== null && typeof value === "object")
      form[key] = { ...form[key], ...value };
    else
      form[key] = value;
  }
  // publishedAt immer auf jetzt zurücksetzen
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  form.publishedAt =
    now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" +
    pad(now.getDate()) + "T" + pad(now.getHours()) + ":" + pad(now.getMinutes());
  if (form.typeId === "maintenance" && !template.eventDate) {
    form.eventDate = "";
    form.endDate   = "";
  }
}

function autoResizeTextareas() {
  document.querySelectorAll(".ecf-textarea").forEach((el) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 500) + "px";
  });
}
</script>

<style>
/* ── Basis-Layout ────────────────────────────────────────────
   max-width 1100px für Split-Layout mit ausreichend Platz */
.ecf { max-width: 1100px; }

.ecf-errors {
  background: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  color: #991b1b;
}
.ecf-errors ul  { margin: 0.5rem 0 0; padding-left: 1.25rem; }
.ecf-errors li  { margin: 0.2rem 0; }

.ecf-state-warning {
  padding: 0.65rem 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #92400e;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
.ecf-state-success {
  padding: 0.65rem 1rem;
  background: #dcfce7;
  border: 1px solid #22c55e;
  border-radius: 6px;
  color: #166534;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.ecf-section {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  background: var(--vp-c-bg-soft);
}
.ecf-section--output { background: var(--vp-c-bg); }

.ecf-section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.ecf-field { margin-bottom: 1rem; }
.ecf-field:last-child { margin-bottom: 0; }
.ecf-field--info { opacity: 0.8; }

.ecf-derived {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.ecf-readonly-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg-mute);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.ecf-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 0.35rem;
}

.ecf-input {
  display: block;
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  font-family: inherit;
  box-sizing: border-box;
}
.ecf-input:focus {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 1px;
}
.ecf-input[readonly] {
  background: var(--vp-c-bg-mute);
  cursor: not-allowed;
  opacity: 0.75;
}
.ecf-input[disabled] {
  background: var(--vp-c-bg-mute);
  cursor: not-allowed;
  opacity: 0.6;
}
.ecf-input--date { max-width: 280px; }
.ecf-textarea   { resize: vertical; min-height: 120px; }

.ecf-hint {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  margin: 0.3rem 0 0;
  line-height: 1.5;
}
.ecf-hint--format {
  background: var(--vp-c-bg-mute);
  border-left: 3px solid var(--vp-c-divider);
  padding: 0.4rem 0.6rem;
  border-radius: 0 4px 4px 0;
  margin-top: 0.5rem;
}

.ecf-checkboxes { display: flex; flex-direction: column; gap: 0.6rem; }
.ecf-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.9rem;
  cursor: pointer;
  line-height: 1.4;
}
.ecf-checkbox-label input {
  margin-top: 0.15rem;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

/* ── Split-Layout: Eingabe | Vorschau ────────────────────── */
.ecf-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  align-items: start;
}
@media (max-width: 900px) {
  .ecf-split { grid-template-columns: 1fr; }
}
.ecf-split-input  { min-width: 0; }
.ecf-split-preview { min-width: 0; }

.ecf-preview-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
  margin-bottom: 0.35rem;
}

.ecf-rendered {
  padding: 0.65rem 0.75rem;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 0.9rem;
  line-height: 1.6;
  min-height: 2.5rem;
}
.ecf-rendered p            { margin: 0 0 0.5em; }
.ecf-rendered p:last-child { margin-bottom: 0; }
.ecf-rendered ul,
.ecf-rendered ol           { margin: 0.25em 0 0.5em 1.25em; }
.ecf-rendered li           { margin: 0.15em 0; }
.ecf-rendered strong       { font-weight: 700; }
.ecf-rendered em           { font-style: italic; }
.ecf-rendered code {
  background: var(--vp-c-bg-soft);
  padding: 0.1em 0.35em;
  border-radius: 3px;
  font-size: 0.85em;
}
.ecf-rendered h1,
.ecf-rendered h2,
.ecf-rendered h3 { margin: 0.75em 0 0.35em; font-weight: 700; }

/* ── Badge-Vorschau ─────────────────────────────────────── */
.ecf-badge-preview {
  padding: 0.6rem 0.75rem;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  margin-top: 0.75rem;
}
.ecf-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

/* ── Datums-Vorschau ────────────────────────────────────── */
.ecf-date-preview {
  padding: 0.6rem 0.75rem;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  margin-top: 0.5rem;
}
.ecf-meta-preview {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin: 0.25rem 0 0;
}

/* ── Relations ──────────────────────────────────────────── */
.ecf-relation-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.ecf-relation-type { width: 190px; flex-shrink: 0; }
.ecf-relation-id   { flex: 1; min-width: 200px; }

/* ── Buttons ────────────────────────────────────────────── */
.ecf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4em 1em;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  line-height: 1.4;
}
.ecf-btn--primary {
  background: var(--vp-c-brand);
  color: white;
  font-size: 1rem;
  padding: 0.55em 1.75em;
}
.ecf-btn--primary:hover { opacity: 0.85; }
.ecf-btn--add {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
  margin-top: 0.25rem;
}
.ecf-btn--add:hover { background: var(--vp-c-bg-soft); }
.ecf-btn--remove {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
  font-size: 0.8rem;
  padding: 0.3em 0.7em;
}
.ecf-btn--remove:hover { background: #fecaca; }
.ecf-btn--download {
  background: #22c55e;
  color: white;
  border-color: #22c55e;
}
.ecf-btn--download:hover:not(:disabled) { opacity: 0.85; }
.ecf-btn--download:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.7;
}

/* ── YAML-Ausgabe ───────────────────────────────────────── */
.ecf-preview-meta {
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}
.ecf-preview-meta p { margin: 0.25rem 0; }

.ecf-output { margin-top: 1.5rem; }
.ecf-output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.ecf-output-header h3 { margin: 0; font-size: 1rem; }

.ecf-yaml-output {
  width: 100%;
  font-family: monospace;
  font-size: 0.8rem;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem;
  box-sizing: border-box;
  resize: vertical;
  color: var(--vp-c-text-1);
}

.ecf-next-steps {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border-left: 4px solid var(--vp-c-brand);
}
.ecf-next-steps h4 { margin: 0 0 0.5rem; font-size: 0.9rem; }
.ecf-next-steps ol { margin: 0; padding-left: 1.25rem; font-size: 0.875rem; }
.ecf-next-steps li { margin: 0.3rem 0; }
</style>