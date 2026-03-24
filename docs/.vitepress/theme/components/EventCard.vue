<template>
  <article
    class="event-card"
    :style="{ borderLeftColor: event.eventType?.color ?? '#ccc' }"
    role="article"
    :aria-label="event.title"
    @click="openModal"
  >
    <div class="badges">
      <span
        class="type-badge"
        :style="{ backgroundColor: event.eventType?.color ?? '#ccc' }"
      >
        {{ event.eventType?.name ?? event.typeId }}
      </span>

      <!-- Status nur bei Maintenance anzeigen -->
      <span
        v-if="event.typeId === 'maintenance'"
        :class="'status-badge ' + statusClass[status]"
      >
        {{ statusLabel[status] }}
      </span>
    </div>

    <h3>{{ event.title }}</h3>

    <p class="meta">
      {{ formatDateRange(event.eventDate, event.endDate, event.publishedAt) }}
      &middot; {{ event.vendor?.name ?? event.vendorId }}
    </p>

    <p>{{ event.summaryMd }}</p>

    <div class="products">
      <span
        v-for="product in event.products"
        :key="product.productId"
        class="product-badge"
      >
        {{ product.name }}
      </span>
    </div>
  </article>
    <EventCardModal
    :event="event"
    v-model="showModal"
  />
</template>

<script setup>
import { computed } from "vue";
import { deriveStatus, statusLabel, statusClass } from "../composables/useEventStatus.js";

import { ref } from "vue";
import EventCardModal from "./EventCardModal.vue";

const showModal = ref(false);

function openModal() {
  showModal.value = true;
}

const props = defineProps({ event: { type: Object, required: true } });

// Nur bei Maintenance wird der Status berechnet
const status = computed(() => {
  return props.event.typeId === "maintenance" ? deriveStatus(props.event) : null;
});

function formatDateRange(start, end, publishedAt) {
  if (!start || !end) {
    // Fallback für Security/Release/Announcement
    const date = new Date(publishedAt);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) + ", " + date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " Uhr";
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay = startDate.toDateString() === endDate.toDateString();

  const dateOptions = { year: "numeric", month: "long", day: "numeric" };
  const timeOptions = { hour: "2-digit", minute: "2-digit" };

  if (sameDay) {
    return (
      startDate.toLocaleDateString("de-DE", dateOptions) +
      ", " +
      startDate.toLocaleTimeString("de-DE", timeOptions) +
      "–" +
      endDate.toLocaleTimeString("de-DE", timeOptions) +
      " Uhr"
    );
  }

  return (
    startDate.toLocaleDateString("de-DE", dateOptions) +
    ", " +
    startDate.toLocaleTimeString("de-DE", timeOptions) +
    " Uhr – " +
    endDate.toLocaleDateString("de-DE", dateOptions) +
    ", " +
    endDate.toLocaleTimeString("de-DE", timeOptions) +
    " Uhr"
  );
}
</script>

<style scoped>
.event-card {
  border-left: 4px solid;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 0 8px 8px 0;
}
.badges { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.type-badge,
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
.meta { font-size: 0.85rem; color: var(--vp-c-text-2); margin: 0.25rem 0 0.5rem; }
.products { margin-top: 0.5rem; display: flex; gap: 0.4rem; flex-wrap: wrap; }
.product-badge {
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  padding: 0.1em 0.5em;
  border-radius: 4px;
  font-size: 0.75rem;
}
</style>