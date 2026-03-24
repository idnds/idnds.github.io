# lieblingsplatz.cloud

Offizielle Dokumentation und Informationsseite für „lieblingsplatz.cloud“ – Die ELO ECM Suite als Software as a Service in der Partner Managed Cloud der id-netsolutions Digital Solutions GmbH.

Die Seite wird mit **VitePress** erstellt und über **GitHub Pages** als Organisationsseite (`idnds.github.io`) veröffentlicht.

## 📝 Inhaltsverzeichnis

- [Technologien](#technologien)  
- [Projektstruktur](#projektstruktur)  
- [Installation & Entwicklung](#installation--entwicklung)  
- [Build & Vorschau](#build--vorschau)  
- [Deployment](#deployment)  
- [Custom Domain](#custom-domain)  
- [Konfiguration](#konfiguration)  
- [Support](#support)  

## Technologien

- [VitePress](https://vitepress.vuejs.org/) – statische Seite  
- [Vue](https://vuejs.org/) – für Komponenten  
- Node.js (Version ≥ 24 empfohlen)  
- GitHub Actions – automatisches Deployment auf GitHub Pages

## Projektstruktur

```text
docs/
├─ .vitepress/           # VitePress Konfiguration
│  ├─ config.mjs         # Site-Konfiguration
│  └─ public/            # Statische Assets (Favicons, Logos, Bilder)
├─ [diverse Unterseiten/]
└─ index.md              # Startseite
```

## Installation & Entwicklung

1. Repository klonen:

```bash
git clone https://github.com/idnds/idnds.github.io.git
cd idnds.github.io
```

1. Node.js Version prüfen (≥ 24 empfohlen):

```bash
node -v
```

1. Abhängigkeiten installieren:

```bash
npm ci
```

1. Lokalen Entwicklungsserver starten:

```bash
npm run docs:dev
```

- Seite lokal erreichbar unter `http://localhost:5173`

## Build & Vorschau

- Build für Produktion:

```bash
npm run docs:build
```

- Vorschau lokal:

```bash
npm run docs:serve
```

## Deployment

- Automatisches Deployment erfolgt über GitHub Actions (`.github/workflows/deploy.yml`)  
- Ziel: GitHub Pages Organisationsseite (`idnds.github.io`)  

**Hinweis:** Die Actions übernehmen automatisch den Upload des `docs/.vitepress/dist` Verzeichnisses.

## Custom Domain

- Domain: `lieblingsplatz.cloud`  
- Subdomain: `www.lieblingsplatz.cloud` → per CNAME auf Root weitergeleitet  
- DNS-Einträge:
  - Root: A/AAAA Records auf GitHub Pages IPs  
  - Subdomain: CNAME → `lieblingsplatz.cloud`  
- Base Path in `config.mjs`:

```ts
export default defineConfig({
  base: '/',
})
```

- HTTPS wird von GitHub Pages automatisch aktiviert  
- Alte URL `idnds.github.io` leitet automatisch auf die Custom Domain weiter

## Konfiguration

- **Logo & Favicon**: `docs/.vitepress/public/`  
- **Navigation & Sidebar**: `docs/.vitepress/config.mjs`  
- **Dark Mode deaktivieren**:

```ts
themeConfig: {
  appearance: false
}
```

- **Outline Überschrift auf Deutsch**:

```ts
themeConfig: {
  outline: { label: 'Auf dieser Seite' }
}
```

- **Sidebar automatisch aus Unterordnern generieren** → entsprechende `sidebar` Konfiguration in `config.mjs`

## Event-Management

Erweiterung der VitePress-Dokumentation mit einem strukturierten Event-Management für technische Ankündigungen wie Wartungen, Security-Hinweise, Releases und allgemeine Mitteilungen.

### Wichtige Skripte

- `npm run new:event` – legt interaktiv ein neues Event an
- `npm run validate:content` – prüft Event-Inhalte auf Konsistenz und Vollständigkeit
- `npm run validate:master` – prüft die Stammdaten für Hersteller und Produkte
- `npm run build:index` – generiert einen JSON-Index für Events
- `npm run build:feed` – erstellt den Feed für Events
- `npm run generate:schemas` – generiert Zod-Schemas zur Validierung

### Event-Dateien und YAML-Struktur

#### Dateinamenskonvention

Alle Event-Dateien folgen einer festen Benennung nach dem Muster:

`DATE-product-shortname`

Beispiel:

`2026-03-23-lpc-prod-operator-update.yaml`

Die Event-ID bzw. der Slug folgt diesem Aufbau:

`<type>-DATE-product-shortname`

Beispiel:

`maintenance-2026-03-23-lpc-prod-operator-update`

#### Event-Typen

Zulässige Event-Typen sind:

- `maintenance`
- `security`
- `release`
- `announcement`

Das Feld `status` ist nur für Events vom Typ `maintenance` relevant. Zulässige Werte sind:

- `active`
- `cancelled`

#### YAML-Felder

Pflichtfelder:

- `id`
- `slug`
- `typeId`
- `vendorId`
- `productIds`
- `title`
- `publishedAt`

Pflichtfelder für Event-Typ `maintenance`

- `eventDate`
- `endDate`

Optionale Felder:

- `summaryMd`
- `detailsMd`
- `version`
- `changelogUrl`
- `relatedEventIds`

### Interaktives Event-Scaffolding

Neue Events werden über `npm run new:event` interaktiv angelegt.

Dabei gilt:

- Eine **Produktauswahl erfolgt immer**.
- Der **Hersteller wird nur abgefragt**, wenn er nicht eindeutig aus dem Produkt abgeleitet werden kann.
- Für Produkte und Hersteller wird eine **Fuzzy-Suche** verwendet.
- Zuerst erfolgt eine Eingabe, danach werden passende Vorschläge angezeigt.
- Eingaben ohne Treffer werden **nicht automatisch übernommen**.
- Stattdessen kann erneut gesucht oder ein neuer Eintrag angelegt werden.
- Es erscheinen Warnungen, wenn Produkt oder Hersteller noch nicht in den Stammdaten vorhanden sind.

Nach dem Anlegen eines Events sollte die Datei direkt geöffnet, alle `TODO`-Felder ergänzt und anschließend die Validierung ausgeführt werden.

### Frontend: EventCard und Detailansicht

#### EventCard.vue

Die Kartenansicht zeigt die wichtigsten Informationen eines Events in kompakter Form:

- Typ
- Status bei `maintenance`
- Titel
- Zusammenfassung aus `summaryMd`
- zugehörige Produkte als Badges

Ein Klick auf die Karte öffnet die Detailansicht im Modal.

#### EventCardModal.vue

Die Detailansicht stellt vollständige Event-Informationen in einem Modal dar:

- Typ
- Hersteller
- Produkte als visuelle Badges
- Version und Changelog in einer gemeinsamen Zeile, z. B. `Version: 1.18.0 (Changelog)`
- Details aus `detailsMd`

Die Details werden als vorformatierter Text dargestellt:

- Monospace-Schrift
- Zeilenumbruch nur an Leerzeichen
- lange Wörter werden nicht erzwungen umgebrochen
- URLs dürfen umbrechen

Das Modal kann auf drei Arten geschlossen werden:

- über den Button **„Schließen“**
- über das **X** in der Kopfzeile
- über die üblichen Fokus- und Interaktionsmechanismen der Oberfläche

#### Darstellung und Styling

Für die UI gelten folgende Konventionen:

- Modal zentriert mit maximal 80 % Höhe
- scrollbar bei langen Inhalten
- Produkt-Badges mit sichtbarer Border
- Version/Changelog direkt unter dem Hersteller ohne zusätzlichen Absatz
- dezente Hover- und Fokus-Effekte

### Validierung und Konsistenz

#### `validate:content.mjs`

Dieses Skript prüft insbesondere:

- Vorhandensein aller Pflichtfelder
- Konsistenz zwischen Hersteller und Produkten
- Datumslogik, insbesondere Start- und Enddatum

#### `validate:master-data.mjs`

Dieses Skript prüft:

- Existenz von Herstellern in den Stammdaten
- Existenz von Produkten in den Stammdaten

Fehler und Warnungen werden jeweils klar und nachvollziehbar ausgegeben.

### Index und Feed

`build-content-index.mjs` erzeugt einen JSON-Index, der nach Typ und Jahr strukturiert ist.

`build-feed.mjs` erzeugt einen Feed für aktuelle Events.

Diese Struktur bildet die Grundlage für Frontend-Suche, Filterung und Feed-Ausgabe.

## Support

- Projektleiter: [Tobias Kral](https://github.com/Inte) (Technical Consulting, [IDNDS](https://idnds.de))

## Lizenz

Dieses Projekt steht unter der [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](LICENSE).
