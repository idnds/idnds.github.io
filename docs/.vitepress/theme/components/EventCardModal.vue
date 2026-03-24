<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <header>
        <h2>{{ event.title }}</h2>
        <button class="close-btn" @click="close">&times;</button>
      </header>

      <div class="modal-body">
        <!-- Zeile 1: Typ und Hersteller -->
        <div class="meta-line">
          Typ: {{ event.eventType?.name ?? event.typeId }} &middot;
          Hersteller: {{ event.vendor?.name ?? event.vendorId }}
        </div>

        <!-- Zeile 2: Version und Changelog -->
        <div class="meta-line" v-if="event.version || event.changelogUrl">
          <span v-if="event.version">Version: {{ event.version }}</span>
          <span v-if="event.version && event.changelogUrl"> (<a :href="event.changelogUrl" target="_blank" class="changelog-link">Changelog</a>)</span>
          <span v-else-if="event.changelogUrl"><a :href="event.changelogUrl" target="_blank" class="changelog-link">Changelog</a></span>
        </div>

        <!-- Produkte als Badges -->
        <div class="products">
          <span
            v-for="p in event.products"
            :key="p.productId"
            class="product-badge"
          >
            {{ p.name }}
          </span>
        </div>

        <!-- Details -->
        <div v-if="event.detailsMd" class="details">
          <div class="markdown-plain">{{ event.detailsMd }}</div>
        </div>
      </div>

      <footer>
        <button @click="close">Schließen</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  event: { type: Object, required: true },
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const visible = ref(props.modelValue);

watch(() => props.modelValue, (v) => (visible.value = v));

function close() {
  visible.value = false;
  emit("update:modelValue", false);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}
.modal-content {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80%;
  overflow-y: auto;
}
.close-btn {
  float: right;
  font-size: 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
}
.modal-body { margin-top: 1rem; }
.details { margin-top: 1rem; }
</style>