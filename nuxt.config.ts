import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  ignore: ['**/.mimocode', '**/.mimocode/**', '**/dist', '**/dist/**'],

  experimental: {
    watcher: 'builder',
    buildCache: true,
  },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/tokens.css', '~/assets/css/tailwind.css', '~/assets/css/base.css'],

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.ts',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Anime Archive — Personal Screenshot Archive',
      meta: [
        { charset: 'utf-8' },
        { name: 'description', content: 'A private, collaborative digital art gallery for preserving memorable anime moments.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap',
        },
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  runtimeConfig: {
    public: {
      apiBase: '/api',
    },
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],
  typescript: {
    strict: true,
  },
})
