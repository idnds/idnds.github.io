<template>
  <div class="detail-badges">
    <span
      class="vp-badge"
      :style="{ background: parsed.eventType?.color ?? '#6b7280' }"
    >
      {{ parsed.eventType?.name ?? parsed.typeId }}
    </span>

    <span
      v-if="parsed.typeId === 'maintenance' && status"
      :class="'vp-badge vp-badge-status-' + status"
    >
      {{ statusLabel[status] }}
    </span>

    <span
      v-for="imp in parsed.impact"
      :key="imp"
      :class="'vp-badge vp-badge-impact-' + imp"
    >
      {{ impactLabel[imp] ?? imp }}
    </span>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { deriveStatus, statusLabel } from "../composables/useEventStatus.js";

const props = defineProps({
  eventJson: { type: String, required: true },
});

const parsed = computed(() => {
  try { return JSON.parse(props.eventJson); }
  catch { return {}; }
});

const status = computed(() => {
  const e = parsed.value;
  if (e.typeId !== "maintenance") return null;
  return deriveStatus(e);
});

const impactLabel = {
  "downtime":             "Downtime",
  "limited-availability": "Einschränkungen",
  "action-required":      "Handlungsbedarf",
};
</script>

<style>
.detail-badges {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
</style>