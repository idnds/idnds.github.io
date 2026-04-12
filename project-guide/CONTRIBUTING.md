# CONTRIBUTING.md -- Entwicklungsumgebung und Workflow

## Voraussetzungen

| Tool | Version | Prüfbefehl |
| --- | --- | --- |
| Node.js | >= 24 | `node --version` |
| npm | >= 10 | `npm --version` |
| Git | beliebig | `git --version` |

## Installation

### Node.js

- [Download Node.js](https://nodejs.org/en/download)
- Windows spezifisch...
  - Administrative Powershell öffnen
  - Skriptausführung erlauben:

    ```powershell
    Set-ExecutionPolicy RemoteSigned
    ```

- Prüfung der installierten Version:

  ```powershell
  npm -v
  ```

### Repository klonen

```bash
git clone https://github.com/idnds/idnds.github.io.git
cd idnds.github.io
npm ci
```

`npm ci` installiert exakt die Pakete aus `package-lock.json` -- kein `npm install`,
das könnte Versionen verändern.

## Lokaler Dev-Workflow

### 1. Indizes erzeugen

Vor dem ersten Start und nach jeder YAML-Änderung:

```bash
npm run validate:master    # Stammdaten prüfen
npm run validate:content   # Event-YAMLs prüfen
npm run build:index        # JSON-Indizes + Detailseiten-Basis erzeugen
npm run build:pages        # docs/news/*.md statisch generieren
npm run build:feed         # RSS-Feed erzeugen
```

### 2. Entwicklungsserver starten

```bash
npm run docs:dev
# → http://localhost:5173
```

### 3. Neues Event anlegen

- Neues Event mittels Formular unter (<http://localhost:5173/news/add>) erstellen
- Ablage unter `data/content/<typeId>/YYYY-MM-DD-<productId>-<shortname>.yaml`
- Danach validieren, Indizes erzeugen, Seiten generieren und RSS-Feed erzeugen

## Build & Test lokal

```bash
# Vollständiger Build
npm run docs:build

# Lokale Vorschau des Build-Ergebnisses
npm run docs:serve
# → http://localhost:4173
```

## Konventionen

### YAML-Dateinamen

```text
data/content/<typeId>/<Jahr>/YYYY-MM-DD-<productId>-<shortname>.yaml
```

Beispiele:

```text
data/content/maintenance/2026/2026-03-24-lpc-prod-operator-update.yaml
data/content/security/2026/2026-03-01-loadmaster-cve-fix.yaml
```

- Dateiname beginnt **immer** mit ISO-Datum (`YYYY-MM-DD-`)
- Kein `typeId`-Präfix im Dateinamen (der Ordner macht den Typ eindeutig)
- Nur Kleinbuchstaben, Zahlen und Bindestriche

### IDs und Slugs

```text
<typeId>-YYYY-MM-DD-<productId>-<shortname>
```

Beispiel: `maintenance-2026-03-24-lpc-prod-operator-update`

ID und Slug sind identisch und global eindeutig über alle Event-Typen hinweg.

### Markdown-Felder

- `summaryMd`: nur Inline-Formatierungen (`**fett**`, `*kursiv*`, `` `code` ``), keine Block-Elemente
- `detailsMd`, `customerActionMd`: vollständiges Markdown (Listen, Überschriften, Tabellen)

### Commits

```text
feat: neues Event announcement-2026-03-28-lpc-prod-supportende
fix: falsche endDate in maintenance-2026-03-24
docs: README aktualisiert
chore: npm-Pakete aktualisiert
```

## Git-Workflow

```text
main          → produktiver Stand (nur via PR)
feature-events → aktiver Entwicklungs-Branch (News-System)
```

Für neue Features oder Bugfixes:

```bash
git checkout feature-events
git pull
git checkout -b fix/mein-bugfix
# ... Änderungen ...
git push -u origin fix/mein-bugfix
# Pull Request nach feature-events öffnen
```

Für neue Events direkt im `main`-Branch via PR:

```bash
git checkout -b event/maintenance-2026-04-15-lpc-prod-update main
# YAML erstellen, validieren
npm run validate:content
git add data/content/...
git commit -m "feat: Wartungsfenster 15. April 2026"
git push -u origin event/maintenance-2026-04-15-lpc-prod-update
```

## Do's & Don'ts

**Do:**

- Immer `npm run validate:content` vor dem Commit ausführen
- `npm ci` statt `npm install` für reproduzierbare Builds
- Fehlende Stammdaten (neuer Hersteller, neues Produkt) zuerst unter `data/master/` anlegen
- `customerActionMd` nur setzen wenn `impact: [action-required]` gesetzt ist

**Don't:**

- Nie `data/_generated/` committen (ist in `.gitignore`)
- Nie `docs/news/*.md` committen (automatisch generiert), außer `docs/news/index.md`
- Nie `all.json` nach `docs/public/` kopieren (enthält alle Events, zu groß für den Browser)
- Keine HTML-Tags direkt in YAML-Feldern
- Keine doppelten IDs oder Slugs (Validierung bricht den Build ab)
