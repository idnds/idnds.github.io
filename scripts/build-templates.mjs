// scripts/build-templates.mjs
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const templateDir = "data/templates/news";
const outInternal = "data/_generated/templates/news";
const outPublic = "docs/public/data/_generated/templates/news";

if (!fs.existsSync(templateDir)) {
    console.log("Kein templates/news/-Ordner gefunden -- übersprungen.");
    process.exit(0);
}

fs.mkdirSync(outInternal, { recursive: true });
fs.mkdirSync(outPublic, { recursive: true });

const index = [];

for (const file of fs.readdirSync(templateDir)) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;

    const id = file.replace(/\.ya?ml$/, "");
    const raw = fs.readFileSync(path.join(templateDir, file), "utf8");
    const data = yaml.load(raw);
    const meta = data._meta ?? {};

    index.push({
        id,
        name: meta.name ?? id,
        description: meta.description ?? "",
        typeId: data.typeId ?? null,
    });

    // Vollständige Template-Daten für einzelnen Abruf
    const outData = { ...data };
    const json = JSON.stringify(outData, null, 2);
    fs.writeFileSync(path.join(outInternal, id + ".json"), json, "utf8");
    fs.writeFileSync(path.join(outPublic, id + ".json"), json, "utf8");
}

const indexJson = JSON.stringify({ templates: index }, null, 2);
fs.writeFileSync(path.join(outInternal, "index.json"), indexJson, "utf8");
fs.writeFileSync(path.join(outPublic, "index.json"), indexJson, "utf8");

console.log("Templates erzeugt: " + index.length + " Templates");