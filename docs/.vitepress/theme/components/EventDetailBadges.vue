<template>
  <div class="detail-badges">

    <!-- Event-Typ Badge mit Farbe aus den Stammdaten -->
    <span
      class="detail-badge"
      :style="{ background: parsed.eventType?.color ?? '#6b7280' }"
    >
      {{ parsed.eventType?.name ?? parsed.typeId }}
    </span>

    <!-- Status-Badge nur fuer Maintenance, wird zur Laufzeit berechnet -->
    <span
      v-if="parsed.typeId === 'maintenance' && status"
      class="detail-badge"
      :style="{ background: statusColor[status] ?? '#6b7280' }"
    >
      {{ statusLabel[status] }}
    </span>

    <!-- Impact-Badges fuer alle Event-Typen -->
    <span
      v-for="imp in parsed.impact"
      :key="imp"
      class="detail-badge"
      :style="{ background: impactColor[imp] ?? '#6b7280' }"
    >
      {{ impactLabel[imp] ?? imp }}
    </span>

  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  // Wird als JSON-String uebergeben damit keine Escape-Probleme in Markdown entstehen
  eventJson: { type: String, required: true },
});

// JSON einmalig parsen
const parsed = computed(() => {
  try { return JSON.parse(props.eventJson); }
  catch { return {}; }
});

// Status zur Laufzeit berechnen -- identisch zu useEventStatus.js
const status = computed(() => {
  const e = parsed.value;
  if (e.typeId !== "maintenance") return null;
  if (e.status === "cancelled")   return "cancelled";

  const now   = Date.now();
  const start = new Date(e.eventDate).getTime();
  const end   = new Date(e.endDate).getTime();

  if (isNaN(start) || isNaN(end)) return null;
  if (now < start)  return "planned";
  if (now <= end)   return "ongoing";
  return "completed";
});

const statusLabel = {
  planned:   "Geplant",
  ongoing:   "Aktiv",
  completed: "Abgeschlossen",
  cancelled: "Abgesagt",
};

const statusColor = {
  planned:   "#6b7280",
  ongoing:   "#f59e0b",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

const impactLabel = {
  "downtime":             "Downtime",
  "limited-availability": "Einschränkungen",
  "action-required":      "Handlungsbedarf",
};

const impactColor = {
  "downtime":             "#7c3aed",
  "limited-availability": "#ea580c",
  "action-required":      "#b91c1c",
};
</script>

<style>
/*
  Nicht scoped -- diese Klassen muessen auf statisch generierten Seiten greifen.
  Der Prafix "detail-" vermeidet Kollisionen mit anderen Komponenten.
*/
.detail-badges {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.detail-badge {
  display: inline-block;
  padding: 0.2em 0.6em;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  line-height: 1.4;
}
</style>