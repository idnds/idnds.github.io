<template>
  <section class="ecf-section">
    <h2 class="ecf-section-title">{{ sectionNumber }}. Release-Informationen</h2>
    <div class="ecf-field">
      <label class="ecf-label" for="f-version">Version *</label>
      <input id="f-version" :value="form.version"
        @input="$emit('update:version', $event.target.value)"
        type="text" class="ecf-input" placeholder="z.B. 1.18.0" />
    </div>
    <div class="ecf-field">
      <label class="ecf-label" for="f-changelog">Changelog-URL (optional)</label>
      <input id="f-changelog" :value="form.changelogUrl"
        @input="$emit('update:changelogUrl', $event.target.value)"
        type="url" class="ecf-input" placeholder="https://..." />
    </div>
  </section>
</template>
<script setup>
defineProps({ form: { type: Object, required: true }, sectionNumber: { type: Number, default: 5 } });
defineEmits(["update:version", "update:changelogUrl"]);
</script>