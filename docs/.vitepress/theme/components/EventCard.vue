<template>
  <article
    class="event-card"
    :style="{ borderLeftColor: event.eventType?.color ?? '#ccc' }"
    role="article"
    :aria-label="event.title"
  >
    <div class="badges">
      <span
        class="vp-badge"
        :style="{ backgroundColor: event.eventType?.color ?? '#ccc' }"
      >
        {{ event.eventType?.name ?? event.typeId }}
      </span>

      <span
        v-if="event.typeId === 'maintenance' && status"
        :class="'vp-badge vp-badge-status-' + status"
      >
        {{ statusLabel[status] }}
      </span>

      <span
        v-for="imp in event.impact"
        :key="imp"
        :class="'vp-badge vp-badge-impact-' + imp"
      >
        {{ impactLabel[imp] ?? imp }}
      </span>
    </div>

    <h3>{{ event.title }}</h3>

    <p class="meta">
      {{ formatDateRange(event.eventDate, event.endDate, event.publishedAt) }}
      &middot; {{ event.vendor?.name ?? event.vendorId }}
    </p>

    <p v-html="renderedSummary" />

    <div class="footer">
      <div class="products">
        <span
          v-for="product in event.products"
          :key="product.productId"
          class="product-badge"
        >
          {{ product.name }}
        </span>
      </div>
      <a :href="'/news/' + event.slug" class="details-link">
        Details
      </a>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { marked } from "marked";
import { deriveStatus, statusLabel } from "../composables/useEventStatus.js";

marked.use({ breaks: true, gfm: true });

const props = defineProps({ event: { type: Object, required: true } });

const status = computed(() =>
  props.event.typeId === "maintenance" ? deriveStatus(props.event) : null
);

const impactLabel = {
  "downtime":             "Downtime",
  "limited-availability": "Einschränkungen",
  "action-required":      "Handlungsbedarf",
};

const renderedSummary = computed(() =>
  props.event.summaryMd ? marked.parseInline(props.event.summaryMd) : ""
);

function formatDateRange(start, end, publishedAt) {
  if (!start || !end) {
    const date = new Date(publishedAt);
    return date.toLocaleDateString("de-DE", {
      year: "numeric", month: "long", day: "numeric",
    }) + ", " + date.toLocaleTimeString("de-DE", {
      hour: "2-digit", minute: "2-digit",
    }) + " Uhr";
  }
  const startDate = new Date(start);
  const endDate   = new Date(end);
  const sameDay   = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    return (
      startDate.toLocaleDateString("de-DE", {
        year: "numeric", month: "long", day: "numeric",
      }) + ", " +
      startDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) +
      "\u2013" +
      endDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) +
      " Uhr"
    );
  }
  return (
    startDate.toLocaleDateString("de-DE", {
      year: "numeric", month: "long", day: "numeric",
    }) + ", " +
    startDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) +
    " Uhr \u2013 " +
    endDate.toLocaleDateString("de-DE", {
      year: "numeric", month: "long", day: "numeric",
    }) + ", " +
    endDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) +
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
.meta { font-size: 0.85rem; color: var(--vp-c-text-2); margin: 0.25rem 0 0.5rem; }
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
  margin-top: 0.75rem;
}
.products { display: flex; gap: 0.4rem; flex-wrap: wrap; min-width: 0;}
.product-badge {
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  padding: 0.1em 0.5em;
  border-radius: 4px;
  font-size: 0.75rem;
}
.details-link {
  background: var(--vp-c-brand);
  color: white;
  border-radius: 6px;
  padding: 0.3em 0.9em;
  font-size: 0.8rem;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: auto;
}
.details-link:hover { opacity: 0.85; }
</style>