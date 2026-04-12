import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { de, en, es, fr, it, ja, ko, pl, pt, ru, th, tr, zh } from './locales'
import router from './router'
import './style.css'

const i18n = createI18n({
  legacy: false,
  locale: (() => {
    const lang = navigator.language
    if (lang.startsWith('zh'))
      return 'zh'
    if (lang.startsWith('ja'))
      return 'ja'
    if (lang.startsWith('ko'))
      return 'ko'
    if (lang.startsWith('de'))
      return 'de'
    if (lang.startsWith('fr'))
      return 'fr'
    if (lang.startsWith('es'))
      return 'es'
    if (lang.startsWith('it'))
      return 'it'
    if (lang.startsWith('pl'))
      return 'pl'
    if (lang.startsWith('pt'))
      return 'pt'
    if (lang.startsWith('ru'))
      return 'ru'
    if (lang.startsWith('tr'))
      return 'tr'
    if (lang.startsWith('th'))
      return 'th'
    return 'en'
  })(),
  fallbackLocale: 'en',
  messages: { en, zh, ja, ko, de, fr, es, it, pl, pt, ru, tr, th },
})

// Custom dark theme: gold primary on dark teal surfaces
const StsPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fffde7',
      100: '#fff9c4',
      200: '#fff59d',
      300: '#fff176',
      400: '#ffee58',
      500: '#fdd835',
      600: '#fbc02d',
      700: '#f9a825',
      800: '#f57f17',
      900: '#e65100',
      950: '#9e3600',
    },
    surface: {
      0: '#0a1628',
      50: '#0f1f35',
      100: '#152a42',
      200: '#1b3550',
      300: '#2a4a66',
      400: '#3d6080',
      500: '#5a7a9a',
      600: '#8aa0b8',
      700: '#b0c0d0',
      800: '#d0dae4',
      900: '#e8ecf0',
      950: '#f5f7f9',
    },
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(PrimeVue, {
  theme: {
    preset: StsPreset,
    options: {
      prefix: 'p',
      darkModeSelector: '.p-dark',
      cssLayer: false,
    },
  },
})

// Force dark mode
document.documentElement.classList.add('p-dark')
app.use(i18n)
app.use(router)
app.mount('#app')
