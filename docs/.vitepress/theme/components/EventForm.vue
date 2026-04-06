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
import { ref, computed } from "vue";
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
  summaryPreview, detailsPreview, customerActionPreview,
  generate, download, addRelation, removeRelation,
} = useEventForm({ mode: props.mode });

const { importYaml } = useYamlIO();

const importDone = ref(false);

// Template anwenden (nur Create-Modus)
function onApplyTemplate(templateData) {
  applyTemplate(form, templateData);
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
  // eventDate/endDate nur zurücksetzen wenn Template nichts setzt
  if (form.typeId === "maintenance" && !template.eventDate) {
    form.eventDate = "";
    form.endDate   = "";
  }
}
</script>

<style>
/* Styles bleiben in der globalen ecf-CSS-Definition -- keine Änderung */
</style>