import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'lieblingsplatz.cloud',
  description: 'Dokumentation & Informationen',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon-48x48.png' }],
    ['link', { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' }]
  ],

  themeConfig: {
    logo: '/favicon-48x48.png',
    nav: [
      { text: 'Start', link: '/' },
      { text: 'Erste Schritte', link: '/erste-schritte/' },
      { text: 'Gestaltung', link: '/gestaltung/' },
      { text: 'Über uns', link: '/ueber-uns/' },
      {
        text: 'Rechtliches',
        items: [
          { text: 'Impressum', link: '/impressum/' },
          { text: 'Datenschutz', link: '/datenschutz/' }
        ]
      }
    ],

    outline: { label: 'Auf dieser Seite' },

    sidebar: {
      '/erste-schritte/': [
        {
          text: 'Erste Schritte',
          items: [
            { text: 'Übersicht', link: '/erste-schritte/' },
            { text: 'Clients', link: '/erste-schritte/clients/' },
            { text: 'Glossar', link: '/erste-schritte/glossar/' }
          ]
        }
      ]
    }
  }
})
