<template>
  <span v-if="status" :class="'status-badge status-' + statusClass[status]">
    {{ statusLabel[status] }}
  </span>
</template>

<script setup>
import { computed } from "vue";
import { deriveStatus, statusLabel, statusClass } from "../composables/useEventStatus.js";

const props = defineProps({ event: { type: Object, required: true } });

const status = computed(() => deriveStatus(props.event));
</script>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 0.2em 0.6em;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}
.status-planned   { background: #6b7280; }
.status-ongoing   { background: #f59e0b; }
.status-completed { background: #22c55e; }
.status-cancelled { background: #ef4444; }
</style>