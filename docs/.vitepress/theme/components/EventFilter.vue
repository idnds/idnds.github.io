<template>
  <div class="event-filter">

    <div class="filters" role="group" aria-label="Event-Filter">

      <!-- Typ-Filter: Single-Select aus options.json -->
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

      <!-- Impact-Filter: Single-Select, statische Optionen -->
      <select
        id="impact-filter"
        v-model="selectedImpact"
        aria-label="Nach Auswirkung filtern"
        @change="onImpactChange"
      >
        <option value="">Alle Auswirkungen</option>
        <option value="downtime">Downtime</option>
        <option value="limited-availability">Eingeschränkte Verfügbarkeit</option>
        <option value="action-required">Handlungsbedarf</option>
      </select>

    </div>

    <!-- Ladezustand -->
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

    <!-- Ergebnisliste -->
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

    <!-- Mehr laden -->
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

// ── Konstanten ────────────────────────────────────────────────────────────────
const INITIAL_LIMIT = 25;
const BATCH_SIZE    = 25;

// ── State ─────────────────────────────────────────────────────────────────────
const events         = ref([]);
const initialLoading = ref(true);   // Initiales Laden: latest.json + options.json parallel
const loading        = ref(false);  // Nachfolgendes Lazy Loading bei Typ-Filterwechsel
const visibleCount   = ref(INITIAL_LIMIT);

// Filter: nur Typ und Impact
const selectedType   = ref("");
const selectedImpact = ref("");

// Filteroptionen aus options.json.
// Typ-Optionen kommen aus options.json damit alle Typen im Dropdown erscheinen --
// auch wenn gerade kein Event dieses Typs in latest.json vorhanden ist.
// Impact-Optionen sind statisch (drei feste Werte im Datenmodell).
const filterOptions = ref({ types: [] });

// ── Index-Cache ───────────────────────────────────────────────────────────────
// Verhindert doppelte Requests für denselben Index innerhalb einer Session.
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

// ── URL-Parameter ─────────────────────────────────────────────────────────────
// Beide Filter sind über URL direkt ansteuerbar:
//   ?type=maintenance
//   ?impact=downtime
//   ?type=security&impact=action-required
//
// URL-Parsing nur in onMounted (SSR-kompatibel: kein window-Zugriff auf Server).

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  selectedType.value   = p.get("type")   ?? "";
  selectedImpact.value = p.get("impact") ?? "";
}

function writeUrlParams() {
  const p = new URLSearchParams();
  if (selectedType.value)   p.set("type",   selectedType.value);
  if (selectedImpact.value) p.set("impact", selectedImpact.value);
  const qs = p.toString();
  // replaceState statt pushState: kein Einrag in die Browser-History pro Filterwechsel
  history.replaceState(null, "", qs ? "?" + qs : window.location.pathname);
}

// URL bei Filterwechsel aktualisieren
watch([selectedType, selectedImpact], writeUrlParams);

// ── Initial laden ─────────────────────────────────────────────────────────────
// latest.json und options.json parallel -- initialLoading erst nach Promise.all false.
onMounted(async () => {
  readUrlParams(); // URL-Params vor dem ersten Laden lesen (SSR-sicher)
  try {
    const [eventsData, opts] = await Promise.all([
      fetchIndex("/data/_generated/index/latest.json", "latest"),
      fetchIndex("/data/_generated/options.json", "options"),
    ]);
    if (eventsData) events.value = eventsData;
    if (opts)       filterOptions.value = opts;

    // Falls URL-Param einen Typ vorgibt: passenden Index sofort nachladen
    if (selectedType.value) {
      await loadTypeIndex(selectedType.value);
    }
  } finally {
    initialLoading.value = false;
  }
});

// ── Lazy Loading: Typ-Index ───────────────────────────────────────────────────
// Wenn ein Typ gewählt wird, wird by-type/<type>.json geladen.
// Dieser Index enthält nur Events des gewählten Typs und ist kleiner als latest.json.
// Impact wird immer clientseitig auf dem geladenen Index gefiltert.
async function loadTypeIndex(typeId) {
  loading.value = true;
  try {
    const data = await fetchIndex(
      "/data/_generated/index/by-type/" + typeId + ".json",
      "type:" + typeId
    );
    if (data) events.value = data;
  } finally {
    loading.value      = false;
    visibleCount.value = INITIAL_LIMIT;
  }
}

async function loadLatestIndex() {
  loading.value = true;
  try {
    const data = await fetchIndex("/data/_generated/index/latest.json", "latest");
    if (data) events.value = data;
  } finally {
    loading.value      = false;
    visibleCount.value = INITIAL_LIMIT;
  }
}

// ── Filter-Handler ────────────────────────────────────────────────────────────

async function onTypeChange() {
  if (selectedType.value) {
    await loadTypeIndex(selectedType.value);
  } else {
    await loadLatestIndex();
  }
}

function onImpactChange() {
  // Impact ist clientseitig -- kein Index-Load nötig
  visibleCount.value = INITIAL_LIMIT;
}

// ── Clientseitige Filterung ───────────────────────────────────────────────────
// Typ: wird durch Index-Wahl bereits vorselektiert (redundante Prüfung schadet nicht).
// Impact: immer clientseitig auf dem geladenen Index-Subset.
const filteredEvents = computed(() =>
  events.value.filter((e) => {
    if (selectedType.value   && e.typeId !== selectedType.value)         return false;
    if (selectedImpact.value && !e.impact?.includes(selectedImpact.value)) return false;
    return true;
  })
);

// ── Anzeige-Limit ─────────────────────────────────────────────────────────────
// v-for läuft nur auf visibleEvents -- nie auf dem vollen filteredEvents-Array.
const visibleEvents = computed(() =>
  filteredEvents.value.slice(0, visibleCount.value)
);

const totalCount    = computed(() => filteredEvents.value.length);
const hasMore       = computed(() => visibleCount.value < totalCount.value);
const nextBatchSize = computed(() =>
  Math.min(BATCH_SIZE, totalCount.value - visibleCount.value)
);

function loadMore() {
  visibleCount.value = Math.min(visibleCount.value + BATCH_SIZE, totalCount.value);
}
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