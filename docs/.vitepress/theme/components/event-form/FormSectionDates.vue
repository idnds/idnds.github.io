<template>
  <section class="ecf-section">
    <h2 class="ecf-section-title">{{ sectionNumber }}. Datum und Zeit</h2>

    <!--
      ── Datums-Handling ──────────────────────────────────────────────────────
      datetime-local-Inputs arbeiten ausschließlich mit lokalem Format: "YYYY-MM-DDTHH:MM".

      Form-State enthält ebenfalls datetime-local-Format (lokale Zeit).
      Daher ist hier KEINE Konvertierung notwendig:
        :value  → form-Wert direkt binden (bereits datetime-local)
        @input  → Wert direkt emittieren (datetime-local → YAML-Export macht toIso())

      UTC-Konvertierung findet ausschließlich in useEventYaml.js → toIso() statt,
      direkt beim YAML-Export. Damit gibt es exakt eine Konvertierungsstelle.

      Nach YAML-Import (Edit-Modus):
        useYamlIO.normalize() konvertiert UTC → datetime-local (utcToLocal).
        Der form-State enthält danach wieder lokale Werte.
        Diese Komponente muss das nicht wissen.
      ─────────────────────────────────────────────────────────────────────────
    -->

    <!-- publishedAt: im Edit-Modus readonly (Bestandteil von Dateiname + ID) -->
    <div class="ecf-field">
      <label class="ecf-label" for="f-published">Veröffentlicht am *</label>
      <input
        id="f-published"
        :value="form.publishedAt"
        @input="mode !== 'edit' && $emit('update:publishedAt', $event.target.value)"
        type="datetime-local"
        class="ecf-input ecf-input--date"
        :readonly="mode === 'edit'"
      />
      <p v-if="mode === 'edit'" class="ecf-hint">
        Nicht änderbar -- Bestandteil von Dateiname und ID.
      </p>
    </div>

    <!-- eventDate + endDate: nur bei maintenance -->
    <template v-if="form.typeId === 'maintenance'">

      <div class="ecf-field">
        <label class="ecf-label" for="f-event-date">Wartungsbeginn *</label>
        <input
          id="f-event-date"
          :value="form.eventDate"
          @input="$emit('update:eventDate', $event.target.value)"
          type="datetime-local"
          class="ecf-input ecf-input--date"
        />
        <p class="ecf-hint">
          Lokale Uhrzeit. Die YAML speichert als UTC
          (z.B. 20:00 CEST → 18:00Z in der Datei).
        </p>
      </div>

      <div class="ecf-field">
        <label class="ecf-label" for="f-end-date">Wartungsende *</label>
        <input
          id="f-end-date"
          :value="form.endDate"
          @input="$emit('update:endDate', $event.target.value)"
          type="datetime-local"
          class="ecf-input ecf-input--date"
        />
      </div>

      <!-- Datum-Vorschau: lokale Anzeige aus datetime-local-Strings -->
      <div v-if="form.eventDate && form.endDate" class="ecf-date-preview">
        <span class="ecf-label">Vorschau (lokale Zeit)</span>
        <p class="ecf-meta-preview">{{ previewDate }}</p>
      </div>

    </template>

    <!--
      updatedAt im Edit-Modus: informativer Hinweis, kein Eingabefeld.
      updatedAt wird beim YAML-Export automatisch auf new Date().toISOString() gesetzt
      (useEventYaml.js). Der Nutzer kann keinen falschen Zeitstempel eintippen.
    -->
    <div v-if="mode === 'edit'" class="ecf-field ecf-field--info">
      <span class="ecf-label">Zuletzt aktualisiert (updatedAt)</span>
      <p class="ecf-hint">
        Wird beim Export automatisch auf den aktuellen Zeitpunkt gesetzt (UTC).
        <span v-if="form.updatedAt">
          Letzter gespeicherter Wert: <code>{{ form.updatedAt }}</code>
        </span>
      </p>
    </div>

  </section>
</template>

<script setup>
defineProps({
  form:          { type: Object, required: true },
  // previewDate: formatierte Datumsanzeige aus EventForm.vue
  previewDate:   { type: String, default: "" },
  // mode: steuert readonly-Status von publishedAt und updatedAt-Hinweis
  mode:          { type: String, default: "create" }, // "create" | "edit"
  sectionNumber: { type: Number, default: 2 },
});

defineEmits([
  "update:publishedAt",
  "update:eventDate",
  "update:endDate",
]);
</script>