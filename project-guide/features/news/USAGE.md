# NEWS-USAGE.md -- Events erstellen und pflegen

## Zielgruppen

Dieses Dokument richtet sich an:

- **Content-Ersteller**: Redakteure die neue Events erfassen
- **Maintainer**: Entwickler die Pull Requests prüfen und mergen

---

## Für Content-Ersteller

### Weg A: Webformular (empfohlen)

Öffne `https://lieblingsplatz.cloud/news/add` im Browser.

1. Event-Typ wählen (Ankündigung / Wartung / Release / Security)
2. Produkt aus der Dropdown-Liste wählen -- Hersteller wird automatisch gesetzt
3. Titel und Kurzname eingeben
4. Datum und Zeit setzen
5. Zusammenfassung und Details eingeben (Markdown-Vorschau erscheint rechts)
6. Impact-Checkboxen setzen falls relevant
7. "YAML generieren" klicken
8. Datei herunterladen

**Dateiname der heruntergeladenen Datei:**
```
YYYY-MM-DD-<productId>-<kurzname>.yaml
```

**Ablegen im Repository:**
```
data/content/<typeId>/<Jahr>/YYYY-MM-DD-<productId>-<kurzname>.yaml
```

Pull Request öffnen -- ein Maintainer prüft und merged.

---

### Weg B: YAML manuell erstellen

```bash
npm run new:event -- --type maintenance --vendor idnds --product lpc-prod --name wartung-april
```

Das Skript erzeugt eine YAML-Vorlage im richtigen Ordner mit allen Pflichtfeldern
als TODO-Platzhalter. Anschließend die TODOs durch echte Inhalte ersetzen.

---

### Pflichtfelder nach Event-Typ

**Alle Typen:**

| Feld | Beschreibung | Beispiel |
|---|---|---|
| `id` | Automatisch generiert | `maintenance-2026-03-24-lpc-prod-update` |
| `slug` | Identisch mit id | `maintenance-2026-03-24-lpc-prod-update` |
| `typeId` | Event-Typ | `maintenance` |
| `vendorId` | Hersteller-ID | `idnds` |
| `productIds` | Liste der Produkte | `[lpc-prod]` |
| `title` | Titel (mind. 3 Zeichen) | `Wartungsfenster März 2026` |
| `publishedAt` | ISO-Datum | `2026-03-01T10:00:00+01:00` |
| `summaryMd` | Kurzbeschreibung | `Geplantes Wartungsfenster...` |

**Zusätzlich bei `maintenance`:**

| Feld | Beschreibung |
|---|---|
| `eventDate` | Beginn des Wartungsfensters |
| `endDate` | Ende (muss nach eventDate liegen) |

**Zusätzlich bei `release`:**

| Feld | Beschreibung |
|---|---|
| `version` | Versionsnummer, z.B. `1.18.0` |

---

### Optionale Felder

| Feld | Verwendung |
|---|---|
| `updatedAt` | Nachträgliche Aktualisierung (nicht vor publishedAt) |
| `detailsMd` | Ausführliche Beschreibung mit vollem Markdown |
| `impact` | `downtime`, `limited-availability`, `action-required` |
| `customerActionMd` | Handlungshinweise (nur wenn impact action-required) |
| `relations` | Verknüpfungen zu anderen Events |

### Vollständiges Beispiel (Maintenance)

```yaml
id: maintenance-2026-03-24-lpc-prod-operator-update
slug: maintenance-2026-03-24-lpc-prod-operator-update
typeId: maintenance
vendorId: idnds
productIds:
  - lpc-prod
title: Operator-Update lieblingsplatz.cloud Produktion
publishedAt: "2026-03-01T10:00:00+01:00"
eventDate: "2026-03-24T20:00:00+01:00"
endDate: "2026-03-24T22:00:00+01:00"
status: active
summaryMd: |
  Geplantes Wartungsfenster für das **Operator-Update** auf der Produktionsumgebung.
detailsMd: |
  ## Ablauf

  - 20:00 Uhr: Beginn der Wartung
  - 20:15 Uhr: Einspielung des Updates
  - 22:00 Uhr: Ende der Wartung (geplant)
impact:
  - downtime
relations: []
```

---

### Event ändern

1. YAML-Datei in `data/content/<typeId>/<Jahr>/` direkt bearbeiten
2. Falls inhaltlich relevant: `updatedAt` auf aktuelles ISO-Datum setzen
3. `npm run validate:content` ausführen
4. Pull Request öffnen

---

### Validierung ausführen

```bash
npm run validate:content
```

Bei Fehlern erscheint eine genaue Fehlermeldung mit Dateiname und Problem.
Bei veralteten Feldern (`relatedEventIds`, `downtimeMinutes`, `isCustomerActionRequired`)
erscheinen Warnungen -- diese Felder können automatisch migriert werden:

```bash
node scripts/migrate-events.mjs
```

---

### Typische Fehler

| Fehler | Ursache | Lösung |
|---|---|---|
| `ID darf nicht leer sein` | `id`-Feld fehlt oder leer | ID muss gesetzt sein |
| `Doppelte Event-ID` | ID existiert bereits | Kurzname im Dateinamen anpassen |
| `Unbekannte vendorId` | Hersteller nicht in Stammdaten | `data/master/vendors/<id>.yaml` anlegen |
| `endDate muss nach eventDate liegen` | Zeitraum falsch | Daten korrigieren |
| `impact muss action-required enthalten` | `customerActionMd` ohne passenden Impact | `impact: [action-required]` ergänzen |
| `relations.eventId nicht gefunden` | Referenz auf nicht-existentes Event | ID prüfen oder Relation entfernen |
| `Dateiname muss mit YYYY-MM-DD- beginnen` | Falsches Dateinamenformat | Datei umbenennen |

---

## Für Maintainer

### PR-Checkliste

Vor dem Merge eines Event-PRs prüfen:

```bash
# 1. Validierung
npm run validate:master
npm run validate:content

# 2. Build
npm run build:index
npm run build:pages
npm run build:feed

# 3. Visuell prüfen
npm run docs:dev
# → http://localhost:5173/news/ (Karte erscheint korrekt)
# → http://localhost:5173/news/<slug> (Detailseite)
```

### Neues Produkt anlegen

```yaml
# data/master/products/<productId>.yaml
productId:   neues-produkt
vendorId:    idnds
name:        Neues Produkt
category:    SaaS
description: Beschreibung
```

### Neuen Hersteller anlegen

```yaml
# data/master/vendors/<vendorId>.yaml
vendorId:    neuer-hersteller
name:        Neuer Hersteller GmbH
website:     https://...
description: Beschreibung
```

### Hersteller oder Produkt deprecaten

Das `deprecatedAt`-Feld setzen:

```yaml
deprecatedAt: "2026-12-31T00:00:00+01:00"
```

Deprecated Einträge tauchen nicht mehr in Filter-Dropdowns auf, aber bestehende
Events bleiben gültig und werden weiterhin angezeigt.

### Relations pflegen

Relations sind unidirektional in der YAML -- bidirektionale Verknüpfungen
können später im Build berechnet werden ohne YAML-Änderungen.

Erlaubte Relationstypen:
- `relates-to` -- allgemeine inhaltliche Verbindung
- `resolves` -- dieses Event behebt das referenzierte Event
- `follow-up-to` -- dieses Event folgt auf das referenzierte Event
- `supersedes` -- dieses Event ersetzt das referenzierte Event
