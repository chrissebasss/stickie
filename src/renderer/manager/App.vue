<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, XCircle, Settings as SettingsIcon, StickyNote, Upload } from 'lucide-vue-next'
import SearchBar from './components/SearchBar.vue'
import NoteCard from './components/NoteCard.vue'
import DeleteConfirmModal from './components/DeleteConfirmModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import CustomSelect from './components/CustomSelect.vue'
import { setAppLanguage } from '../i18n'
import { applyFont } from '../../shared/font'
import type { NoteIndexItem, Settings } from '../../shared/types'
import stickieIcon from '../assets/icon.png'

const { t } = useI18n()

const notes = ref<NoteIndexItem[]>([])
const searchQuery = ref('')
const sortOrder = ref<'newest' | 'oldest' | 'created-newest' | 'created-oldest' | 'title'>('newest')
const sortOptions = computed<
  { value: 'newest' | 'oldest' | 'created-newest' | 'created-oldest' | 'title'; label: string }[]
>(() => [
  { value: 'newest', label: t('manager.sortNewest') },
  { value: 'oldest', label: t('manager.sortOldest') },
  { value: 'created-newest', label: t('manager.sortCreatedNewest') },
  { value: 'created-oldest', label: t('manager.sortCreatedOldest') },
  { value: 'title', label: t('manager.sortTitle') }
])
const isDark = ref(false)
const showSettings = ref(false)
const noteToDelete = ref<NoteIndexItem | null>(null)

const settings = ref<Settings>({
  schemaVersion: 1,
  theme: 'system',
  language: 'system',
  font: 'system',
  reopenNotesOnLaunch: false,
  openNoteIds: [],
  alwaysOnTop: false,
  launchAtLogin: false
})

onMounted(async () => {
  if (window.stickie) {
    notes.value = await window.stickie.listNotes()
    settings.value = await window.stickie.getSettings()

    if (settings.value.language) {
      setAppLanguage(settings.value.language)
    }
    applyFont(settings.value.font)

    const theme = await window.stickie.getTheme()
    isDark.value = theme.resolved === 'dark'
    document.documentElement.setAttribute('data-theme', theme.resolved)

    window.stickie.onIndexUpdated((updatedNotes) => {
      notes.value = updatedNotes
    })

    window.stickie.onThemeChanged((t) => {
      isDark.value = t.resolved === 'dark'
      document.documentElement.setAttribute('data-theme', t.resolved)
    })
  }
})

const filteredNotes = computed(() => {
  let list = [...notes.value]
  const q = searchQuery.value.trim().toLowerCase()

  if (q) {
    list = list.filter((n) => {
      const matchTitle = n.title.toLowerCase().includes(q)
      const matchSnippet = (n.plainText || '').toLowerCase().includes(q)
      return matchTitle || matchSnippet
    })
  }

  if (sortOrder.value === 'newest') {
    list.sort((a, b) => b.updatedAt - a.updatedAt)
  } else if (sortOrder.value === 'oldest') {
    list.sort((a, b) => a.updatedAt - b.updatedAt)
  } else if (sortOrder.value === 'created-newest') {
    list.sort((a, b) => b.createdAt - a.createdAt)
  } else if (sortOrder.value === 'created-oldest') {
    list.sort((a, b) => a.createdAt - b.createdAt)
  } else if (sortOrder.value === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title))
  }

  return list
})

async function createNote() {
  if (window.stickie) {
    await window.stickie.createNote()
  }
}

async function toggleNote(noteItem: NoteIndexItem) {
  if (!window.stickie) return
  if (noteItem.isOpen) {
    await window.stickie.closeNote(noteItem.id)
  } else {
    await window.stickie.openNote(noteItem.id)
  }
}

async function closeAllNotes() {
  if (window.stickie) {
    await window.stickie.closeAllNotes()
  }
}

function promptDelete(note: NoteIndexItem) {
  noteToDelete.value = note
}

async function confirmDelete() {
  if (noteToDelete.value && window.stickie) {
    await window.stickie.deleteNote(noteToDelete.value.id)
    noteToDelete.value = null
  }
}

