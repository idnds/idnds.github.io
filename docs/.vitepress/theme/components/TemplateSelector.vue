<template>
  <div v-if="visibleTemplates.length" class="ecf-template-selector">
    <div class="ecf-template-header">
      <span class="ecf-label">Vorlage verwenden (optional)</span>
      <select
        v-model="selectedId"
        class="ecf-input ecf-input--template"
        aria-label="Vorlage auswählen"
        @change="onSelect"
      >
        <option value="">-- Vorlage auswählen --</option>
        <option v-for="t in visibleTemplates" :key="t.id" :value="t.id">
          {{ t.name }}
        </option>
      </select>
    </div>

    <!--
      Description und "Angewendet"-Status bleiben sichtbar solange eine Vorlage
      gewählt ist. selectedId wird nach dem Anwenden NICHT zurückgesetzt --
      das gibt dem Nutzer Rückmeldung welche Vorlage aktiv ist.
      Erst bei expliziter Auswahl von "-- Vorlage auswählen --" wird zurückgesetzt.
    -->
    <p v-if="appliedDescription" class="ecf-hint ecf-template-applied">
      <strong>Angewendet:</strong> {{ appliedDescription }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  basePath:      { type: String, default: "/data/_generated/templates/news" },
  currentTypeId: { type: String, default: "" },
});
const emit = defineEmits(["apply"]);

const templates      = ref([]);
const selectedId     = ref("");
const templateCache  = new Map();

// Separate ref für die angezeigte Description -- wird beim Anwenden gesetzt
// und bleibt erhalten bis eine neue Vorlage gewählt oder zurückgesetzt wird.
const appliedDescription = ref("");

onMounted(async () => {
  try {
    const res  = await fetch(props.basePath + "/index.json");
    const data = await res.json();
    templates.value = data.templates ?? [];
  } catch (e) {
    console.warn("Templates konnten nicht geladen werden:", e.message);
  }
});

// Nur Templates anzeigen die zum aktuellen Typ passen
const visibleTemplates = computed(() =>
  templates.value.filter(
    (t) => !t.typeId || !props.currentTypeId || t.typeId === props.currentTypeId
  )
);

async function onSelect() {
  // Zurücksetzen: "-- Vorlage auswählen --" gewählt
  if (!selectedId.value) {
    appliedDescription.value = "";
    return;
  }

  let data = templateCache.get(selectedId.value);
  if (!data) {
    try {
      const res = await fetch(props.basePath + "/" + selectedId.value + ".json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      data = await res.json();
      templateCache.set(selectedId.value, data);
    } catch (e) {
      console.error("Template konnte nicht geladen werden:", e.message);
      selectedId.value     = "";
      appliedDescription.value = "";
      return;
    }
  }

  // Description aus dem geladenen Template lesen und persistent anzeigen
  appliedDescription.value =
    data._meta?.description ||
    templates.value.find((t) => t.id === selectedId.value)?.description ||
    "";

  emit("apply", data);
  // selectedId wird NICHT zurückgesetzt -- Dropdown zeigt weiter die gewählte Vorlage
}
</script>

<style scoped>
.ecf-template-selector {
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-brand);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}
.ecf-template-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.ecf-input--template { max-width: 360px; }
.ecf-template-applied {
  margin-top: 0.4rem;
  color: var(--vp-c-brand);
}
</style>