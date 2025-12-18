# lieblingsplatz.cloud

Offizielle Dokumentation und Informationsseite für „lieblingsplatz.cloud“ – Die ELO ECM Suite als Software as a Service in der Partner Managed Cloud der id-netsolutions Digital Solutions GmbH.

Die Seite wird mit **VitePress 2** erstellt und über **GitHub Pages** als Organisationsseite (`idnds.github.io`) veröffentlicht.

## 📝 Inhaltsverzeichnis

- [Technologien](#technologien)  
- [Projektstruktur](#projektstruktur)  
- [Installation & Entwicklung](#installation--entwicklung)  
- [Build & Vorschau](#build--vorschau)  
- [Deployment](#deployment)  
- [Custom Domain](#custom-domain)  
- [Konfiguration](#konfiguration)  
- [Support](#support)  

## Technologien

- [VitePress](https://vitepress.vuejs.org/) – statische Seite  
- [Vue](https://vuejs.org/) – für Komponenten  
- Node.js (Version ≥ 24 empfohlen)  
- GitHub Actions – automatisches Deployment auf GitHub Pages

## Projektstruktur

```
docs/
├─ .vitepress/           # VitePress Konfiguration
│  ├─ config.mjs         # Site-Konfiguration
│  └─ public/            # Statische Assets (Favicons, Logos, Bilder)
├─ [diverse Unterseiten/]
└─ index.md              # Startseite
```

## Installation & Entwicklung

1. Repository klonen:

```bash
git clone https://github.com/idnds/idnds.github.io.git
cd idnds.github.io
```

2. Node.js Version prüfen (≥ 24 empfohlen):

```bash
node -v
```

3. Abhängigkeiten installieren:

```bash
npm ci
```

4. Lokalen Entwicklungsserver starten:

```bash
npm run docs:dev
```

- Seite lokal erreichbar unter `http://localhost:5173`

## Build & Vorschau

- Build für Produktion:

```bash
npm run docs:build
```

- Vorschau lokal:

```bash
npm run docs:serve
```

## Deployment

- Automatisches Deployment erfolgt über GitHub Actions (`.github/workflows/deploy.yml`)  
- Ziel: GitHub Pages Organisationsseite (`idnds.github.io`)  

**Hinweis:** Die Actions übernehmen automatisch den Upload des `docs/.vitepress/dist` Verzeichnisses.

## Custom Domain

- Domain: `lieblingsplatz.cloud`  
- Subdomain: `www.lieblingsplatz.cloud` → per CNAME auf Root weitergeleitet  
- DNS-Einträge:
  - Root: A/AAAA Records auf GitHub Pages IPs  
  - Subdomain: CNAME → `lieblingsplatz.cloud`  
- Base Path in `config.mjs`:

```ts
export default defineConfig({
  base: '/',
})
```

- HTTPS wird von GitHub Pages automatisch aktiviert  
- Alte URL `idnds.github.io` leitet automatisch auf die Custom Domain weiter

## Konfiguration

- **Logo & Favicon**: `docs/.vitepress/public/`  
- **Navigation & Sidebar**: `docs/.vitepress/config.mjs`  
- **Dark Mode deaktivieren**:

```ts
themeConfig: {
  appearance: false
}
```

- **Outline Überschrift auf Deutsch**:

```ts
themeConfig: {
  outline: { label: 'Auf dieser Seite' }
}
```

- **Sidebar automatisch aus Unterordnern generieren** → entsprechende `sidebar` Konfiguration in `config.mjs`

## Support

- Projektleiter: [Tobias Kral](https://github.com/Inte) (Technical Consulting, [IDNDS](https://idnds.de))

## Lizenz

Dieses Projekt steht unter der [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](LICENSE).