async function updateSettings(patch: Partial<Settings>) {
  if (window.stickie) {
    settings.value = await window.stickie.updateSettings(patch)
    if (patch.language) {
      setAppLanguage(patch.language)
    }
    if (patch.font) {
      applyFont(patch.font)
    }
  }
}

async function importFiles() {
  if (window.stickie) {
    await window.stickie.importFiles()
  }
}

async function exportNote(note: NoteIndexItem) {
  if (window.stickie) {
    await window.stickie.exportNote(note.id, 'md')
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-sans">
    <!-- Top App Header -->
    <header class="px-6 py-4 bg-white dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-700/80 flex items-center justify-between shadow-sm">
      <div class="flex items-center space-x-2.5">
        <img
          :src="stickieIcon"
          alt="Stickie"
          class="w-8 h-8 object-contain drop-shadow-sm select-none"
        />
        <div>
          <h1 class="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100">Stickie</h1>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex items-center space-x-2">
        <button
          class="p-2 rounded-lg border border-yellow-400 dark:border-yellow-500/80 bg-yellow-300 hover:bg-yellow-400 text-stone-900 shadow-sm transition-colors focus:ring-2 focus:ring-yellow-500 focus:outline-none"
          v-tooltip="t('manager.newNote')"
          :aria-label="t('manager.newNote')"
          @click="createNote"
        >
          <Plus class="w-4 h-4" />
        </button>

        <button
          class="p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/60 transition-colors"
          v-tooltip="t('manager.importNotes')"
          :aria-label="t('manager.importNotes')"
          @click="importFiles"
        >
          <Upload class="w-4 h-4" />
        </button>

        <button
          class="p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/60 transition-colors"
          v-tooltip="t('manager.closeAllNotes')"
          :aria-label="t('manager.closeAllNotes')"
          @click="closeAllNotes"
        >
          <XCircle class="w-4 h-4" />
        </button>

        <button
          class="p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/60 transition-colors"
          v-tooltip="t('manager.settings')"
          :aria-label="t('manager.settings')"
          @click="showSettings = true"
        >
          <SettingsIcon class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- Subheader with Search and Sort -->
    <div class="px-6 py-3 border-b border-stone-200 dark:border-stone-700/50 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between gap-4">
      <div class="flex-1 max-w-md">
        <SearchBar v-model="searchQuery" />
      </div>

      <div>
        <CustomSelect v-model="sortOrder" :options="sortOptions" />
      </div>
    </div>

    <!-- Main Content: Notes Grid or Empty State -->
    <main class="flex-1 overflow-y-auto p-6">
      <div
        v-if="filteredNotes.length > 0"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        <NoteCard
          v-for="note in filteredNotes"
          :key="note.id"
          :note="note"
          :is-dark="isDark"
          :language="settings.language"
          :search-query="searchQuery"
          @toggle="toggleNote"
          @delete="promptDelete"
          @export="exportNote"
        />
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="h-full flex flex-col items-center justify-center text-center p-8 space-y-3"
      >
        <div class="w-12 h-12 rounded-2xl bg-stone-200/60 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400">
          <StickyNote class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-semibold text-stone-800 dark:text-stone-300">
            {{ searchQuery ? t('manager.noMatchTitle') : t('manager.noNotesTitle') }}
          </p>
          <p class="text-xs text-stone-600 dark:text-stone-400 max-w-xs">
            {{ searchQuery ? t('manager.noMatchDesc') : t('manager.noNotesDesc') }}
          </p>
        </div>
      </div>
    </main>

    <!-- Settings Dialog -->
    <SettingsModal
      v-if="showSettings"
      :settings="settings"
      @update="updateSettings"
      @close="showSettings = false"
    />

    <!-- Delete Confirmation Dialog -->
    <DeleteConfirmModal
      :note="noteToDelete"
      @confirm="confirmDelete"
      @cancel="noteToDelete = null"
    />
  </div>
</template>
