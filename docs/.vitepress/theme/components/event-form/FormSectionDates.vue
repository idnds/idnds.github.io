<template>
  <section class="ecf-section">
    <h2 class="ecf-section-title">{{ sectionNumber }}. Datum und Zeit</h2>

    <div class="ecf-field">
      <label class="ecf-label" for="f-published">Veröffentlicht am *</label>
      <input id="f-published" :value="form.publishedAt"
        @input="$emit('update:publishedAt', $event.target.value)"
        type="datetime-local" class="ecf-input ecf-input--date" />
    </div>

    <template v-if="form.typeId === 'maintenance'">
      <div class="ecf-field">
        <label class="ecf-label" for="f-event-date">Wartungsbeginn *</label>
        <input id="f-event-date" :value="form.eventDate"
          @input="$emit('update:eventDate', $event.target.value)"
          type="datetime-local" class="ecf-input ecf-input--date" />
      </div>
      <div class="ecf-field">
        <label class="ecf-label" for="f-end-date">Wartungsende *</label>
        <input id="f-end-date" :value="form.endDate"
          @input="$emit('update:endDate', $event.target.value)"
          type="datetime-local" class="ecf-input ecf-input--date" />
      </div>
      <div v-if="form.eventDate && form.endDate" class="ecf-date-preview">
        <span class="ecf-label">Datum-Vorschau</span>
        <p class="ecf-meta-preview">{{ previewDate }}</p>
      </div>
    </template>

    <!-- updatedAt: im Edit-Modus readonly anzeigen (wird beim Export automatisch gesetzt) -->
    <div v-if="mode === 'edit'" class="ecf-field ecf-field--info">
      <span class="ecf-label">Zuletzt aktualisiert</span>
      <p class="ecf-hint">
        Wird beim Export automatisch auf den aktuellen Zeitpunkt gesetzt.
        <span v-if="form.updatedAt">Letzter Wert: <code>{{ form.updatedAt }}</code></span>
      </p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  form:          { type: Object, required: true },
  previewDate:   { type: String, default: "" },
  mode:          { type: String, default: "create" },
  sectionNumber: { type: Number, default: 2 },
});
defineEmits(["update:publishedAt", "update:eventDate", "update:endDate"]);
</script>