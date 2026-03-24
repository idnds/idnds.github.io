// Wird im Browser aufgerufen -- Date.now() ist immer der echte aktuelle Zeitpunkt.
// Ein Composable ist eine wiederverwendbare Funktion in Vue, die Logik kapselt.

// useEventStatus.js

export function deriveStatus(event) {
    // Nur Abbruch wird generell berücksichtigt
    if (event.status === "cancelled") return "cancelled";

    // Nur Maintenance-Events bekommen einen dynamischen Status
    if (event.typeId === "maintenance") {
        const now = Date.now();
        const start = new Date(event.eventDate).getTime();
        const end = new Date(event.endDate).getTime();

        if (now < start) return "planned";
        if (now <= end) return "ongoing";
        return "completed";
    }

    // Alle anderen Events haben keinen sichtbaren Status
    return null;
};

// Labels für Status-Badges
export const statusLabel = {
    planned: "Geplant",
    ongoing: "Aktiv",
    completed: "Abgeschlossen",
    cancelled: "Abgesagt",
};

// CSS-Klassen für Status-Badges
export const statusClass = {
    planned: "status-planned",
    ongoing: "status-ongoing",
    completed: "status-completed",
    cancelled: "status-cancelled",
};