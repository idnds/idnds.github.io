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
        <option v-for="t in filterOptions.types" :key="t.value" :value="t.value">
          {{ t.label }}
        </option>
      </select>

      <select
        id="vendor-filter"
        v-model="selectedVendor"
        aria-label="Nach Hersteller filtern"
        @change="onVendorChange"
      >
        <option value="">Alle Hersteller</option>
        <option v-for="v in filterOptions.vendors" :key="v.value" :value="v.value">
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

    <p v-if="initialLoading" class="filter-status" aria-live="polite">
      Wird geladen...
    </p>
    <p v-else-if="loading" class="filter-status" aria-live="polite">
      Wird gefiltert...
    </p>
    <p v-else class="filter-status" aria-live="polite">
      <template v-if="visibleCount < totalCount">
        {{ visibleCount }} von {{ totalCount }} Events angezeigt
      </template>
      <template v-else>
        {{ totalCount }} {{ totalCount === 1 ? "Event" : "Events" }} gefunden
      </template>
    </p>

    <div>
      <EventCard
        v-for="event in visibleEvents"
        :key="event.id"
        :event="event"
      />
      <p v-if="!initialLoading && !loading && totalCount === 0" class="filter-empty">
        Keine Events für diese Filterauswahl.
      </p>
    </div>

    <div v-if="hasMore" class="load-more">
      <button class="load-more-btn" type="button" @click="loadMore">
        {{ nextBatchSize }} weitere Events laden
        ({{ totalCount - visibleCount }} verbleibend)
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { deriveStatus, statusLabel } from "../composables/useEventStatus.js";

// Kein defineProps -- die Komponente verwaltet ihre Lade-Logik vollständig intern.
// Kein Modal-Code -- Details öffnet /news/<slug> direkt.

const INITIAL_LIMIT = 25;
const BATCH_SIZE    = 25;

const events         = ref([]);
const initialLoading = ref(true);
const loading        = ref(false);
const visibleCount   = ref(INITIAL_LIMIT);
const selectedType   = ref("");
const selectedVendor = ref("");
const selectedStatus = ref("");
const selectedImpact = ref("");
const filterOptions  = ref({ types: [], vendors: [] });

const indexCache = new Map();

async function fetchIndex(url, cacheKey) {
  if (indexCache.has(cacheKey)) return indexCache.get(cacheKey);
  try {
    const res  = await fetch(url);
    const data = await res.json();
    indexCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error("Laden fehlgeschlagen:", url, err);
    return null;
  }
}

// Beide Requests parallel, initialLoading erst nach Promise.all false
onMounted(async () => {
  try {
    const [eventsData, opts] = await Promise.all([
      fetchIndex("/data/_generated/index/latest.json", "latest"),
      fetchIndex("/data/_generated/options.json", "options"),
    ]);
    if (eventsData) events.value = eventsData;
    if (opts)       filterOptions.value = opts;
  } finally {
    initialLoading.value = false;
  }
});

// Basis-Index laden -- Entscheidungslogik:
//   Typ gewählt                → by-type/<type>.json
//   Nur Hersteller gewählt     → by-vendor/<vendor>.json
//   Beides leer                → latest.json
//   Typ + Hersteller           → by-type (kleiner), Hersteller clientseitig gefiltert
async function loadBaseIndex() {
  loading.value = true;
  try {
    if (selectedType.value) {
      const data = await fetchIndex(
        "/data/_generated/index/by-type/" + selectedType.value + ".json",
        "type:" + selectedType.value
      );
      if (data) events.value = data;
    } else if (selectedVendor.value) {
      const data = await fetchIndex(
        "/data/_generated/index/by-vendor/" + selectedVendor.value + ".json",
        "vendor:" + selectedVendor.value
      );
      if (data) events.value = data;
    } else {
      const data = await fetchIndex(
        "/data/_generated/index/latest.json",
        "latest"
      );
      if (data) events.value = data;
    }
  } finally {
    loading.value   = false;
    visibleCount.value = INITIAL_LIMIT;
  }
}

async function onTypeChange() {
  if (selectedType.value !== "" && selectedType.value !== "maintenance") {
    selectedStatus.value = "";
  }
  await loadBaseIndex();
}

async function onVendorChange() {
  if (!selectedType.value) {
    await loadBaseIndex();
  } else {
    visibleCount.value = INITIAL_LIMIT;
  }
}

watch([selectedStatus, selectedImpact], () => {
  visibleCount.value = INITIAL_LIMIT;
});

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

const visibleEvents = computed(() =>
  filteredEvents.value.slice(0, visibleCount.value)
);

const totalCount    = computed(() => filteredEvents.value.length);
const hasMore       = computed(() => visibleCount.value < totalCount.value);
const nextBatchSize = computed(() =>
  Math.min(BATCH_SIZE, totalCount.value - visibleCount.value)
);

function loadMore() {
  visibleCount.value = Math.min(
    visibleCount.value + BATCH_SIZE,
    totalCount.value
  );
}

const showStatusFilter = computed(() =>
  selectedType.value === "" || selectedType.value === "maintenance"
);

const availableStatuses = ["planned", "ongoing", "completed", "cancelled"];
</script>

<style scoped>
.filters {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.filters select {
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
}
.filters select:focus {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 1px;
}
.filter-status {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.75rem;
}
.filter-empty {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  padding: 2rem 0;
  text-align: center;
}
.load-more {
  text-align: center;
  padding: 1.5rem 0 0.5rem;
}
.load-more-btn {
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.5em 1.5em;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  color: var(--vp-c-text-1);
}
.load-more-btn:hover { background: var(--vp-c-bg-soft); }
</style>