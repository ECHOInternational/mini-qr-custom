import { createI18n } from 'vue-i18n'
import en from '../../locales/en.json'
import es from '../../locales/es.json'
import fr from '../../locales/fr.json'
import th from '../../locales/th.json'

export const i18n = createI18n({
  locale: 'en', // Default to English
  fallbackLocale: 'en', // Fallback to English if translation missing
  legacy: false,
  messages: {
    en,
    es,
    fr,
    th
  }
})
