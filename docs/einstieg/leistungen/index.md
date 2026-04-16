# Leistungen

Die Lieblingsplatz.cloud bietet ein modular aufgebautes Leistungsmodell, das sich flexibel an unterschiedliche Anforderungen und Nutzungsszenarien anpassen lässt.

Auf Basis eines stabilen Grundsystems können zusätzliche Erweiterungen und Optionen gezielt kombiniert werden, um sowohl wachsende Datenmengen als auch steigende Anforderungen an Performance, Sicherheit und Archivierung abzudecken.

Alle Leistungen sind darauf ausgelegt, einen sicheren, skalierbaren und langfristig stabilen Betrieb der ELO ECM Suite in der Cloud zu gewährleisten.

## Basispakete

### Plan ECM1: Basis {#plan-1}

#### Service inklusive

- **Service Desk:** Erreichbarkeit Montag-Freitag 08:00-17:00
- Sicherstellung eines aktuellen und sicheren Betriebszustands
- Durchführung von Plattform- und System-Updates (innerhalb der
Geschäftszeiten)
- Regelmäßige Updates der ELO ECM Suite Basis (mindestens 2x jährlich
innerhalb der Geschäftszeiten)
- Aktives Monitoring von Sicherheitslücken und zeitnahes Einspielen von
Sicherheitsupdates
- Monitoring und automatische Anpassung von Hardware-Ressourcen
(Erweiterung mit AddOn-Paketen)

#### Infrastruktur inklusive

- Aktuelle [LTS Version](/glossar/#lts) der ELO ECM Suite
- Eigene Sub-Domäne unter lieblingsplatz.cloud  
  z. B. `mein`.lieblingsplatz.cloud
- Abgesichert mit TLS-Zertifikat (HTTPS) zum gesicherten und vertrauenswürdigen Zugriff.
- Datenbank & Dokumentenarchiv
  - hochverfügbar
  - redundant
  - inkl. Datensicherung (14 Tage Vorhaltezeit)

### Plan ECM2: Staging {#plan-2}

- Die Umgebung für Test- und Entwicklungssysteme
- Zur Verprobung von Updates vor Produktivstellung
- Zum Test von Anpassungen und Entwicklungen
- Aktuelle [LTS Version](/glossar/#lts) der ELO ECM Suite
- Eigene Sub-Domäne unter lieblingsplatz.cloud  
  z. B. `mein-test`.lieblingsplatz.cloud
- Abgesichert mit TLS-Zertifikat (HTTPS) zum gesicherten und vertrauenswürdigen Zugriff.
- Datenbank & Dokumentenarchiv
  - hochverfügbar
  - redundant
  - inkl. Datensicherung (14 Tage Vorhaltezeit)
- Voraussetzung: [Lieblingsplatz Plan ECM1: Basis](./#plan-1)

## Backup

### Plan ECM10: DOKUbackup to Tape Basis {#plan-10}

Zuverlässige und langfristige Datensicherung auf [LTO-Tapes](/glossar/#lto), die zusätzlich extern ausgelagert werden. Dies stellt eine zusätzliche Sicherheitsschicht gegen Datenverlust dar.

Die Speicherung erfolgt als monatliche Vollsicherung mit einer Aufbewahrungszeit von 12 Monaten.

- **Monatliches Voll-Backup:** Einmal im Monat erstellen wir ein vollständiges Backup Ihrer Daten. Dieses Voll-Backup dient als Grundlage für Ihre Datenwiederherstellung im Falle eines Datenverlustes oder eines Systemversagens.
- **Offsite-Speicherung:** Um Datenverluste durch Vor-Ort-Katastrophen oder Ransomware-Angriffe auszuschließen, speichern wir die Sicherungsdaten in einer sicheren Offsite-Einrichtung.

Dies schützt Ihre wertvollen Daten auch vor physischen Schäden an Ihrem primären Speicherort.

### Plan ECM11: AddOn DOKUbackup to Tape {#plan-11}

- Bereitstellung des notwendigen Backupvolumes zur Tape-Auslagerung

## Erweiterungen

Alle AddOns können zur flexiblen Erweiterung mehrfach gebucht werden.

### Plan ECM20: AddOn Performance {#plan-20}

Leistungserweiterung der Umgebung zur Optimierung von Verarbeitung und Systemlast für den Betrieb von:

- ELO Business Solutions
- IDNDS Digital Solutions
- Automatisierungen
- individuellen Anpassungen

### Plan ECM21: AddOn Storage {#plan-21}

- Erweiterung der gesamten Speicherumgebung zur Aufnahme steigender Datenmengen
- Umfasst sowohl:
  - Verwaltungsdaten (z. B. Metadaten, Dokumentenbeziehungen, Historien und Workflow-Daten)
  - Dokumenten- und Archivspeicher
- Geeignet für Umgebungen mit hohem Datenaufkommen und aktiver Nutzung von Automatisierungen und Geschäftsprozessen

### Plan ECM23: AddOn Cold Storage {#plan-23}

- Erweiterung des Dokumenten- und Archivspeichers für selten genutzte oder historisierte Inhalte
- Optimiert für Systeme mit hohem Dokumentenvolumen, aber geringer Änderungs- und Workflowaktivität
- Keine Erweiterung der Kapazitäten für Verwaltungsdaten (z. B. Metadaten, Workflows oder Historien)
- Kosteneffiziente Langzeitablage

## Sicherheitsoptionen

Als Alternative zu den Standard-Storage-Paketen besteht die Möglichkeit die Daten im Ruhezustand mit einer Verschlüsselung abzusichern.

### Plan ECM22: AddOn Storage (encrypted) {#plan-22}

- Erweiterung der gesamten Speicherumgebung zur Aufnahme steigender Datenmengen mit **aktivierter Verschlüsselung gespeicherter Daten (Data at Rest)**
- Schutz sensibler Inhalte durch Verschlüsselung im Ruhezustand
- Umfasst sowohl:
  - Verwaltungsdaten (z. B. Metadaten, Dokumentenbeziehungen, Historien und Workflow-Daten)
  - Dokumenten- und Archivspeicher
- Geeignet für Umgebungen mit wachsendem Datenvolumen und aktiver Nutzung von Automatisierungen und Geschäftsprozessen

### Plan ECM24: AddOn Cold Storage (encrypted) {#plan-24}

- Erweiterung des Dokumenten- und Archivspeichers für selten genutzte oder historisierte Inhalte
- Optimiert für Systeme mit hohem Dokumentenvolumen, aber geringer Änderungs- und Workflowaktivität
- Keine Erweiterung der Kapazitäten für Verwaltungsdaten (z. B. Metadaten, Workflows oder Historien)
- Kosteneffiziente Langzeitablage
- **Aktivierte Verschlüsselung gespeicherter Daten (Data at Rest)**
- Schutz sensibler Inhalte durch Verschlüsselung im Ruhezustand
