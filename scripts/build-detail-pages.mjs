import fs from "node:fs";
import path from "node:path";

const indexPath = "data/_generated/index/all.json";
if (!fs.existsSync(indexPath)) {
    console.error("Index nicht gefunden. Erst npm run build:index ausfuehren.");
    process.exit(1);
}

const events = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const outDir = "docs/news";
const BASE_URL = process.env.VITEPRESS_BASE_URL ?? "https://lieblingsplatz.cloud";

fs.mkdirSync(outDir, { recursive: true });

// Lookup-Map fuer Relations-Verlinkung
const eventMap = new Map(events.map((e) => [e.id, e]));

const relationLabel = {
    "relates-to": "Verwandtes Event",
    "resolves": "Behebt",
    "follow-up-to": "Nachfolger von",
    "supersedes": "Ersetzt",
};

function formatDateTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }) + " Uhr";
}

// Serialisiert die Badge-relevanten Felder als JSON-String fuer den
// EventDetailBadges-Prop. Einfache Anfuehrungszeichen im JSON werden
// als HTML-Entity kodiert, weil der Prop in einem single-quoted Attribut steht.
function buildBadgeJson(event) {
    const data = {
        typeId: event.typeId,
        status: event.status ?? null,
        eventDate: event.eventDate ?? null,
        endDate: event.endDate ?? null,
        impact: event.impact ?? [],
        eventType: event.eventType
            ? { color: event.eventType.color, name: event.eventType.name }
            : null,
    };
    return JSON.stringify(data).replace(/'/g, "&#39;");
}

for (const event of events) {
    const lines = [];
    const add = (l) => lines.push(l);
    const gap = () => lines.push("");

    // ── Frontmatter ──────────────────────────────────────────
    add("---");
    add("title: \"" + event.title.replace(/"/g, '\\"') + "\"");
    add("layout: doc");
    add("---");
    gap();

    // ── Badges (Komponente, laeuft im Browser) ───────────────
    // EventDetailBadges berechnet den Maintenance-Status zur Laufzeit
    // und zeigt alle Impact-Badges fuer alle Event-Typen an.
    add("<EventDetailBadges event-json='" + buildBadgeJson(event) + "' />");
    gap();

    // ── Titel ─────────────────────────────────────────────────
    add("# " + event.title);
    gap();

    // ── Meta-Tabelle ──────────────────────────────────────────
    add("| | |");
    add("|---|---|");
    add("| **Typ** | " + (event.eventType?.name ?? event.typeId) + " |");
    add("| **Hersteller** | " + (event.vendor?.name ?? event.vendorId) + " |");
    add("| **Produkte** | " +
        (event.products?.map((p) => p.name).join(", ") || event.productIds.join(", ")) + " |");
    add("| **Veröffentlicht** | " + formatDateTime(event.publishedAt) + " |");
    if (event.updatedAt) {
        add("| **Zuletzt aktualisiert** | " + formatDateTime(event.updatedAt) + " |");
    }

    // Typ-spezifische Meta-Zeilen
    if (event.typeId === "maintenance") {
        add("| **Beginn** | " + formatDateTime(event.eventDate) + " |");
        add("| **Ende** | " + formatDateTime(event.endDate) + " |");
    }
    if (event.typeId === "release") {
        add("| **Version** | " + event.version + " |");
        if (event.changelogUrl) {
            add("| **Changelog** | [Link](" + event.changelogUrl + ") |");
        }
    }
    if (event.typeId === "security") {
        if (event.severity) {
            add("| **Severity** | " + event.severity + " |");
        }
        if (event.cveIds?.length) {
            const cveLinks = event.cveIds
                .map((cve) => "[" + cve + "](https://nvd.nist.gov/vuln/detail/" + cve + ")")
                .join(", ");
            add("| **CVE-IDs** | " + cveLinks + " |");
        }
        if (event.affectedVersions?.length) {
            add("| **Betroffene Versionen** | " + event.affectedVersions.join(", ") + " |");
        }
        if (event.fixedVersion) {
            add("| **Behoben in** | " + event.fixedVersion + " |");
        }
    }
    gap();

    // ── Zusammenfassung ───────────────────────────────────────
    if (event.summaryMd) {
        add("## Zusammenfassung");
        gap();
        add(event.summaryMd);
        gap();
    }

    // ── Details ───────────────────────────────────────────────
    if (event.detailsMd) {
        add("## Details");
        gap();
        add(event.detailsMd);
        gap();
    }

    // ── Kundenhandlungsbedarf ─────────────────────────────────
    if (event.customerActionMd) {
        add("## Was jetzt zu tun ist");
        gap();
        add("::: warning Handlungsbedarf");
        add(event.customerActionMd);
        add(":::");
        gap();
    }

    // ── Verwandte Events ──────────────────────────────────────
    if (event.relations?.length) {
        add("## Verwandte Events");
        gap();
        for (const rel of event.relations) {
            const related = eventMap.get(rel.eventId);
            const label = relationLabel[rel.type] ?? rel.type;
            if (related) {
                add("- **" + label + ":** [" + related.title + "](/news/" + related.slug + ")");
            } else {
                add("- **" + label + ":** `" + rel.eventId + "`");
            }
        }
        gap();
    }

    const outPath = path.join(outDir, event.slug + ".md");
    fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
}

console.log("Detailseiten erzeugt: " + events.length + " Seiten unter docs/news/");