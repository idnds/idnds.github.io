# BUILD.md -- Build-Prozess und CI/CD

## Abhängigkeiten

Installiert via `npm ci`:

| Paket | Version | Zweck |
|---|---|---|
| vitepress | ^1.6.4 | Static Site Generator |
| vue | ^3.5.26 | Frontend-Framework |
| js-yaml | ^4.1.1 | YAML lesen und schreiben |
| zod | ^4.3.6 | Schema-Validierung |
| marked | installiert | Markdown → HTML im Browser |
| @types/js-yaml | ^4.0.9 | TypeScript-Typen für js-yaml (devDep) |
| pagefind | ^1.4.0 | Volltextsuche (devDep) |

Zod v4 hat `z.toJSONSchema()` nativ eingebaut -- kein externes `zod-to-json-schema`-Paket nötig.

---

## Build-Prozess (lokale Ausführung)

**Reihenfolge ist zwingend** -- jeder Schritt ist Voraussetzung des nächsten:

```bash
# 1. Stammdaten validieren
npm run validate:master

# 2. Event-Inhalte validieren
npm run validate:content
# Bricht ab wenn Fehler → kein Build mit ungültigen Daten

# 3. JSON-Indizes erzeugen
npm run build:index
# Erzeugt: data/_generated/index/all.json (intern)
#          data/_generated/index/latest.json (kuratiert)
#          data/_generated/index/by-type/*.json
#          data/_generated/index/by-year/*.json
#          data/_generated/index/by-vendor/*.json
#          data/_generated/options.json
#          data/_generated/masters.json
# Kopiert nach: docs/public/data/_generated/ (OHNE all.json)

# 4. Statische Detailseiten generieren
npm run build:pages
# Liest: data/_generated/index/all.json
# Schreibt: docs/news/<slug>.md (ein File pro Event)

# 5. RSS-Feed erzeugen
npm run build:feed
# Liest: data/_generated/index/all.json
# Schreibt: docs/public/feed.xml

# 6. VitePress Build
npm run docs:build
# Rendert: docs/ → docs/.vitepress/dist/

# 7. Pagefind (Suchindex)
# Wird in CI nach docs:build ausgeführt
```

---

## Lokale Builds vs. Produktion

| Aspekt | Lokal | Produktion (CI) |
|---|---|---|
| Node.js | >= 24 empfohlen | 24 (in workflow.yml fixiert) |
| Trigger | manuell | git push auf feature-events/main |
| `docs/public` | bleibt zwischen Runs | frisch erzeugt (sauberer Checkout) |
| Altlöschung | manuell nötig | nicht nötig (frischer Build) |

---

## CI/CD (.github/workflows/deploy.yml)

Der Workflow läuft bei jedem Push und erzeugt einen vollständigen Build:

```yaml
steps:
  - npm ci
  - npm run generate:schemas    # JSON-Schemas für VS Code
  - npm run validate:master
  - npm run validate:content    # Bricht ab bei Fehler
  - npm run build:index
  - npm run build:pages
  - npm run build:feed
  - npm run docs:build
  - npx pagefind --site docs/.vitepress/dist
  - Deploy nach GitHub Pages
```

Deployment-Ziel: GitHub Pages (`idnds.github.io` → `lieblingsplatz.cloud`).

---

## JSON-Schemas für VS Code

```bash
npm run generate:schemas
# Erzeugt: schemas/vendor.schema.json
#          schemas/product.schema.json
#          schemas/event-type.schema.json
#          schemas/maintenance.schema.json
#          schemas/security.schema.json
#          schemas/release.schema.json
#          schemas/announcement.schema.json
```

Die Schemas ermöglichen in VS Code:
- Autocompletion für YAML-Felder
- Inline-Fehlermarkierung bei ungültigen Werten
- Hover-Dokumentation