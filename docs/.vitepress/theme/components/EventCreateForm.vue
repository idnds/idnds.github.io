<template>
  <div class="ecf">

    <div v-if="errors.length" class="ecf-errors" role="alert">
      <strong>Bitte korrigiere folgende Felder:</strong>
      <ul>
        <li v-for="err in errors" :key="err">{{ err }}</li>
      </ul>
    </div>

    <div v-if="isDirty && yamlOutput" class="ecf-state-warning" role="status">
      Änderungen vorhanden -- bitte erneut auf "YAML generieren" klicken.
    </div>
    <div v-if="isValid && !isDirty" class="ecf-state-success" role="status">
      YAML ist aktuell und kann heruntergeladen werden.
    </div>

    <!-- Sektion 1: Typ und Produkt -->
    <section class="ecf-section">
      <h2 class="ecf-section-title">1. Event-Typ und Produkt</h2>

      <div class="ecf-field">
        <label class="ecf-label" for="f-type">Event-Typ *</label>
        <select id="f-type" v-model="form.typeId" class="ecf-input">
          <option value="announcement">Ankündigung</option>
          <option value="maintenance">Wartung</option>
          <option value="release">Release</option>
          <option value="security">Security / CVE</option>
        </select>
      </div>

      <div class="ecf-field">
        <label class="ecf-label" for="f-product">Produkt *</label>
        <select id="f-product" v-model="form.productId" class="ecf-input">
          <option value="">-- Produkt auswählen --</option>
          <option
            v-for="p in masters.products"
            :key="p.productId"
            :value="p.productId"
          >
            {{ p.name }} ({{ p.productId }})
          </option>
        </select>
        <p v-if="masters.products.length === 0" class="ecf-hint">
          Produkte werden geladen...
        </p>
      </div>

      <div v-if="derivedVendor" class="ecf-derived">
        <span class="ecf-label">Hersteller (automatisch aus Produkt)</span>
        <code>{{ derivedVendor.name }} ({{ derivedVendor.vendorId }})</code>
      </div>

      <div class="ecf-field">
        <label class="ecf-label" for="f-title">Titel *</label>
        <input
          id="f-title"
          v-model="form.title"
          type="text"
          class="ecf-input"
          placeholder="z.B. Geplantes Wartungsfenster für lieblingsplatz.cloud"
        />
      </div>

      <div class="ecf-field">
        <label class="ecf-label" for="f-shortname">Kurzname *</label>
        <input
          id="f-shortname"
          v-model="form.shortnameRaw"
          type="text"
          class="ecf-input"
          placeholder="z.B. operator-update"
        />
        <p class="ecf-hint">
          Nur Kleinbuchstaben, Zahlen und Bindestriche.
          Normalisiert: <code>{{ shortname || "..." }}</code>
        </p>
      </div>

      <!--
        Badge-Vorschau: nutzt vp-badge-type-* aus badges.css.
        Farben entsprechen data/master/event-types/*.yaml.
      -->
      <div class="ecf-badge-preview">
        <span class="ecf-label">Badge-Vorschau</span>
        <div class="ecf-badge-row">
          <span :class="'vp-badge vp-badge-type-' + form.typeId">
            {{ typeLabel }}
          </span>
          <span
            v-for="imp in form.impact"
            :key="imp"
            :class="'vp-badge vp-badge-impact-' + imp"
          >
            {{ impactLabel[imp] ?? imp }}
          </span>
        </div>
      </div>
    </section>

    <!-- Sektion 2: Datum -->
    <section class="ecf-section">
      <h2 class="ecf-section-title">2. Datum und Zeit</h2>

      <div class="ecf-field">
        <label class="ecf-label" for="f-published">Veröffentlicht am *</label>
        <input
          id="f-published"
          v-model="form.publishedAt"
          type="datetime-local"
          class="ecf-input ecf-input--date"
        />
      </div>

      <template v-if="form.typeId === 'maintenance'">
        <div class="ecf-field">
          <label class="ecf-label" for="f-event-date">Wartungsbeginn *</label>
          <input
            id="f-event-date"
            v-model="form.eventDate"
            type="datetime-local"
            class="ecf-input ecf-input--date"
          />
        </div>
        <div class="ecf-field">
          <label class="ecf-label" for="f-end-date">Wartungsende *</label>
          <input
            id="f-end-date"
            v-model="form.endDate"
            type="datetime-local"
            class="ecf-input ecf-input--date"
          />
        </div>
        <div v-if="form.eventDate && form.endDate" class="ecf-date-preview">
          <span class="ecf-label">Datum-Vorschau</span>
          <p class="ecf-meta-preview">{{ previewDate }}</p>
        </div>
      </template>
    </section>

    <!-- Sektion 3: Inhalt -->
    <section class="ecf-section">
      <h2 class="ecf-section-title">3. Inhalt</h2>

      <div class="ecf-field">
        <label class="ecf-label" for="f-summary">Zusammenfassung * (Markdown)</label>
        <div class="ecf-split">
          <div class="ecf-split-input">
            <textarea
              id="f-summary"
              v-model="form.summaryMd"
              class="ecf-input ecf-textarea"
              rows="4"
              placeholder="Kurze Beschreibung (1-3 Sätze)."
            />
            <!--
              Hinweis zur erlaubten Formatierung.
              marked.parseInline() rendert Inline-Elemente: **fett**, *kursiv*, `code`.
              Block-Elemente (Listen, Überschriften, Code-Blöcke) werden von
              parseInline() nicht verarbeitet und erscheinen als Klartext.
              Für Block-Formatierungen steht das Feld "Details" zur Verfügung.
            -->
            <p class="ecf-hint ecf-hint--format">
              Erlaubte Inline-Formatierungen:
              <strong>**fett**</strong>,
              <em>*kursiv*</em>,
              <code>`inline-Code`</code>.
              Listen, Überschriften und Code-Blöcke werden hier nicht gerendert --
              dafür steht das Feld Details zur Verfügung.
            </p>
          </div>
          <div
            v-if="form.summaryMd"
            class="ecf-split-preview"
            aria-live="polite"
            aria-label="Vorschau Zusammenfassung"
          >
            <span class="ecf-preview-label">Vorschau</span>
            <div class="ecf-rendered" v-html="summaryPreview" />
          </div>
        </div>
      </div>

      <div class="ecf-field">
        <label class="ecf-label" for="f-details">Details (Markdown, optional)</label>
        <div class="ecf-split">
          <div class="ecf-split-input">
            <textarea
              id="f-details"
              v-model="form.detailsMd"
              class="ecf-input ecf-textarea"
              rows="10"
              placeholder="Ausführliche Beschreibung, Ablauf, Hintergrund..."
            />
          </div>
          <div
            v-if="form.detailsMd"
            class="ecf-split-preview"
            aria-live="polite"
            aria-label="Vorschau Details"
          >
            <span class="ecf-preview-label">Vorschau</span>
            <div class="ecf-rendered" v-html="detailsPreview" />
          </div>
        </div>
      </div>
    </section>

    <!-- Sektion 4: Auswirkungen -->
    <section class="ecf-section">
      <h2 class="ecf-section-title">4. Auswirkungen</h2>

      <div class="ecf-field">
        <span class="ecf-label">Impact (optional, Mehrfachauswahl)</span>
        <div class="ecf-checkboxes">
          <label class="ecf-checkbox-label">
            <input type="checkbox" v-model="form.impact" value="downtime" />
            <span>
              <strong>Downtime</strong> &mdash;
              geplante oder tatsächliche Nichtverfügbarkeit
            </span>
          </label>
          <label class="ecf-checkbox-label">
            <input type="checkbox" v-model="form.impact" value="limited-availability" />
            <span>
              <strong>Limited Availability</strong> &mdash;
              eingeschränkte Nutzung, keine vollständige Nichtverfügbarkeit
            </span>
          </label>
          <label class="ecf-checkbox-label">
            <input type="checkbox" v-model="form.impact" value="action-required" />
            <span>
              <strong>Action Required</strong> &mdash;
              Handlungsbedarf auf Kundenseite
            </span>
          </label>
        </div>
      </div>

      <div v-if="hasActionRequired" class="ecf-field">
        <label class="ecf-label" for="f-customer-action">
          Handlungshinweise * (Markdown)
        </label>
        <div class="ecf-split">
          <div class="ecf-split-input">
            <textarea
              id="f-customer-action"
              v-model="form.customerActionMd"
              class="ecf-input ecf-textarea"
              rows="6"
              placeholder="Konkrete Schritte für Kunden..."
            />
          </div>
          <div
            v-if="form.customerActionMd"
            class="ecf-split-preview"
            aria-live="polite"
            aria-label="Vorschau Handlungshinweise"
          >
            <span class="ecf-preview-label">Vorschau</span>
            <div class="ecf-rendered" v-html="customerActionPreview" />
          </div>
        </div>
        <p class="ecf-hint">Pflichtfeld wenn "Action Required" aktiv.</p>
      </div>
    </section>

    <!-- Sektion 5: Release-Felder -->
    <section v-if="form.typeId === 'release'" class="ecf-section">
      <h2 class="ecf-section-title">5. Release-Informationen</h2>
      <div class="ecf-field">
        <label class="ecf-label" for="f-version">Version *</label>
        <input id="f-version" v-model="form.version" type="text"
          class="ecf-input" placeholder="z.B. 1.18.0" />
      </div>
      <div class="ecf-field">
        <label class="ecf-label" for="f-changelog">Changelog-URL (optional)</label>
        <input id="f-changelog" v-model="form.changelogUrl" type="url"
          class="ecf-input" placeholder="https://..." />
      </div>
    </section>

    <!-- Sektion 5: Security-Felder -->
    <section v-if="form.typeId === 'security'" class="ecf-section">
      <h2 class="ecf-section-title">5. Security-Informationen</h2>
      <div class="ecf-field">
        <label class="ecf-label" for="f-severity">Severity (optional)</label>
        <select id="f-severity" v-model="form.severity" class="ecf-input">
          <option value="">-- keine Angabe --</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div class="ecf-field">
        <label class="ecf-label" for="f-cveids">CVE-IDs (optional, eine pro Zeile)</label>
        <textarea id="f-cveids" v-model="form.cveIdsRaw"
          class="ecf-input ecf-textarea"
          placeholder="CVE-2026-1234&#10;CVE-2026-5678" rows="3" />
        <p class="ecf-hint">Format: CVE-YYYY-NNNNN</p>
      </div>
      <div class="ecf-field">
        <label class="ecf-label" for="f-affected">
          Betroffene Versionen (optional, eine pro Zeile)
        </label>
        <textarea id="f-affected" v-model="form.affectedVersionsRaw"
          class="ecf-input ecf-textarea" placeholder="9.12.x&#10;9.14.x" rows="2" />
      </div>
      <div class="ecf-field">
        <label class="ecf-label" for="f-fixed">Behoben in Version (optional)</label>
        <input id="f-fixed" v-model="form.fixedVersion" type="text"
          class="ecf-input" placeholder="z.B. 9.14.4" />
      </div>
    </section>

    <!-- Sektion 6: Relations -->
    <section class="ecf-section">
      <h2 class="ecf-section-title">6. Verknüpfte Events (optional)</h2>
      <div v-for="(rel, idx) in form.relations" :key="idx" class="ecf-relation-row">
        <select v-model="rel.type" class="ecf-input ecf-relation-type">
          <option value="relates-to">Verwandtes Event</option>
          <option value="resolves">Behebt</option>
          <option value="follow-up-to">Nachfolger von</option>
          <option value="supersedes">Ersetzt</option>
        </select>
        <input v-model="rel.eventId" type="text"
          class="ecf-input ecf-relation-id"
          placeholder="Event-ID z.B. maintenance-2026-03-15-lpc-prod-update" />
        <button class="ecf-btn ecf-btn--remove" type="button"
          :aria-label="'Verknüpfung ' + (idx + 1) + ' entfernen'"
          @click="removeRelation(idx)">
          Entfernen
        </button>
      </div>
      <button class="ecf-btn ecf-btn--add" type="button" @click="addRelation">
        + Verknüpfung hinzufügen
      </button>
    </section>

    <!-- Sektion 7: Generieren -->
    <section class="ecf-section ecf-section--output">
      <h2 class="ecf-section-title">7. YAML generieren</h2>

      <div v-if="shortname && form.productId && form.publishedAt" class="ecf-preview-meta">
        <p><strong>Dateiname:</strong> <code>{{ previewFilename }}</code></p>
        <p><strong>ID / Slug:</strong> <code>{{ previewId }}</code></p>
        <p>
          <strong>Zielordner:</strong>
          <code>data/content/{{ form.typeId }}/{{ previewYear }}/</code>
        </p>
      </div>

      <button class="ecf-btn ecf-btn--primary" type="button" @click="generate">
        YAML generieren
      </button>

      <div v-if="yamlOutput" class="ecf-output">
        <div class="ecf-output-header">
          <h3>Generierte YAML</h3>
          <button
            class="ecf-btn ecf-btn--download"
            type="button"
            :disabled="!isValid || isDirty"
            :title="isDirty ? 'Bitte erneut generieren nach Änderungen' : ''"
            @click="download"
          >
            Herunterladen: {{ previewFilename }}
          </button>
        </div>
        <textarea class="ecf-yaml-output" readonly :value="yamlOutput"
          rows="20" aria-label="Generierte YAML" />
        <div class="ecf-next-steps">
          <h4>Nächste Schritte</h4>
          <ol>
            <li>YAML-Datei herunterladen.</li>
            <li>
              Datei im Repository unter
              <code>data/content/{{ form.typeId }}/{{ previewYear }}/</code> ablegen.
            </li>
            <li>Einen Pull Request eröffnen.</li>
            <li>Maintainer prüft Referenzen und merged den PR.</li>
          </ol>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { marked } from "marked";
import yaml from "js-yaml";

// marked konfigurieren -- einmalig, gilt für alle Aufrufe in dieser Komponente
marked.use({ breaks: true, gfm: true });

// Masterdaten laden
const masters = reactive({ vendors: [], products: [] });

onMounted(async () => {
  try {
    const res  = await fetch("/data/_generated/masters.json");
    const data = await res.json();
    masters.vendors  = data.vendors  ?? [];
    masters.products = data.products ?? [];
  } catch (e) {
    console.warn("Masterdaten konnten nicht geladen werden:", e.message);
  }
});

// Formular-State
const form = reactive({
  typeId:              "announcement",
  productId:           "",
  title:               "",
  shortnameRaw:        "",
  publishedAt:         formatForDatetimeLocal(new Date()),
  eventDate:           "",
  endDate:             "",
  summaryMd:           "",
  detailsMd:           "",
  impact:              [],
  customerActionMd:    "",
  version:             "",
  changelogUrl:        "",
  severity:            "",
  cveIdsRaw:           "",
  affectedVersionsRaw: "",
  fixedVersion:        "",
  relations:           [],
});

const errors     = ref([]);
const yamlOutput = ref("");
const isValid    = ref(false);
const isDirty    = ref(false);

watch(form, () => {
  if (yamlOutput.value) {
    isDirty.value = true;
    isValid.value = false;
  }
}, { deep: true });

// Debouncing für Markdown-Vorschau
const debounceTimer           = ref(null);
const debouncedSummary        = ref(form.summaryMd);
const debouncedDetails        = ref(form.detailsMd);
const debouncedCustomerAction = ref(form.customerActionMd);

function debounce(target, value) {
  clearTimeout(debounceTimer.value);
  debounceTimer.value = setTimeout(() => { target.value = value; }, 200);
}

watch(() => form.summaryMd,        (v) => debounce(debouncedSummary, v));
watch(() => form.detailsMd,        (v) => debounce(debouncedDetails, v));
watch(() => form.customerActionMd, (v) => debounce(debouncedCustomerAction, v));

// Vorschau -- parseInline für summary (kein <p>-Wrapper), parse für Details/Actions
const summaryPreview        = computed(() =>
  debouncedSummary.value ? marked.parseInline(debouncedSummary.value) : ""
);
const detailsPreview        = computed(() =>
  debouncedDetails.value ? marked.parse(debouncedDetails.value) : ""
);
const customerActionPreview = computed(() =>
  debouncedCustomerAction.value ? marked.parse(debouncedCustomerAction.value) : ""
);

// Berechnete Felder
const shortname = computed(() =>
  form.shortnameRaw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
);

const derivedVendor = computed(() => {
  const product = masters.products.find((p) => p.productId === form.productId);
  if (!product) return null;
  return (
    masters.vendors.find((v) => v.vendorId === product.vendorId) ??
    { vendorId: product.vendorId, name: product.vendorId }
  );
});

const hasActionRequired = computed(() => form.impact.includes("action-required"));
const publishedDate     = computed(() => form.publishedAt?.substring(0, 10) ?? "");
const previewYear       = computed(() => publishedDate.value.substring(0, 4));

// ID/Slug: typeId-Präfix bleibt für Eindeutigkeit über alle Event-Typen
const previewId = computed(() =>
  form.typeId + "-" + publishedDate.value + "-" + form.productId + "-" + shortname.value
);

// Dateiname: kein typeId-Präfix -- der Ordner data/content/<typeId>/ macht den Typ eindeutig.
// ISO-Datum am Anfang ermöglicht alphabetische Sortierung nach Veröffentlichungsdatum.
const previewFilename = computed(() =>
  publishedDate.value + "-" + form.productId + "-" + shortname.value + ".yaml"
);

const typeLabel = computed(() => {
  const labels = {
    announcement: "Ankündigung",
    maintenance:  "Wartung",
    release:      "Release",
    security:     "Security / CVE",
  };
  return labels[form.typeId] ?? form.typeId;
});

const previewDate = computed(() =>
  formatDateRange(form.eventDate, form.endDate, form.publishedAt)
);

const impactLabel = {
  "downtime":             "Downtime",
  "limited-availability": "Einschränkungen",
  "action-required":      "Handlungsbedarf",
};

// Hilfsfunktionen
function formatForDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear() + "-" +
    pad(date.getMonth() + 1) + "-" +
    pad(date.getDate()) + "T" +
    pad(date.getHours()) + ":" +
    pad(date.getMinutes())
  );
}

function toIso(localDatetime) {
  if (!localDatetime) return null;
  const d      = new Date(localDatetime);
  const offset = -d.getTimezoneOffset();
  const sign   = offset >= 0 ? "+" : "-";
  const pad    = (n) => String(Math.abs(n)).padStart(2, "0");
  const hh     = pad(Math.floor(Math.abs(offset) / 60));
  const mm     = pad(Math.abs(offset) % 60);
  return (
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":00" + sign + hh + ":" + mm
  );
}

function formatDateRange(start, end, publishedAt) {
  if (!start || !end) {
    if (!publishedAt) return "";
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

function addRelation()         { form.relations.push({ type: "relates-to", eventId: "" }); }
function removeRelation(index) { form.relations.splice(index, 1); }

// Validierung
function validate() {
  const errs = [];
  if (!form.typeId)
    errs.push("Event-Typ ist Pflichtfeld.");
  if (!form.productId)
    errs.push("Produkt ist Pflichtfeld.");
  if (!form.title.trim() || form.title.trim().length < 3)
    errs.push("Titel muss mindestens 3 Zeichen lang sein.");
  if (!shortname.value)
    errs.push("Kurzname ist Pflichtfeld (nur Kleinbuchstaben, Zahlen, Bindestriche).");
  if (!form.publishedAt)
    errs.push("Veröffentlichungsdatum ist Pflichtfeld.");
  if (!form.summaryMd.trim())
    errs.push("Zusammenfassung ist Pflichtfeld.");
  if (form.typeId === "maintenance") {
    if (!form.eventDate)
      errs.push("Wartungsbeginn ist Pflichtfeld bei Wartungs-Events.");
    if (!form.endDate)
      errs.push("Wartungsende ist Pflichtfeld bei Wartungs-Events.");
    if (form.eventDate && form.endDate &&
        new Date(form.eventDate) >= new Date(form.endDate))
      errs.push("Wartungsende muss zeitlich nach dem Wartungsbeginn liegen.");
  }
  if (form.typeId === "release" && !form.version.trim())
    errs.push("Version ist Pflichtfeld bei Release-Events.");
  if (hasActionRequired.value && !form.customerActionMd.trim())
    errs.push("Handlungshinweise sind Pflichtfeld wenn 'Action Required' gewählt ist.");
  if (form.changelogUrl && !form.changelogUrl.match(/^https?:\/\/.+/))
    errs.push("Changelog-URL muss mit https:// oder http:// beginnen.");
  const cveIds = form.cveIdsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
  for (const cve of cveIds) {
    if (!/^CVE-\d{4}-\d+$/.test(cve))
      errs.push('CVE-ID "' + cve + '" hat kein gültiges Format. Erwartet: CVE-YYYY-NNNNN');
  }
  return errs;
}

// YAML aufbauen
// Kein Custom-Schema, kein lit() -- plain yaml.dump mit quotingType: '"' und
// forceQuotes: false. Das erzeugt sauberes YAML ohne unnötige Anführungszeichen
// und ohne !!str-Tags. Mehrzeilige Strings werden von js-yaml automatisch als
// >- (folded scalar) ausgegeben -- vollständig gültiges YAML.
function buildYaml() {
  const id       = previewId.value;
  const vendorId = derivedVendor.value?.vendorId ?? form.productId;

  const obj = {
    id,
    slug:        id,
    typeId:      form.typeId,
    vendorId,
    productIds:  [form.productId],
    title:       form.title.trim(),
    publishedAt: toIso(form.publishedAt),
    summaryMd:   form.summaryMd.trim(),
  };

  if (form.detailsMd.trim()) obj.detailsMd = form.detailsMd.trim();

  // impact immer ausgeben -- auch als leeres Array.
  // Signalisiert: das Feld ist bewusst leer, nicht vergessen.
  obj.impact = form.impact.length ? [...form.impact] : [];

  if (hasActionRequired.value && form.customerActionMd.trim())
    obj.customerActionMd = form.customerActionMd.trim();

  const cleanRelations = form.relations.filter((r) => r.eventId.trim());
  obj.relations = cleanRelations.map((r) => ({
    type:    r.type,
    eventId: r.eventId.trim(),
  }));

  if (form.typeId === "maintenance") {
    obj.status    = "active";
    obj.eventDate = toIso(form.eventDate);
    obj.endDate   = toIso(form.endDate);
  }

  if (form.typeId === "release") {
    obj.version = form.version.trim();
    if (form.changelogUrl.trim()) obj.changelogUrl = form.changelogUrl.trim();
  }

  if (form.typeId === "security") {
    const cveIds   = form.cveIdsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
    const affected = form.affectedVersionsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
    if (cveIds.length)            obj.cveIds = cveIds;
    if (form.severity)            obj.severity = form.severity;
    if (affected.length)          obj.affectedVersions = affected;
    if (form.fixedVersion.trim()) obj.fixedVersion = form.fixedVersion.trim();
  }

  return yaml.dump(obj, {
    lineWidth:   120,
    noRefs:      true,
    quotingType: '"',
    forceQuotes: false,
  });
}

// Generieren
function generate() {
  errors.value = validate();
  if (errors.value.length) {
    yamlOutput.value = "";
    isValid.value    = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  yamlOutput.value = buildYaml();
  isValid.value    = true;
  isDirty.value    = false;
}

// Herunterladen
function download() {
  if (!yamlOutput.value || !isValid.value || isDirty.value) return;
  const blob = new Blob([yamlOutput.value], { type: "text/yaml;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = previewFilename.value;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<style>
.ecf { max-width: 1100px; }

.ecf-errors {
  background: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  color: #991b1b;
}
.ecf-errors ul  { margin: 0.5rem 0 0; padding-left: 1.25rem; }
.ecf-errors li  { margin: 0.2rem 0; }

.ecf-state-warning {
  padding: 0.65rem 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #92400e;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
.ecf-state-success {
  padding: 0.65rem 1rem;
  background: #dcfce7;
  border: 1px solid #22c55e;
  border-radius: 6px;
  color: #166534;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.ecf-section {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  background: var(--vp-c-bg-soft);
}
.ecf-section--output { background: var(--vp-c-bg); }

.ecf-section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.ecf-field { margin-bottom: 1rem; }
.ecf-field:last-child { margin-bottom: 0; }

.ecf-derived {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.ecf-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 0.35rem;
}

.ecf-input {
  display: block;
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  font-family: inherit;
  box-sizing: border-box;
}
.ecf-input:focus {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 1px;
}
.ecf-input--date { max-width: 280px; }
.ecf-textarea   { resize: vertical; min-height: 80px; }

.ecf-hint {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  margin: 0.3rem 0 0;
}
.ecf-hint--format {
  background: var(--vp-c-bg-mute);
  border-left: 3px solid var(--vp-c-divider);
  padding: 0.4rem 0.6rem;
  border-radius: 0 4px 4px 0;
  margin-top: 0.5rem;
  line-height: 1.5;
}

.ecf-checkboxes { display: flex; flex-direction: column; gap: 0.6rem; }
.ecf-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.9rem;
  cursor: pointer;
  line-height: 1.4;
}
.ecf-checkbox-label input {
  margin-top: 0.15rem;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.ecf-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  align-items: start;
}
@media (max-width: 900px) {
  .ecf-split { grid-template-columns: 1fr; }
}
.ecf-split-input  { min-width: 0; }
.ecf-split-preview { min-width: 0; }

.ecf-preview-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
  margin-bottom: 0.35rem;
}

.ecf-rendered {
  padding: 0.65rem 0.75rem;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 0.9rem;
  line-height: 1.6;
  min-height: 2.5rem;
}
.ecf-rendered p            { margin: 0 0 0.5em; }
.ecf-rendered p:last-child { margin-bottom: 0; }
.ecf-rendered ul,
.ecf-rendered ol           { margin: 0.25em 0 0.5em 1.25em; }
.ecf-rendered li           { margin: 0.15em 0; }
.ecf-rendered strong       { font-weight: 700; }
.ecf-rendered em           { font-style: italic; }
.ecf-rendered code {
  background: var(--vp-c-bg-soft);
  padding: 0.1em 0.35em;
  border-radius: 3px;
  font-size: 0.85em;
}
.ecf-rendered h1,
.ecf-rendered h2,
.ecf-rendered h3 { margin: 0.75em 0 0.35em; font-weight: 700; }

.ecf-badge-preview {
  padding: 0.6rem 0.75rem;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  margin-bottom: 1rem;
}
.ecf-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.ecf-date-preview {
  padding: 0.6rem 0.75rem;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  margin-top: 0.5rem;
}
.ecf-meta-preview {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin: 0.25rem 0 0;
}

.ecf-relation-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.ecf-relation-type { width: 190px; flex-shrink: 0; }
.ecf-relation-id   { flex: 1; min-width: 200px; }

.ecf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4em 1em;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  line-height: 1.4;
}
.ecf-btn--primary {
  background: var(--vp-c-brand);
  color: white;
  font-size: 1rem;
  padding: 0.55em 1.75em;
}
.ecf-btn--primary:hover { opacity: 0.85; }
.ecf-btn--add {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
  margin-top: 0.25rem;
}
.ecf-btn--add:hover { background: var(--vp-c-bg-soft); }
.ecf-btn--remove {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
  font-size: 0.8rem;
  padding: 0.3em 0.7em;
}
.ecf-btn--remove:hover { background: #fecaca; }
.ecf-btn--download {
  background: #22c55e;
  color: white;
  border-color: #22c55e;
}
.ecf-btn--download:hover:not(:disabled) { opacity: 0.85; }
.ecf-btn--download:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.7;
}

.ecf-preview-meta {
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}
.ecf-preview-meta p { margin: 0.25rem 0; }

.ecf-output { margin-top: 1.5rem; }
.ecf-output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.ecf-output-header h3 { margin: 0; font-size: 1rem; }

.ecf-yaml-output {
  width: 100%;
  font-family: monospace;
  font-size: 0.8rem;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem;
  box-sizing: border-box;
  resize: vertical;
  color: var(--vp-c-text-1);
}

.ecf-next-steps {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border-left: 4px solid var(--vp-c-brand);
}
.ecf-next-steps h4 { margin: 0 0 0.5rem; font-size: 0.9rem; }
.ecf-next-steps ol { margin: 0; padding-left: 1.25rem; font-size: 0.875rem; }
.ecf-next-steps li { margin: 0.3rem 0; }
</style>