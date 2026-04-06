<template>
  <section class="ecf-section">
    <h2 class="ecf-section-title">{{ sectionNumber }}. Security-Informationen</h2>
    <div class="ecf-field">
      <label class="ecf-label" for="f-severity">Severity (optional)</label>
      <select id="f-severity" :value="form.severity"
        @change="$emit('update:severity', $event.target.value)" class="ecf-input">
        <option value="">-- keine Angabe --</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
    <div class="ecf-field">
      <label class="ecf-label" for="f-cveids">CVE-IDs (optional, eine pro Zeile)</label>
      <textarea id="f-cveids" :value="form.cveIdsRaw"
        @input="$emit('update:cveIdsRaw', $event.target.value)"
        class="ecf-input ecf-textarea" placeholder="CVE-2026-1234&#10;CVE-2026-5678" rows="3" />
      <p class="ecf-hint">Format: CVE-YYYY-NNNNN</p>
    </div>
    <div class="ecf-field">
      <label class="ecf-label" for="f-affected">Betroffene Versionen (optional, eine pro Zeile)</label>
      <textarea id="f-affected" :value="form.affectedVersionsRaw"
        @input="$emit('update:affectedVersionsRaw', $event.target.value)"
        class="ecf-input ecf-textarea" placeholder="9.12.x&#10;9.14.x" rows="2" />
    </div>
    <div class="ecf-field">
      <label class="ecf-label" for="f-fixed">Behoben in Version (optional)</label>
      <input id="f-fixed" :value="form.fixedVersion"
        @input="$emit('update:fixedVersion', $event.target.value)"
        type="text" class="ecf-input" placeholder="z.B. 9.14.4" />
    </div>
  </section>
</template>
<script setup>
defineProps({ form: { type: Object, required: true }, sectionNumber: { type: Number, default: 5 } });
defineEmits(["update:severity","update:cveIdsRaw","update:affectedVersionsRaw","update:fixedVersion"]);
</script>