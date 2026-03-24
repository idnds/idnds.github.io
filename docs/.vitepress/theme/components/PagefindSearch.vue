<template>
  <div id="search"></div>
</template>

<script setup>
import { onMounted } from "vue";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Script konnte nicht geladen werden: ${src}`));
    document.head.appendChild(script);
  });
}

function loadCss(href) {
  const existing = document.querySelector(`link[href="${href}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

onMounted(async () => {
  loadCss("/pagefind/pagefind-ui.css");
  await loadScript("/pagefind/pagefind-ui.js");

  if (window.PagefindUI) {
    new window.PagefindUI({
      element: "#search",
      showSubResults: true,
      resetStyles: false,
    });
  }
});
</script>