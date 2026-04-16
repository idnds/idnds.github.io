// docs/.vitepress/config.mjs
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Lieblingsplatz.cloud',
  description: 'Dokumentation & Informationen',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon-48x48.png' }],
    ['link', { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' }]
  ],
  base: '/',
  appearance: false,
  themeConfig: {
    logo: '/favicon-48x48.png',
    nav: [
      { text: 'Einstieg', link: '/einstieg/' },
      {
        text: 'Wissen & Praxis',
        items: [
          { text: 'Wissen', link: '/wissen' },
          { text: 'Praxis', link: '/praxis' }
        ]
      },
      { text: 'Betrieb & Service', link: '/betrieb-service/' },
      { text: 'Ankündigungen', link: '/news/' },
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
    docFooter: {
      prev: 'Vorherige Seite',
      next: 'Nächste Seite'
    },
    sidebar: {
      '/einstieg/': [
        {
          text: 'Einstieg',
          items: [
            { text: 'Erste Schritte', link: '/einstieg/' },
            { text: 'Gestaltung', link: '/einstieg/gestaltung/' },
            { text: 'Leistungen', link: '/einstieg/leistungen/' },
            { text: 'Cloud Migration', link: '/einstieg/migration/' },
            { text: 'Arbeitsumgebungen', link: '/einstieg/clients/' },
            { text: 'Glossar', link: '/glossar/' }
          ]
        }
      ],
      '/betrieb-service/': [
        {
          text: 'Betrieb & Service',
          items: [
            { text: 'Übersicht', link: '/betrieb-service/' },
            { text: 'Wartung', link: '/betrieb-service/wartung/' },
            { text: 'Glossar', link: '/glossar/' }
          ]
        }
      ],
      '/wissen/': [
        {
          text: 'Wissen',
          items: [
            { text: 'Übersicht', link: '/wissen/' },
            { text: 'ELO DocXtractor & 7zip', link: '/wissen/docxtractor_7zip' },
            { text: 'Lieblingsplatz.cloud', link: '/wissen/lieblingsplatz' },
            { text: 'Glossar', link: '/glossar/' }
          ]
        }
      ],
      '/praxis/': [
        {
          text: 'Praxis',
          items: [
            { text: 'Übersicht', link: '/praxis/' },
            { text: 'Dynamische Ordner', link: '/praxis/dynamische_ordner' },
            { text: 'Metadaten', link: '/praxis/metadaten' },
            { text: 'Glossar', link: '/glossar/' }
          ]
        }
      ]
    }
  }
})
