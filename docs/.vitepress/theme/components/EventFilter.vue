<template>
  <div class="event-filter">
    <div class="filters" role="group" aria-label="Event-Filter">

      <select
        id="type-filter"
        v-model="selectedType"
        aria-label="Nach Eventtyp filtern"
        @change="onTypeChange"
      >
        <option value="">Alle Typen</option>
        <option v-for="t in availableTypes" :key="t.value" :value="t.value">
          {{ t.label }}
        </option>
      </select>

      <select
        id="vendor-filter"
        v-model="selectedVendor"
        aria-label="Nach Hersteller filtern"
      >
        <option value="">Alle Hersteller</option>
        <option v-for="v in availableVendors" :key="v.value" :value="v.value">
          {{ v.label }}
        </option>
      </select>

      <select
        v-if="showStatusFilter"
        id="status-filter"
        v-model="selectedStatus"
        aria-label="Nach Wartungsstatus filtern"
      >
        <option value="">Alle Wartungsstatus</option>
        <option v-for="s in availableStatuses" :key="s" :value="s">
          {{ statusLabel[s] }}
        </option>
      </select>

      <select
        id="impact-filter"
        v-model="selectedImpact"
        aria-label="Nach Auswirkung filtern"
      >
        <option value="">Alle Auswirkungen</option>
        <option value="downtime">Downtime</option>
        <option value="limited-availability">Eingeschränkte Verfügbarkeit</option>
        <option value="action-required">Handlungsbedarf</option>
      </select>

    </div>

    <p class="result-count" aria-live="polite">
      {{ filteredEvents.length }} Events gefunden
    </p>

    <div>
      <EventCard
        v-for="event in filteredEvents"
        :key="event.id"
        :event="event"
      />
      <p v-if="filteredEvents.length === 0">
        Keine Events für diese Filterauswahl.
      </p>
    </div>

    <EventDetailModal :event="activeEvent" @close="closeDetail" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import EventDetailModal from "./EventDetailModal.vue";
import { deriveStatus, statusLabel } from "../composables/useEventStatus.js";

const props = defineProps({
  indexFile: { type: String, default: "/data/_generated/index/latest.json" },
});

const events         = ref([]);
const selectedType   = ref("");
const selectedVendor = ref("");
const selectedStatus = ref("");
const selectedImpact = ref("");
const activeEvent    = ref(null);

onMounted(async () => {
  const res = await fetch(props.indexFile);
  events.value = await res.json();
  document.addEventListener("modal-close", closeDetail);
});

onUnmounted(() => {
  document.removeEventListener("modal-close", closeDetail);
});

function openDetail(event) { activeEvent.value = event; }
function closeDetail()     { activeEvent.value = null;  }

const showStatusFilter = computed(() =>
  selectedType.value === "" || selectedType.value === "maintenance"
);

function onTypeChange() {
  if (selectedType.value !== "" && selectedType.value !== "maintenance") {
    selectedStatus.value = "";
  }
}

const availableTypes = computed(() => {
  const map = new Map();
  events.value.forEach((e) => {
    if (!map.has(e.typeId)) map.set(e.typeId, e.eventType?.name ?? e.typeId);
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
});

const availableVendors = computed(() => {
  const map = new Map();
  events.value.forEach((e) => {
    if (!map.has(e.vendorId)) map.set(e.vendorId, e.vendor?.name ?? e.vendorId);
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
});

const availableStatuses = ["planned", "ongoing", "completed", "cancelled"];

const filteredEvents = computed(() =>
  events.value.filter((e) => {
    if (selectedType.value   && e.typeId   !== selectedType.value)   return false;
    if (selectedVendor.value && e.vendorId !== selectedVendor.value) return false;
    if (selectedImpact.value && !e.impact?.includes(selectedImpact.value)) return false;
    if (selectedStatus.value && e.typeId === "maintenance") {
      if (deriveStatus(e) !== selectedStatus.value) return false;
    }
    return true;
  })
);
</script>

<style scoped>
.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.result-count {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.75rem;
}
</style>