<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, XCircle, Settings as SettingsIcon, StickyNote, ArrowUpDown, Upload } from 'lucide-vue-next'
import SearchBar from './components/SearchBar.vue'
import NoteCard from './components/NoteCard.vue'
import DeleteConfirmModal from './components/DeleteConfirmModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import type { NoteIndexItem, Settings } from '../../shared/types'

const notes = ref<NoteIndexItem[]>([])
const searchQuery = ref('')
const sortOrder = ref<'newest' | 'oldest' | 'title'>('newest')
const isDark = ref(false)
const showSettings = ref(false)
const noteToDelete = ref<NoteIndexItem | null>(null)

const settings = ref<Settings>({
  schemaVersion: 1,
  theme: 'system',
  reopenNotesOnLaunch: false,
  openNoteIds: [],
  alwaysOnTop: false,
  launchAtLogin: false
})

onMounted(async () => {
  if (window.stikly) {
    notes.value = await window.stikly.listNotes()
    settings.value = await window.stikly.getSettings()

    const theme = await window.stikly.getTheme()
    isDark.value = theme.resolved === 'dark'
    document.documentElement.setAttribute('data-theme', theme.resolved)

    window.stikly.onIndexUpdated((updatedNotes) => {
      notes.value = updatedNotes
    })

    window.stikly.onThemeChanged((t) => {
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
  } else if (sortOrder.value === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title))
  }

  return list
})

async function createNote() {
  if (window.stikly) {
    await window.stikly.createNote()
  }
}

async function openNote(id: string) {
  if (window.stikly) {
    await window.stikly.openNote(id)
  }
}

async function closeAllNotes() {
  if (window.stikly) {
    await window.stikly.closeAllNotes()
  }
}

function promptDelete(note: NoteIndexItem) {
  noteToDelete.value = note
}

async function confirmDelete() {
  if (noteToDelete.value && window.stikly) {
    await window.stikly.deleteNote(noteToDelete.value.id)
    noteToDelete.value = null
  }
}

async function updateSettings(patch: Partial<Settings>) {
  if (window.stikly) {
    settings.value = await window.stikly.updateSettings(patch)
  }
}

async function importFiles() {
  if (window.stikly) {
    await window.stikly.importFiles()
  }
}

async function exportNote(note: NoteIndexItem) {
  if (window.stikly) {
    await window.stikly.exportNote(note.id, 'md')
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-sans">
    <!-- Top App Header -->
    <header class="px-6 py-4 bg-white dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-700/80 flex items-center justify-between shadow-sm">
      <div class="flex items-center space-x-2.5">
        <div class="w-8 h-8 rounded-lg bg-yellow-400 dark:bg-yellow-500 shadow-sm flex items-center justify-center font-bold text-stone-900">
          S
        </div>
        <div>
          <h1 class="text-base font-bold tracking-tight">Stikly</h1>
          <p class="text-[11px] text-stone-500 dark:text-stone-400">Desktop Sticky Notes</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex items-center space-x-2">
        <button
          class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
          @click="createNote"
        >
          <Plus class="w-4 h-4" />
          <span>New Note</span>
        </button>

        <button
          class="p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/60 transition-colors"
          title="Import notes (.txt, .md, .html, .json)"
          aria-label="Import notes"
          @click="importFiles"
        >
          <Upload class="w-4 h-4" />
        </button>

        <button
          class="p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/60 transition-colors"
          title="Close all open notes"
          aria-label="Close all open notes"
          @click="closeAllNotes"
        >
          <XCircle class="w-4 h-4" />
        </button>

        <button
          class="p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/60 transition-colors"
          title="Settings"
          aria-label="Settings"
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

      <div class="flex items-center space-x-2 text-xs text-stone-500 dark:text-stone-400">
        <ArrowUpDown class="w-3.5 h-3.5" />
        <select
          v-model="sortOrder"
          class="bg-transparent border border-stone-200 dark:border-stone-700 rounded-md px-2 py-1 text-xs text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title (A-Z)</option>
        </select>
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
          :search-query="searchQuery"
          @open="openNote"
          @delete="promptDelete"
          @export="exportNote"
        />
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="h-full flex flex-col items-center justify-center text-center p-8 space-y-3"
      >
        <div class="w-12 h-12 rounded-2xl bg-stone-200/60 dark:bg-stone-800 flex items-center justify-center text-stone-400">
          <StickyNote class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-semibold text-stone-700 dark:text-stone-300">
            {{ searchQuery ? 'No matching notes found' : 'No sticky notes yet' }}
          </p>
          <p class="text-xs text-stone-400 max-w-xs">
            {{ searchQuery ? 'Try adjusting your search terms.' : 'Create a note to jot down your thoughts, reminders, or checklists.' }}
          </p>
        </div>
        <button
          v-if="!searchQuery"
          class="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          @click="createNote"
        >
          Create your first note
        </button>
      </div>
    </main>

    <!-- Modals -->
    <DeleteConfirmModal
      :note="noteToDelete"
      @confirm="confirmDelete"
      @cancel="noteToDelete = null"
    />

    <SettingsModal
      v-if="showSettings"
      :settings="settings"
      @update="updateSettings"
      @close="showSettings = false"
    />
  </div>
</template>
