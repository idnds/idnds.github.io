# NEWS-ARCHITECTURE.md -- Technische Architektur des News-Systems

## Architekturprinzipien

Drei Regeln sind nicht verhandelbar:

1. **Build = Intelligenz**: Alle Filterlogik, Sortierung und Datenanreicherung
   findet beim Build statt, nicht im Browser.
2. **Browser = Anzeige**: Der Browser lädt nur kleine, vorbereitete JSON-Indizes
   und rendert daraus die Ansicht.
3. **Niemals alles laden**: Der Browser lädt niemals `all.json` (den vollständigen
   Eventbestand). Nur kuratierte Teilmengen.

---

## Datenmodell

### Stammdaten (`data/master/`)

Stammdaten ändern sich selten und haben keine Jahreszweige.

**Hersteller** (`data/master/vendors/<vendorId>.yaml`):
```yaml
vendorId:     string       # Pflicht, eindeutig, z.B. "cisco"
name:         string       # Pflicht, Anzeigename
website:      string       # Optional
description:  string       # Optional
deprecatedAt: IsoDateTime  # Optional -- gesetzt = taucht nicht mehr in Filtern auf
```

**Produkte** (`data/master/products/<productId>.yaml`):
```yaml
productId:   string       # Pflicht, eindeutig
vendorId:    string       # Pflicht, Referenz auf Hersteller
name:        string       # Pflicht
category:    string       # Optional
description: string       # Optional
deprecatedAt: IsoDateTime # Optional
```

**Event-Typen** (`data/master/event-types/<typeId>.yaml`):
```yaml
typeId:      string  # Pflicht: maintenance | security | release | announcement
name:        string  # Pflicht, Anzeigename
group:       string  # Optional
color:       string  # Pflicht, Hex-Farbe für Badges (#3b82f6)
description: string  # Optional
```

Farben der Standard-Typen:

| typeId | Farbe |
|---|---|
| announcement | #f59e0b |
| maintenance | #3b82f6 |
| release | #22c55e |
| security | #ef4444 |

### Content-Datenmodell

**Basisfelder (alle Typen, Pflicht):**
```yaml
id:          string      # typeId-YYYY-MM-DD-productId-kurzname, global eindeutig
slug:        string      # identisch mit id
typeId:      string      # maintenance | security | release | announcement
vendorId:    string      # Referenz auf Hersteller
productIds:  string[]    # Mindestens ein Produkt
title:       string      # Mindestens 3 Zeichen
publishedAt: IsoDateTime # Wann veröffentlicht
summaryMd:   string      # Pflicht, nur Inline-Markdown
```

**Basisfelder (alle Typen, optional):**
```yaml
updatedAt:        IsoDateTime  # Letzte inhaltliche Aktualisierung, nicht vor publishedAt
detailsMd:        string       # Vollständiges Markdown
impact:           string[]     # downtime | limited-availability | action-required
customerActionMd: string       # Nur wenn impact action-required enthält
relations:
  - type:    relates-to | resolves | follow-up-to | supersedes
    eventId: string            # ID eines anderen Events, keine Selbstreferenz
```

**Nur `maintenance`:**
```yaml
status:    active | cancelled  # Default: active
eventDate: IsoDateTime         # Pflicht bei maintenance
endDate:   IsoDateTime         # Pflicht bei maintenance, nach eventDate
```

**Nur `security`:**
```yaml
cveIds:           string[]  # Format CVE-YYYY-NNNNN
severity:         critical | high | medium | low
affectedVersions: string[]
fixedVersion:     string
```

**Nur `release`:**
```yaml
version:      string  # Pflicht bei release
changelogUrl: string  # Optional, muss gültige URL sein
```

### Validierungsregeln (Zod)

- `updatedAt` darf nicht vor `publishedAt` liegen und nicht in der Zukunft
- `customerActionMd` gesetzt → `impact` muss `action-required` enthalten
- `impact` darf keine Duplikate enthalten
- `endDate` muss nach `eventDate` liegen (nur maintenance)
- `relations[].eventId` muss auf ein existierendes Event zeigen (Build-Skript, nicht Zod)
- Keine Selbstreferenz in `relations`
- IDs und Slugs global eindeutig über alle Typen

### Wichtige Entscheidungen

**`isCustomerActionRequired` wird nicht gepflegt** -- es wird aus `impact` berechnet:
```js
const customerActionRequired = event.impact?.includes("action-required") ?? false;
```

**`downtimeMinutes` ist entfernt** -- Downtime wird über `impact: [downtime]` und
`eventDate`/`endDate` beschrieben.

**`version` und `changelogUrl` nur bei `release`** -- Maintenance-Events verweisen
über `relations` auf zugehörige Releases.

---

## Verzeichnisstruktur

