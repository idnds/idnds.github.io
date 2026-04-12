<template>
  <section class="ecf-section">
    <h2 class="ecf-section-title">{{ sectionNumber }}. Verknüpfte Events (optional)</h2>
    <div v-for="(rel, idx) in form.relations" :key="idx" class="ecf-relation-row">
      <select :value="rel.type"
        @change="updateRelation(idx, 'type', $event.target.value)"
        class="ecf-input ecf-relation-type">
        <option value="relates-to">Verwandtes Event</option>
        <option value="resolves">Behebt</option>
        <option value="follow-up-to">Nachfolger von</option>
        <option value="supersedes">Ersetzt</option>
      </select>
      <input :value="rel.eventId"
        @input="updateRelation(idx, 'eventId', $event.target.value)"
        type="text" class="ecf-input ecf-relation-id"
        placeholder="Event-ID z.B. maintenance-2026-03-15-lpc-prod-update" />
      <button class="ecf-btn ecf-btn--remove" type="button"
        :aria-label="'Verknüpfung ' + (idx + 1) + ' entfernen'"
        @click="$emit('remove-relation', idx)">Entfernen</button>
    </div>
    <button class="ecf-btn ecf-btn--add" type="button" @click="$emit('add-relation')">
      + Verknüpfung hinzufügen
    </button>
  </section>
</template>
<script setup>
const props = defineProps({ form: { type: Object, required: true }, sectionNumber: { type: Number, default: 6 } });
const emit = defineEmits(["add-relation", "remove-relation", "update-relation"]);
function updateRelation(idx, field, value) {
  emit("update-relation", { idx, field, value });
}
</script>