import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import '../styles/globals.css'

const messages = {
  en: {
    note: {
      placeholder: 'Take a note...',
      close: 'Close note',
      pin: 'Keep on top',
      unpin: 'Unpin from top',
      color: 'Note color',
      newNote: 'New note'
    }
  }
}

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages
})

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.mount('#app')

