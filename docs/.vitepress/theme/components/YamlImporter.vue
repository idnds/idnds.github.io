<template>
  <section class="ecf-section ecf-section--importer">
    <h2 class="ecf-section-title">1. Bestehende YAML laden</h2>

    <p class="ecf-importer-intro">
      Kopiere den Inhalt einer bestehenden YAML-Datei aus dem Repository
      und füge ihn unten ein. Die Datei findest du unter
      <code>data/content/&lt;typ&gt;/&lt;jahr&gt;/</code>.
    </p>

    <!-- Paste: Primärpfad (Go-Beschluss #3) -->
    <div class="ecf-field">
      <label class="ecf-label" for="f-yaml-paste">YAML einfügen (empfohlen)</label>
      <textarea id="f-yaml-paste" v-model="pasteContent"
        class="ecf-input ecf-textarea ecf-textarea--yaml"
        rows="12" placeholder="id: announcement-2026-03-28-..." />
    </div>

    <button class="ecf-btn ecf-btn--primary" type="button"
      :disabled="!pasteContent.trim()" @click="onPaste">
      YAML laden und Formular befüllen
    </button>

    <!-- Datei-Upload: Alternative -->
    <div class="ecf-importer-divider">oder</div>

    <div class="ecf-field">
      <label class="ecf-label" for="f-yaml-file">YAML-Datei hochladen</label>
      <input id="f-yaml-file" type="file" accept=".yaml,.yml"
        class="ecf-input-file" @change="onFileUpload" />
    </div>

    <p v-if="importError" class="ecf-import-error" role="alert">
      {{ importError }}
    </p>
  </section>
</template>

<script setup>
import { ref } from "vue";

const emit       = defineEmits(["imported"]);
const pasteContent = ref("");
const importError  = ref("");

function onPaste() {
  if (!pasteContent.value.trim()) return;
  try {
    emit("imported", pasteContent.value);
    importError.value  = "";
  } catch (e) {
    importError.value = "YAML konnte nicht gelesen werden: " + e.message;
  }
}

function onFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      emit("imported", e.target.result);
      importError.value = "";
    } catch (err) {
      importError.value = "Datei konnte nicht gelesen werden: " + err.message;
    }
  };
  reader.onerror = () => { importError.value = "Fehler beim Lesen der Datei."; };
  reader.readAsText(file, "utf-8");
}
</script>

<style scoped>
.ecf-section--importer { border-color: var(--vp-c-brand); }
.ecf-importer-intro {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  margin-bottom: 1rem;
  line-height: 1.5;
}
.ecf-textarea--yaml {
  font-family: monospace;
  font-size: 0.8rem;
}
.ecf-importer-divider {
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin: 1rem 0;
}
.ecf-input-file {
  display: block;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}
.ecf-import-error {
  color: #991b1b;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>