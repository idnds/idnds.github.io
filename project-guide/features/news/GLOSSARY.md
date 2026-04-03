# GLOSSARY.md -- Begriffe und Definitionen

| Begriff | Bedeutung |
|---|---|
| **Event** | Ein einmaliger Eintrag (Wartung, CVE, Release, Ankündigung) |
| **typeId** | Typ eines Events: `maintenance`, `security`, `release`, `announcement` |
| **vendorId** | Eindeutige ID eines Herstellers, z.B. `cisco`, `idnds` |
| **productId** | Eindeutige ID eines Produkts, z.B. `lpc-prod`, `loadmaster` |
| **Stammdaten** | Hersteller, Produkte und Event-Typen -- ändern sich selten |
| **Content** | Die eigentlichen Event-Einträge als YAML-Dateien |
| **slug** | URL-sicherer Bezeichner, identisch mit `id`, z.B. `maintenance-2026-03-24-lpc-prod-update` |
| **sortDate** | Fachlicher Sortierschlüssel: `eventDate` für Maintenance, `publishedAt` für alle anderen |
| **publishedAt** | Wann das Event veröffentlicht/angekündigt wurde (ISO 8601) |
| **eventDate** | Wann ein Maintenance-Event tatsächlich stattfindet |
| **endDate** | Ende eines Maintenance-Fensters |
| **updatedAt** | Letzte inhaltliche Aktualisierung (optional, nicht vor publishedAt) |
| **impact** | Fachliche Auswirkungen: `downtime`, `limited-availability`, `action-required` |
| **summaryMd** | Kurzbeschreibung in Markdown (nur Inline-Formatierungen) |
| **detailsMd** | Ausführliche Beschreibung (vollständiges Markdown) |
| **customerActionMd** | Handlungshinweise (nur wenn `impact: [action-required]`) |
| **relations** | Typisierte Verknüpfungen zwischen Events |
| **slim** | Version eines Event-Objekts ohne große Felder (detailsMd, customerActionMd, relations) |
| **all.json** | Vollständiger Event-Index, nur intern für Build-Skripte |
| **latest.json** | Kuratierte Startmenge für EventFilter, nach docs/public/ kopiert |
| **options.json** | Facettenindex für Filter-Dropdowns (Typen, Hersteller) |
| **masters.json** | Stammdaten-Export für das /news/add-Formular |
| **sortDate** | Berechnetes Sortierfeld: eventDate (maintenance) oder publishedAt (andere) |
| **hasRelations** | Boolean-Feld in Übersichtsindizes, ob das Event Relations hat |
| **isCustomerActionRequired** | Berechnetes Boolean aus `impact.includes("action-required")` |
| **EventCard** | Vue-Komponente für die kompakte Darstellung eines Events in der Übersicht |
| **EventFilter** | Vue-Komponente für die filterbare Übersichtsseite |
| **EventDetailBadges** | Vue-Komponente für Badges auf statischen Detailseiten |
| **EventCreateForm** | Vue-Komponente für den YAML-Generator unter /news/add |
| **useEventStatus** | Vue-Composable: berechnet Status (planned/ongoing/completed/cancelled) aus eventDate/endDate |
| **vp-badge** | CSS-Basisklasse für Badges (in badges.css, nicht scoped) |
| **deprecatedAt** | Feld auf Stammdaten: gesetzt = taucht nicht mehr in Filtern auf |
| **Lazy Loading** | Indizes werden erst geladen wenn sie durch Filter-Auswahl benötigt werden |
| **Index-Cache** | Map im Browser: verhindert doppeltes Laden derselben JSON-Datei |
| **P1 / P2 / P3** | Prioritätsgruppen für latest.json-Kuratierung |
| **Feed** | RSS 2.0-Feed unter /feed.xml, unabhängig von latest.json |
| **Pagefind** | Volltextsuche-Bibliothek, indiziert das fertige HTML nach dem VitePress-Build |
| **scaffold-event** | CLI-Skript zum Anlegen neuer Event-Vorlagen |
| **IsoDateTime** | Zod-Typ für ISO-8601-Datumstrings mit Zeitzone |
