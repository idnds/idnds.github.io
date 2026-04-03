# DECISIONS.md -- Architekturentscheidungen

Dieses Dokument hält begründete Architekturentscheidungen fest.
Format: ADR-ähnlich (Kontext → Entscheidung → Begründung).

---

## ADR-001: Kein Modal -- Details über statische Seiten

**Kontext:** Events sollten ursprünglich in einem Modal geöffnet werden.

**Entscheidung:** Kein Modal. Klick auf "Details" öffnet direkt `/news/<slug>`.

**Begründung:** Statische Detailseiten sind von Pagefind indizierbar,
verlinkbar (aus E-Mails, RSS-Feed), bookmarkbar und SSR-kompatibel.
Ein Modal kann keine kanonische URL haben.

---

## ADR-002: `isCustomerActionRequired` wird berechnet, nicht gepflegt

**Kontext:** Das ursprüngliche Konzept sah `isCustomerActionRequired: true/false` als eigenes YAML-Feld vor.

**Entscheidung:** Das Feld existiert nicht in YAML. Es wird aus `impact` berechnet:
```js
const customerActionRequired = event.impact?.includes("action-required") ?? false;
```

**Begründung:** Zwei Felder die denselben Sachverhalt beschreiben erzeugen Inkonsistenz.
Eine einzige Quelle (`impact`) mit einer abgeleiteten Größe ist robuster.

---

## ADR-003: `sortDate` als fachlicher Sortierschlüssel

**Kontext:** Events wurden global nach `publishedAt` sortiert. Ein Wartungsfenster
das in 3 Wochen stattfindet aber heute angekündigt wird, erschien daher "oben"
(wegen publishedAt = heute), obwohl ein in 2 Wochen liegendes Fenster
fachlich relevanter wäre.

**Entscheidung:** `sortDate` = `eventDate` für Maintenance, `publishedAt` für alle anderen.
`by-year/` verwendet das Jahr von `sortDate` (Wartungen landen im Durchführungsjahr).

**Begründung:** Für Wartungen ist der Zeitpunkt der Auswirkung (eventDate) relevant,
nicht der Ankündigungszeitpunkt. Für alle anderen Typen ist publishedAt korrekt.

---

## ADR-004: `all.json` nicht nach docs/public/ kopieren

**Kontext:** all.json enthält alle Events mit allen Feldern (inkl. detailsMd,
customerActionMd, relations). Bei 5000 Events mit langen Markdown-Feldern
könnte das mehrere Megabyte groß werden.

**Entscheidung:** all.json wird nie nach docs/public/ kopiert. Der Browser
kann all.json nie laden.

**Begründung:** Browser soll niemals den vollständigen Bestand laden
(Grundprinzip "Niemals alles laden"). all.json wird nur von Build-Skripten
(build-detail-pages.mjs, build-feed.mjs) verwendet.

---

## ADR-005: `options.json` als Facettenindex für Dropdowns

**Kontext:** Filter-Dropdowns wurden ursprünglich aus dem geladenen
`events.value`-Array berechnet. Wenn `latest.json` keine Security-Events
enthielt, verschwand "Security" aus dem Typ-Dropdown.

**Entscheidung:** `options.json` wird beim Build aus den Stammdaten erzeugt
und enthält alle Typen und Hersteller die mindestens ein Event haben.
EventFilter lädt `options.json` beim Start parallel zu `latest.json`.

**Begründung:** Filteroptionen sollen vollständig sein, unabhängig davon
was gerade in der angezeigten Teilmenge vorkommt. UX-Prinzip: Filter verschwinden
nicht unerwartet.

`options.json` ist kein Ersatz für Stammdaten und nicht für Detailseiten gedacht.

---

## ADR-006: `latest.json` fachlich kuratiert, nicht zeitlich gefiltert

**Kontext:** Ursprünglich war `latest.json` eine pauschale 90-Tage-Zeitscheibe.
Ein Wartungsfenster in 12 Wochen wäre damit ausgeblendet.

**Entscheidung:** Drei Prioritätsgruppen:
1. P1 (immer): Kurzfristige Wartungen (Vorlauf < 4 Wochen)
2. P2 (max. 6): Zukünftige Wartungen
3. P3 (max. 150): Nicht-Wartungs-Events der letzten 90 Tage

P1 kann durch kein Limit verdrängt werden.

**Begründung:** latest.json ist die Startansicht für Kunden. Diese soll zeigen
was gerade relevant ist -- nicht was zufällig in einem Zeitfenster liegt.

---

## ADR-007: Feed unabhängig von latest.json

**Kontext:** Der RSS-Feed basierte ursprünglich auf latest.json.

**Entscheidung:** Feed liest all.json und hat eigene Selektionslogik.
Feed und UI-Startansicht teilen dieselbe Datenbasis aber dürfen nicht
voneinander abhängen.

**Begründung:** Feed und UI haben unterschiedliche Anforderungen.
Feed = vollständige, abonnierbare Information.
UI = performante, bedienbare Startansicht.
RSS-Abonnenten erwarten Wartungen in der Zukunft im Feed zu sehen.

---

## ADR-008: Markdown-Rendering ohne DOMPurify (vorläufig)

**Kontext:** marked erzeugt HTML das mit `v-html` in den DOM eingefügt wird.
DOMPurify würde schadhaftes HTML bereinigen.

**Entscheidung:** DOMPurify ist noch nicht integriert (TODO).

**Begründung:** YAML-Inhalte kommen von authentifizierten Redakteuren via
Pull Request -- kein unbekannter Fremdinput. Das Risiko ist akzeptabel für die
aktuelle Phase. DOMPurify wird in einem separaten Schritt ergänzt.

---

## ADR-009: Statische Detailseiten statt dynamischem Routing

**Kontext:** Detailseiten könnten über VitePress Dynamic Routes
(`/news/[slug].md`) realisiert werden.

**Entscheidung:** `build-detail-pages.mjs` erzeugt für jedes Event eine
statische `.md`-Datei in `docs/news/`.

**Begründung:** Statische Seiten sind von Pagefind indizierbar, haben stabile
URLs und benötigen keine Client-seitige Routing-Logik.
Die generierten Dateien sind in `.gitignore` und werden bei jedem Build
neu erzeugt.

---

## ADR-010: `<lastBuildDate>` nur im RSS-Channel, nicht in Items

**Kontext:** Ursprünglicher Entwurf setzte `<lastBuildDate>` pro Item um
`updatedAt` abzubilden.

**Entscheidung:** `<lastBuildDate>` ist ein RSS 2.0 Channel-Level-Feld.
Es wird nur einmal im `<channel>`-Block gesetzt, nicht in `<item>`-Blöcken.
Item-Level-Änderungszeitstempel würden Atom (`<updated>`) erfordern.

**Begründung:** RSS 2.0-Spezifikation. Falsch platzierte Felder können
Feed-Reader irritieren.
