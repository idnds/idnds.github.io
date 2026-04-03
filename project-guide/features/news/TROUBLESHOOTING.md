# TROUBLESHOOTING.md -- Bekannte Probleme und Lösungen

Alle hier aufgeführten Probleme sind im Verlauf der Entwicklung aufgetreten
und durch konkrete Maßnahmen behoben worden.

---

## JSON-Schemas

### Schemas leer (`{}` oder nur `{ "$schema": "..." }`)

**Ursache:** `zodToJsonSchema()` erhält `undefined` -- Named Export schlägt lautlos fehl.

**Diagnose:**
```bash
node -e "import('./scripts/schemas/master.mjs').then(m => console.log(Object.keys(m))).catch(e => console.error(e))"
# Erwartet: [ 'VendorSchema', 'ProductSchema', 'EventTypeSchema' ]
```

**Ursache 2:** Zod v4 hat `z.toJSONSchema()` nativ. Das externe Paket
`zod-to-json-schema` ist nicht kompatibel.

---

## Validierung

### `Jahresordner stimmt nicht mit Dateidatum überein`

**Symptom:** `Jahresordner (2025) stimmt nicht mit Dateidatum (2026) überein`

**Ursache:** Datei liegt im falschen Jahresordner oder das Datum im Dateinamen ist falsch.

**Lösung:** Datei in den richtigen Ordner verschieben oder Dateinamen korrigieren.

---

### `relations.eventId nicht gefunden`

**Ursache:** Eine `relations`-Verknüpfung zeigt auf eine ID die nicht existiert.

**Lösung:** ID in der referenzierten YAML-Datei prüfen, oder Relation entfernen.

---

## EventFilter

### Dropdown-Optionen verschwinden beim Filtern

**Ursache:** `availableTypes` und `availableVendors` wurden aus `events.value`
berechnet statt aus `options.json`.

**Lösung:** `options.json` beim Start parallel laden und für Dropdowns verwenden.
Siehe [ARCHITECTURE.md](./ARCHITECTURE.md) -- Abschnitt "options.json".
