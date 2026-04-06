<template>
  <section class="ecf-section">
    <h2 class="ecf-section-title">{{ sectionNumber }}. Event-Typ und Produkt</h2>

    <div class="ecf-field">
      <label class="ecf-label" for="f-type">Event-Typ *</label>
      <select id="f-type" :value="form.typeId"
        @change="$emit('update:typeId', $event.target.value)"
        class="ecf-input" :disabled="mode === 'edit'">
        <option value="announcement">Ankündigung</option>
        <option value="maintenance">Wartung</option>
        <option value="release">Release</option>
        <option value="security">Security / CVE</option>
      </select>
    </div>

    <div class="ecf-field">
      <label class="ecf-label" for="f-product">Produkt *</label>
      <select id="f-product" :value="form.productId"
        @change="$emit('update:productId', $event.target.value)"
        class="ecf-input" :disabled="mode === 'edit'">
        <option value="">-- Produkt auswählen --</option>
        <option v-for="p in masters.products" :key="p.productId" :value="p.productId">
          {{ p.name }} ({{ p.productId }})
        </option>
      </select>
      <p v-if="masters.products.length === 0" class="ecf-hint">Produkte werden geladen...</p>
    </div>

    <div v-if="derivedVendor" class="ecf-derived">
      <span class="ecf-label">Hersteller (automatisch aus Produkt)</span>
      <code>{{ derivedVendor.name }} ({{ derivedVendor.vendorId }})</code>
    </div>

    <div class="ecf-field">
      <label class="ecf-label" for="f-title">Titel *</label>
      <input id="f-title" :value="form.title"
        @input="$emit('update:title', $event.target.value)"
        type="text" class="ecf-input"
        placeholder="z.B. Geplantes Wartungsfenster für lieblingsplatz.cloud" />
    </div>

    <div class="ecf-field">
      <label class="ecf-label" for="f-shortname">Kurzname *</label>
      <input id="f-shortname" :value="form.shortnameRaw"
        @input="$emit('update:shortnameRaw', $event.target.value)"
        type="text" class="ecf-input"
        placeholder="z.B. operator-update"
        :readonly="mode === 'edit'" />
      <p class="ecf-hint">
        Normalisiert: <code>{{ shortname || "..." }}</code>
        <span v-if="mode === 'edit'"> -- nicht änderbar bei bestehenden Events</span>
      </p>
    </div>

    <!-- Im Edit-Modus: id und slug readonly anzeigen -->
    <div v-if="mode === 'edit' && form.id" class="ecf-readonly-info">
      <span class="ecf-label">ID / Slug (nicht änderbar)</span>
      <code>{{ form.id }}</code>
    </div>

    <!-- Badge-Vorschau -->
    <div v-if="form.productId || form.impact.length" class="ecf-badge-preview">
      <span class="ecf-label">Badge-Vorschau</span>
      <div class="ecf-badge-row">
        <span :class="'vp-badge vp-badge-type-' + form.typeId">{{ typeLabel }}</span>
        <span v-for="imp in form.impact" :key="imp"
          :class="'vp-badge vp-badge-impact-' + imp">
          {{ impactLabel[imp] ?? imp }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  form:          { type: Object, required: true },
  masters:       { type: Object, required: true },
  derivedVendor: { type: Object, default: null },
  shortname:     { type: String, default: "" },
  typeLabel:     { type: String, default: "" },
  mode:          { type: String, default: "create" },
  sectionNumber: { type: Number, default: 1 },
});
defineEmits(["update:typeId", "update:productId", "update:title", "update:shortnameRaw"]);

const impactLabel = {
  "downtime":             "Downtime",
  "limited-availability": "Einschränkungen",
  "action-required":      "Handlungsbedarf",
};
</script>