```
idnds.github.io/
├── data/
│   ├── master/
│   │   ├── vendors/         ← Hersteller-YAMLs
│   │   ├── products/        ← Produkt-YAMLs
│   │   └── event-types/     ← Event-Typ-YAMLs
│   ├── content/
│   │   ├── maintenance/
│   │   │   └── 2026/        ← YYYY-MM-DD-<productId>-<kurzname>.yaml
│   │   ├── security/
│   │   ├── release/
│   │   └── announcement/
│   └── _generated/          ← gitignored, Build-Output
│       ├── index/
│       │   ├── all.json     ← vollständig, NUR intern
│       │   ├── latest.json  ← kuratiert, wird nach public/ kopiert
│       │   ├── by-type/
│       │   ├── by-year/
│       │   └── by-vendor/
│       ├── options.json     ← Facettenindex für Dropdowns
│       └── masters.json     ← Stammdaten für /news/add Formular
├── docs/
│   ├── .vitepress/
│   │   ├── config.mjs
│   │   └── theme/
│   │       ├── index.js     ← Komponenten-Registrierung + badges.css-Import
│   │       ├── badges.css   ← Globale Badge-Styles
│   │       └── components/
│   │           ├── EventCard.vue
│   │           ├── EventFilter.vue
│   │           ├── EventDetailBadges.vue
│   │           ├── EventCreateForm.vue
│   │           └── EventStatusBadge.vue
│   │       └── composables/
│   │           └── useEventStatus.js
│   ├── news/
│   │   ├── index.md         ← Übersichtsseite (committet)
│   │   ├── add.md           ← YAML-Generator (committet)
│   │   └── *.md             ← statisch generiert, gitignored
│   └── public/
│       └── data/
│           └── _generated/  ← Kopien der Indizes (gitignored, Build-Output)
├── schemas/                 ← generierte JSON-Schemas für VS Code
├── scripts/
│   ├── schemas/
│   │   ├── base.mjs         ← IsoDateTime, Slug, EventStatus
│   │   ├── master.mjs       ← VendorSchema, ProductSchema, EventTypeSchema
│   │   └── content.mjs      ← alle Event-Schemas + getSchemaForType()
│   ├── utils.mjs            ← readYamlFiles(), validateWithZod()
│   ├── validate-master-data.mjs
│   ├── validate-content.mjs
│   ├── build-content-index.mjs
│   ├── build-detail-pages.mjs
│   ├── build-feed.mjs
│   └── generate-json-schemas.mjs
├── .gitignore
├── .github/workflows/deploy.yml
└── package.json
```

---

## Skripte -- Zweck und Zusammenspiel

