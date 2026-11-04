import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import '../styles/globals.css'

const messages = {
  en: {
    app: {
      title: 'Stikly',
      searchPlaceholder: 'Search notes...',
      newNote: 'New Note',
      closeAll: 'Close all open notes',
      noNotes: 'No notes found',
      noNotesDesc: 'Create a new note to get started',
      deleteTitle: 'Delete note?',
      deleteConfirm: 'Are you sure you want to delete this note? This cannot be undone.',
      cancel: 'Cancel',
      delete: 'Delete',
      undo: 'Undo',
      settings: 'Settings',
      theme: 'Theme',
      themeSystem: 'System',
      themeLight: 'Light',
      themeDark: 'Dark',
      reopenNotes: 'Reopen notes on launch',
      launchAtLogin: 'Launch at login',
      importNotes: 'Import',
      exportNotes: 'Export',
      lastModified: 'Modified'
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
