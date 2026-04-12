// docs/.vitepress/theme/directives/autoresize.js

// v-autoresize: passt Textarea-Höhe automatisch an den Inhalt an.
//
// Lifecycle-Hooks:
//   mounted  → Höhe beim ersten Render setzen (deckt YAML-Import und leeres Formular ab)
//   updated  → Höhe nach programmatischen Änderungen anpassen
//              (Template-Anwendung, YAML-Import via Object.assign)
//   input    → Höhe bei Benutzereingaben anpassen
//
// MutationObserver: bewusst nicht eingesetzt (Review-Empfehlung).
// mounted + updated + input decken alle bekannten Fälle ab.
// Observer nur nachrüsten wenn sich zeigt dass diese Kombination nicht reicht.

function resize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 500) + "px";
}

export const vAutoresize = {
    mounted(el) {
        resize(el);
        el.addEventListener("input", () => resize(el));
    },
    updated(el) {
        resize(el);
    },
};