| Script (npm run) | Datei | Zweck |
|---|---|---|
| `validate:master` | `validate-master-data.mjs` | Stammdaten: Pflichtfelder, ID-Eindeutigkeit, Referenzintegrität |
| `validate:content` | `validate-content.mjs` | Events: Zod-Schema, IDs, Slugs, Stammdaten-Referenzen, Relations |
| `build:index` | `build-content-index.mjs` | JSON-Indizes + options.json + masters.json erzeugen |
| `build:pages` | `build-detail-pages.mjs` | docs/news/*.md statisch generieren (liest all.json) |
| `build:feed` | `build-feed.mjs` | docs/public/feed.xml erzeugen (liest all.json) |
| `generate:schemas` | `generate-json-schemas.mjs` | JSON-Schemas aus Zod für VS Code-Validierung |
| `docs:dev` | vitepress | Entwicklungsserver |
| `docs:build` | vitepress | Produktions-Build |

---

## Transformationslogik: Datenfluss

```
YAML-Quelldateien
    ↓ readYamlFiles() + Zod-Validierung
Vollständige Event-Objekte (allEventsFull)
    ↓ sortDate berechnen
    ↓ isCustomerActionRequired berechnen
    ↓ hasRelations berechnen
    ↓ Stammdaten auflösen (vendor, products, eventType)
    ↓
Ausgabe 1: data/_generated/index/all.json
           → vollständig, alle Felder, nur intern
           → Eingabe für build-detail-pages.mjs und build-feed.mjs

Ausgabe 2: slim(event) -- detailsMd, customerActionMd, relations entfernt
           → data/_generated/index/latest.json  (kuratiert, nach public/)
           → data/_generated/index/by-type/*.json (nach public/)
           → data/_generated/index/by-year/*.json (nach public/)
           → data/_generated/index/by-vendor/*.json (nach public/)

Ausgabe 3: data/_generated/options.json
           → Facettenindex: Typen und Hersteller mit mindestens einem Event
           → nach public/ kopiert, für EventFilter-Dropdowns

Ausgabe 4: data/_generated/masters.json
           → alle Stammdaten für /news/add Formular
           → nach public/ kopiert
```

### sortDate -- fachlicher Sortierschlüssel

`sortDate` bestimmt die Reihenfolge in allen Indizes und in welchem Jahresindex
ein Event landet:

- **maintenance**: `sortDate` = `eventDate` (wann das Event Wirkung entfaltet)
- **alle anderen**: `sortDate` = `publishedAt`

Eine Wartung die am 15.12.2026 angekündigt wird aber am 15.03.2027 stattfindet,
landet in `by-year/2027.json` -- nicht in `2026.json`. Das ist fachlich gewollt:
das Archivjahr entspricht der tatsächlichen Auswirkung.

## Kuratierte latest.json -- Prioritätslogik

`latest.json` ist keine zeitliche Scheibe, sondern eine priorisierte Auswahl der aktuell relevanten Events.

Alle Einträge unterliegen einer einheitlichen Zeitbegrenzung. Historische Daten werden ausschließlich über die Jahresindizes (`by-year`) abgebildet.

### Grundprinzip

- Keine Eventklasse besitzt eine unbegrenzte Historienaufnahme
- Alle nicht-zukünftigen Events werden zeitlich gleich behandelt
- `latest.json` ist eine kuratierte UI-Ansicht, kein Archiv

### Zeitliche Begrenzung

Alle vergangenen Events (unabhängig vom Typ) werden auf ein festes Zeitfenster begrenzt:

- **Maximalalter:** 2 Jahre (`MS_2_YEARS`)
- Grundlage: `sortDate` (Maintenance, Security, Release, Announcement gleichermaßen)

---

## Struktur von latest.json

| Priorität | Inhalt | Limit |
|---|---|---|
| P1 | Zukünftige Wartungen | Kein hartes Limit (sortiert nach eventDate) |
| P2 | Alle Events der letzten 2 Jahre (Maintenance + Non-Maintenance) | Globales Limit: MAX_TOTAL (z. B. 200) |

### Sortierlogik

1. Zukünftige Maintenance-Events werden nach `eventDate` aufsteigend sortiert
2. Alle übrigen Events werden nach `sortDate` (global absteigend) sortiert
3. Zusammenführung erfolgt in einer gemeinsamen priorisierten Liste
4. Duplikate werden entfernt (über `id`)
5. Begrenzung auf `MAX_TOTAL`

### Architekturhinweis

- Vergangene Maintenance-Events werden **nicht separat behandelt**
- Sie folgen exakt denselben Regeln wie alle anderen historischen Events
- Die langfristige Historie ist ausschließlich in `by-year` enthalten

---

## Feed-Logik

Der Feed basiert auf `all.json` (nicht `latest.json`) und ist unabhängig
von der UI-Startansicht:

- **Wartungen**: zukünftige + kurzfristige (Vorlauf < 4 Wochen, letzte 7 Tage)
- **Alle anderen**: letzte 2 Jahre nach `publishedAt`
- Sortierung: nach `publishedAt` absteigend (RSS-Erwartung)
- Max. 50 Einträge
- Kein `<lastBuildDate>` in `<item>`-Blöcken (RSS 2.0 -- Channel-Level-Feld)

---

## Frontend-Architektur

### Drei getrennte Datensichten

```
A) all.json (intern)      → build-detail-pages.mjs, build-feed.mjs
B) Browserindizes         → EventFilter.vue (Lazy Loading)
C) Statische Seiten       → docs/news/<slug>.md (VitePress rendert)
```

### EventFilter -- Lazy Loading Strategie

| Filter-Kombination | Geladener Index |
|---|---|
| Kein Filter | `latest.json` |
| Nur Typ | `by-type/<type>.json` |
| Nur Hersteller | `by-vendor/<vendor>.json` |
| Typ + Hersteller | `by-type/<type>.json`, Hersteller clientseitig gefiltert |

Geladene Indizes werden in einer `Map` gecacht -- kein doppeltes Laden.

`options.json` wird beim Start parallel zu `latest.json` geladen und enthält
alle verfügbaren Filter-Optionen unabhängig vom aktuell geladenen Subset.
Das verhindert "verschwindende" Typen in Dropdowns.

### Badge-System

Badge-Styles sind global in `badges.css` definiert (nicht scoped):

| Klasse | Verwendung |
|---|---|
| `.vp-badge` | Basis für alle Badges |
| `.vp-badge-type-<typeId>` | Event-Typ (nur im Formular) |
| `.vp-badge-status-<status>` | Maintenance-Status |
| `.vp-badge-impact-<impact>` | Impact-Badges |

EventCard und EventDetailBadges verwenden Inline-Style für Typ-Farben
(kommt dynamisch aus den Stammdaten). EventCreateForm verwendet CSS-Klassen
aus `badges.css`.

### Markdown-Rendering

- `EventCard.vue`: `marked.parseInline()` für `summaryMd` (kein `<p>`-Wrapper)
- `EventCreateForm.vue`: `marked.parseInline()` für `summaryMd`, `marked.parse()` für `detailsMd` und `customerActionMd`
- Statische Detailseiten (`docs/news/*.md`): VitePress rendert Markdown direkt
- DOMPurify: TODO -- noch nicht integriert (geplant als separater Schritt)

---

## JSON-Schema-Generierung für VS Code

`scripts/generate-json-schemas.mjs` erzeugt JSON-Schemas aus den Zod-Schemas.
Zod v4 hat `z.toJSONSchema()` nativ eingebaut -- kein externes Paket nötig.
Die Schemas in `schemas/` werden in VS Code für YAML-Autocompletion und
Inline-Validierung verwendet.

---

## Designentscheidungen

Siehe [DECISIONS.md](./DECISIONS.md) für begründete Architekturentscheidungen.
