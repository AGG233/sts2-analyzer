// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxtjs/i18n', '@pinia/nuxt'],
  css: [
    'primeicons/primeicons.css',
    '~/assets/css/main.css'
  ],
  build: {
    transpile: ['vue-echarts', 'primevue', '@primevue/themes']
  },
  app: {
    head: {
      title: 'STS2 Analyzer',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Slay the Spire 2 Run History Analyzer' }
      ]
    }
  },
  i18n: {
    locales: [
      { code: 'en', name: 'English' },
      { code: 'zh', name: '中文' },
      { code: 'ja', name: '日本語' },
      { code: 'ko', name: '한국어' }
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    vueI18n: './i18n.config.ts'
  }
})
