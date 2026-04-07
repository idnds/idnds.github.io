<template>
  <div v-if="templates.length" class="ecf-template-selector">
    <div class="ecf-template-header">
      <span class="ecf-label">Vorlage verwenden (optional)</span>
      <select v-model="selectedId" class="ecf-input ecf-input--template"
        @change="onSelect" aria-label="Vorlage auswählen">
        <option value="">-- Vorlage auswählen --</option>
        <option v-for="t in templates" :key="t.id" :value="t.id">
          {{ t.name }}
        </option>
      </select>
    </div>
    <p v-if="selectedDescription" class="ecf-hint">{{ selectedDescription }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  // Basispfad zur generierten Templates-JSON, ohne abschließenden Slash.
  // Muss mit dem Ausgabepfad in build-templates.mjs übereinstimmen.
  basePath: {
    type:    String,
    default: "/data/_generated/templates/news",
  },
});
const emit = defineEmits(["apply"]);

const templates    = ref([]);
const selectedId   = ref("");
const templateCache = new Map();

onMounted(async () => {
  try {
    const res  = await fetch(props.basePath + "/index.json");
    const data = await res.json();
    templates.value = data.templates ?? [];
  } catch (e) {
    console.warn("Templates konnten nicht geladen werden:", e.message);
  }
});

const selectedDescription = computed(() =>
  templates.value.find((t) => t.id === selectedId.value)?.description ?? ""
);

async function onSelect() {
  if (!selectedId.value) return;

  let data = templateCache.get(selectedId.value);
  if (!data) {
    try {
      const res = await fetch(props.basePath + "/" + selectedId.value + ".json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      data = await res.json();
      templateCache.set(selectedId.value, data);
    } catch (e) {
      console.error("Template konnte nicht geladen werden:", e.message);
      selectedId.value = "";
      return;
    }
  }

  emit("apply", data);
  selectedId.value = "";
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
</style>