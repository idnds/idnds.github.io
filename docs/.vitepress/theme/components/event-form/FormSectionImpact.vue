<template>
  <section class="ecf-section">
    <h2 class="ecf-section-title">{{ sectionNumber }}. Auswirkungen</h2>

    <div class="ecf-field">
      <span class="ecf-label">Impact (optional, Mehrfachauswahl)</span>
      <div class="ecf-checkboxes">
        <label class="ecf-checkbox-label">
          <input type="checkbox" :checked="form.impact.includes('downtime')"
            @change="toggleImpact('downtime', $event.target.checked)" />
          <span><strong>Downtime</strong> &mdash; geplante oder tatsächliche Nichtverfügbarkeit</span>
        </label>
        <label class="ecf-checkbox-label">
          <input type="checkbox" :checked="form.impact.includes('limited-availability')"
            @change="toggleImpact('limited-availability', $event.target.checked)" />
          <span><strong>Limited Availability</strong> &mdash; eingeschränkte Nutzung</span>
        </label>
        <label class="ecf-checkbox-label">
          <input type="checkbox" :checked="form.impact.includes('action-required')"
            @change="toggleImpact('action-required', $event.target.checked)" />
          <span><strong>Action Required</strong> &mdash; Handlungsbedarf auf Kundenseite</span>
        </label>
      </div>
    </div>

    <div v-if="hasActionRequired" class="ecf-field">
      <label class="ecf-label" for="f-customer-action">Handlungshinweise * (Markdown)</label>
      <div class="ecf-split">
        <div class="ecf-split-input">
          <textarea v-autoresize id="f-customer-action" :value="form.customerActionMd"
            @input="$emit('update:customerActionMd', $event.target.value)"
            class="ecf-input ecf-textarea" rows="6"
            placeholder="Konkrete Schritte für Kunden..." />
        </div>
        <div v-if="form.customerActionMd" class="ecf-split-preview"
          aria-live="polite" aria-label="Vorschau Handlungshinweise">
          <span class="ecf-preview-label">Vorschau</span>
          <div class="ecf-rendered" v-html="customerActionPreview" />
        </div>
      </div>
      <p class="ecf-hint">Pflichtfeld wenn "Action Required" aktiv.</p>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  form:                   { type: Object, required: true },
  hasActionRequired:      { type: Boolean, default: false },
  customerActionPreview:  { type: String, default: "" },
  sectionNumber:          { type: Number, default: 4 },
});
const emit = defineEmits(["update:impact", "update:customerActionMd"]);

function toggleImpact(value, checked) {
  const current = [...props.form.impact];
  if (checked && !current.includes(value)) current.push(value);
  if (!checked) current.splice(current.indexOf(value), 1);
  emit("update:impact", current);
}
</script>