# Lieblingsplatz.cloud -- News & Informationsplattform

Offizielle Dokumentations- und Informationsseite für **Lieblingsplatz.cloud** --
die ELO ECM Suite als Software as a Service in der Partner Managed Cloud der
id-netsolutions Digital Solutions GmbH (IDNDS).

## Zweck

Die Seite informiert Kunden und Partner über:

- Informationen zur Lieblingsplatz.cloud
- Geplante Wartungsfenster und Downtimes
- Sicherheitslücken und CVE-Meldungen (Security)
- Software-Releases und Versionsupdates
- Allgemeine Ankündigungen

## Hauptfunktionen

- **Strukturierte News**: Alle Events werden als typisierte YAML-Dateien erfasst und automatisch validiert
- **Filterbare Übersicht** unter `/news/` mit Typ-, Hersteller-, Status- und Impact-Filter
- **Detailseiten** für jedes Event unter `/news/<slug>`
- **RSS-Feed** unter `/feed.xml` für Abonnenten
- **YAML-Generator** unter `/news/add` für Redakteure ohne YAML-Kenntnisse
- **Skalierungsarchitektur**: Lazy Loading und kuratierte Indizes für Performance bei großem Eventbestand

## Technologie-Stack

| Komponente | Paket / Version |
| --- | --- |
| Static Site Generator | VitePress ^1.6.4 |
| Frontend-Framework | Vue ^3.5.26 |
| Schema-Validierung | Zod ^4.3.6 |
| YAML-Parsing | js-yaml ^4.1.1 |
| Markdown-Rendering | marked (installiert) |
| Volltextsuche | pagefind ^1.4.0 |
| Deployment | GitHub Pages via GitHub Actions |

## Systemkontext

```text
Redakteur       → YAML-Datei erstellen (manuell oder über /news/add)
                → Git Push / Pull Request
                → GitHub Actions: Validierung → Build → Deploy
Endnutzer       → lieblingsplatz.cloud/news/ (EventFilter)
                → lieblingsplatz.cloud/news/<slug> (Detailseite)
RSS-Abonnent    → lieblingsplatz.cloud/feed.xml
```

## High-Level-Architektur

Das System folgt dem Prinzip **Build = Intelligenz, Frontend = Anzeige**:

1. YAML-Quelldateien in `data/` werden bei jedem Build validiert
2. Build-Skripte erzeugen optimierte JSON-Indizes in `docs/public/`
3. Statische Detailseiten werden als Markdown in `docs/news/` generiert
4. VitePress rendert alles zu statischem HTML
5. Pagefind indiziert das HTML für die Volltextsuche

Die vollständige Architektur der News ist in [ARCHITECTURE.md](./project-guide/features/news/ARCHITECTURE.md) beschrieben.

## Einstieg für neue Entwickler

1. [CONTRIBUTING.md](./project-guide/CONTRIBUTING.md) -- Setup und lokaler Workflow
2. [ARCHITECTURE.md](./project-guide/features/news/ARCHITECTURE.md) -- Technische Architektur
3. [USAGE.md](./project-guide/features/news/USAGE.md) -- Events erstellen und pflegen
4. [BUILD.md](./project-guide/BUILD.md) -- Build-Prozess und CI/CD

## Repository

- GitHub: <https://github.com/idnds/idnds.github.io>
- Live: <https://lieblingsplatz.cloud>
