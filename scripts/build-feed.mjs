import fs from "node:fs";
import { readYamlFiles } from "./utils.mjs";
import { getSchemaForType } from "./schemas/content.mjs";

const contentDirs = ["maintenance", "security", "release", "announcement"];
const events = [];

for (const dir of contentDirs) {
    for (const { data } of readYamlFiles("data/content/" + dir)) {
        const result = getSchemaForType(data?.typeId).safeParse(data);
        if (result.success) events.push(result.data);
    }
}

events.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
const latest = events.slice(0, 50);

// Custom Domain des Projekts. Bei Domaenwechsel hier anpassen.
const BASE_URL = process.env.VITEPRESS_BASE_URL ?? "https://lieblingsplatz.cloud";

function escapeXml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

const items = latest.map((e) => {
    // Kundenhandlungsbedarf im Titel kennzeichnen
    const titlePrefix = e.isCustomerActionRequired ? "[Handlungsbedarf] " : "";

    return (
        "\n  <item>" +
        "\n    <title>" + escapeXml(titlePrefix + e.title) + "</title>" +
        "\n    <link>" + BASE_URL + "/news/" + escapeXml(e.slug) + "</link>" +
        "\n    <guid isPermaLink=\"true\">" + BASE_URL + "/news/" + escapeXml(e.slug) + "</guid>" +
        "\n    <pubDate>" + new Date(e.publishedAt).toUTCString() + "</pubDate>" +
        (e.updatedAt
            ? "\n    <lastBuildDate>" + new Date(e.updatedAt).toUTCString() + "</lastBuildDate>"
            : "") +
        "\n    <description>" + escapeXml(e.summaryMd) + "</description>" +
        "\n    <category>" + escapeXml(e.typeId) + "</category>" +
        "\n  </item>"
    );
}).join("");

const rss =
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n" +
    "  <channel>\n" +
    "    <title>Lieblingsplatz.cloud</title>\n" +
    "    <link>" + BASE_URL + "</link>\n" +
    "    <description>Wartungen, CVEs, Releases und Ankündigungen</description>\n" +
    "    <language>de</language>\n" +
    "    <lastBuildDate>" + new Date().toUTCString() + "</lastBuildDate>\n" +
    "    <atom:link href=\"" + BASE_URL + "/feed.xml\" rel=\"self\" type=\"application/rss+xml\" />\n" +
    items +
    "\n  </channel>\n" +
    "</rss>";

fs.mkdirSync("data/_generated/feeds", { recursive: true });
fs.writeFileSync("data/_generated/feeds/feed.xml", rss, "utf8");

// Feed nach docs/public/ kopieren, damit er im Build-Output unter /feed.xml erreichbar ist.
fs.mkdirSync("docs/public", { recursive: true });
fs.copyFileSync("data/_generated/feeds/feed.xml", "docs/public/feed.xml");

console.log("RSS-Feed erzeugt: " + latest.length + " Einträge");