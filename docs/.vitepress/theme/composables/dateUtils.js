// dateUtils.js
//
// Zentraler Utility-Layer für alle Datumskonvertierungen im News-System.
// Einzige Quelle für toIso, utcToLocal und formatForDatetimeLocal.
//
// ── Datumsformate im System ───────────────────────────────────────────────────
//
//   datetime-local (Browser-Input)
//     Format:  "YYYY-MM-DDTHH:MM"          (kein Zeitzonenoffset)
//     Typ:     lokale Zeit des Nutzers
//     Wo:      Form-State, :value-Binding an <input type="datetime-local">
//     Beispiel: "2026-04-16T18:00"
//
//   UTC ISO 8601
//     Format:  "YYYY-MM-DDTHH:mm:ss.sssZ"  (Z = UTC)
//     Typ:     universelle Koordinierte Zeit
//     Wo:      YAML-Dateien, all.json, build-feed.mjs, updatedAt im Export
//     Beispiel: "2026-04-16T16:00:00.000Z"
//
//   Offset ISO 8601 (Altdaten)
//     Format:  "YYYY-MM-DDTHH:mm:ss+HH:MM"
//     Typ:     Zeitzone explizit angegeben
//     Wo:      ältere YAML-Dateien die vor der UTC-Migration erstellt wurden
//     Beispiel: "2026-04-16T18:00:00+02:00"
//     Hinweis:  new Date() verarbeitet beide Formate korrekt → Migration transparent
//
// ── Konvertierungsstellen ─────────────────────────────────────────────────────
//
//   datetime-local → UTC:  toIso()          in useEventYaml.js (YAML-Export)
//   UTC → datetime-local:  utcToLocal()     in useYamlIO.js (YAML-Import)
//   Date → datetime-local: formatForDatetimeLocal()  in useEventFormState.js (Initialwert)
//   UTC → Anzeigestring:   Intl.DateTimeFormat        in build-detail-pages.mjs (Build)
//
// Jede Konvertierung findet genau einmal und an der richtigen Systemgrenze statt.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Konvertiert einen datetime-local-String ("YYYY-MM-DDTHH:MM", lokale Zeit)
 * in UTC ISO 8601 ("YYYY-MM-DDTHH:mm:ss.sssZ").
 *
 * Akzeptiert auch bestehende Offset-Strings ("...+01:00") für Abwärtskompatibilität.
 * new Date() interpretiert beide Formate korrekt; toISOString() liefert immer UTC.
 *
 * Einsatz: ausschließlich in useEventYaml.js beim YAML-Export.
 * NICHT in FormSectionDates oder anderen UI-Komponenten.
 *
 * Beispiele:
 *   "2026-04-16T18:00"          → "2026-04-16T16:00:00.000Z" (bei CEST, UTC+2)
 *   "2026-04-16T18:00:00+01:00" → "2026-04-16T17:00:00.000Z"
 *   ""                          → ""
 *   null / undefined            → ""
 *
 * @param {string|null|undefined} localOrOffsetDatetime
 * @returns {string} UTC ISO 8601 mit Z-Suffix, oder ""
 */
export function toIso(localOrOffsetDatetime) {
  if (!localOrOffsetDatetime) return "";
  const d = new Date(localOrOffsetDatetime);
  if (isNaN(d.getTime())) return "";
  return d.toISOString(); // immer "...Z"
}

/**
 * Konvertiert einen UTC ISO-String oder Offset-String in das Format
 * das datetime-local-Inputs als :value erwarten: "YYYY-MM-DDTHH:MM".
 * Die Ausgabe entspricht der lokalen Zeit des aufrufenden Prozesses
 * (Browser-Zeitzone im Frontend, System-Zeitzone in Node).
 *
 * Einsatz: ausschließlich in useYamlIO.normalize() beim YAML-Import.
 * NICHT für Anzeigeformatierung (→ Intl.DateTimeFormat in build-detail-pages.mjs).
 *
 * Beispiele (bei CEST = UTC+2):
 *   "2026-04-16T16:00:00.000Z"   → "2026-04-16T18:00"
 *   "2026-04-16T18:00:00+01:00"  → "2026-04-16T19:00"
 *   ""                            → ""
 *   null / undefined              → ""
 *
 * @param {string|null|undefined} isoString - UTC oder Offset ISO-String
 * @returns {string} "YYYY-MM-DDTHH:MM" in lokaler Zeit, oder ""
 */
export function utcToLocal(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes())
  );
}

/**
 * Konvertiert ein Date-Objekt in das datetime-local-Format: "YYYY-MM-DDTHH:MM".
 * Gibt lokale Zeit zurück (Browserzeit im Frontend, Systemzeit in Node).
 *
 * Einsatz: ausschließlich in useEventFormState.js für Initialwerte.
 * NICHT für UTC-Konvertierung (→ toIso) oder Import (→ utcToLocal).
 *
 * Beispiel (bei CEST = UTC+2):
 *   new Date()  →  "2026-04-16T18:00"  (wenn UTC-Zeit 16:00 ist)
 *
 * @param {Date} date
 * @returns {string} "YYYY-MM-DDTHH:MM"
 */
export function formatForDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear() + "-" +
    pad(date.getMonth() + 1) + "-" +
    pad(date.getDate()) + "T" +
    pad(date.getHours()) + ":" +
    pad(date.getMinutes())
  );
}
