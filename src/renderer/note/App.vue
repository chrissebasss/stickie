<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import NoteBar from './components/NoteBar.vue'
import EditorToolbar from './components/EditorToolbar.vue'
import NoteEditor from './components/NoteEditor.vue'
import type { Note, NoteColor, JSONContent } from '../../shared/types'
import { getNoteColorScheme } from '../../shared/color'
import { setAppLanguage } from '../i18n'

const noteId = ref<string>('')
const note = ref<Note | null>(null)
const isDark = ref<boolean>(false)
const showToolbar = ref<boolean>(true)
const isDirty = ref<boolean>(false)
const editorComponent = ref<InstanceType<typeof NoteEditor> | null>(null)
let autoSaveInterval: NodeJS.Timeout | null = null

const editorInstance = computed(() => editorComponent.value?.editor)

const colorScheme = computed(() => {
  const noteColor: NoteColor = note.value?.color || { kind: 'preset', id: 'yellow' }
  return getNoteColorScheme(noteColor, isDark.value)
})

const rootStyle = computed(() => {
  const s = colorScheme.value
  return {
    '--note-bg': s.bg,
    '--note-fg': s.fg,
    '--bar-bg': s.barBg,
    '--bar-fg': s.barFg
  }
})

async function loadNote() {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  if (!id) return
  noteId.value = id

  if (window.stickie) {
    const fetched = await window.stickie.getNote(id)
    if (fetched) {
      note.value = fetched
    }
    const settings = await window.stickie.getSettings()
    if (settings && settings.language) {
      setAppLanguage(settings.language)
    }

    const theme = await window.stickie.getTheme()
    isDark.value = theme.resolved === 'dark'
    document.documentElement.setAttribute('data-theme', theme.resolved)

    window.stickie.onThemeChanged((t) => {
      isDark.value = t.resolved === 'dark'
      document.documentElement.setAttribute('data-theme', t.resolved)
    })

    nextTick(() => {
      editorInstance.value?.commands.focus('end')
    })
  }
}

async function saveCurrentNote(forceSync = false) {
  if (!note.value || !window.stickie) return
  if (editorInstance.value) {
    note.value.content = editorInstance.value.getJSON()
    note.value.plainText = editorInstance.value.getText()
  }
  const rawNote: Note = JSON.parse(JSON.stringify(note.value))
  isDirty.value = false
  if (forceSync) {
    await window.stickie.saveNote(rawNote)
  } else {
    window.stickie.saveNote(rawNote)
  }
}

function onEditorUpdate({ content, plainText }: { content: JSONContent; plainText: string }) {
  if (!note.value) return
  note.value.content = content
  note.value.plainText = plainText
  isDirty.value = true
  if (window.stickie) {
    const rawNote: Note = JSON.parse(JSON.stringify(note.value))
    window.stickie.saveNote(rawNote)
  }
}

async function togglePin() {
  if (!note.value || !window.stickie) return
  const currentPin = note.value.alwaysOnTop ?? false
  note.value.alwaysOnTop = !currentPin
  await window.stickie.setNotePin(note.value.id, note.value.alwaysOnTop)
}

async function updateColor(color: NoteColor) {
  if (!note.value || !window.stickie) return
  note.value.color = color
  await window.stickie.updateNoteColor(note.value.id, color)
}

async function closeNote() {
  if (!note.value || !window.stickie) return
  if (editorInstance.value) {
    note.value.content = editorInstance.value.getJSON()
    note.value.plainText = editorInstance.value.getText()
  }
  const rawNote: Note = JSON.parse(JSON.stringify(note.value))
  await window.stickie.closeNote(note.value.id, rawNote)
}

async function createNewNote() {
  if (!window.stickie) return
  await window.stickie.createNote()
}

async function handlePickImage() {
  if (!note.value || !window.stickie) return
  const assetUrl = await window.stickie.pickImage(note.value.id)
  if (assetUrl && editorInstance.value) {
    editorInstance.value.chain().focus().setImage({ src: assetUrl }).run()
  }
}

function handleWindowBlur() {
  if (isDirty.value) {
    saveCurrentNote(true)
  }
}

function handleBeforeUnload() {
  saveCurrentNote(true)
}

onMounted(() => {
  loadNote()

  // Auto-save every 3 seconds if there are changes
  autoSaveInterval = setInterval(() => {
    if (isDirty.value) {
      saveCurrentNote()
    }
  }, 3000)

  window.addEventListener('blur', handleWindowBlur)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
  }
  window.removeEventListener('blur', handleWindowBlur)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div
    class="h-full w-full flex flex-col overflow-hidden border border-black/15 dark:border-white/10 transition-colors duration-150"
    :style="rootStyle"
    style="background-color: var(--note-bg); color: var(--note-fg);"
  >
    <!-- Top draggable bar -->
    <NoteBar
      v-if="note"
      :note-id="note.id"
      :always-on-top="note.alwaysOnTop ?? false"
      :color="note.color"
      :show-toolbar="showToolbar"
      @toggle-toolbar="showToolbar = !showToolbar"
      @toggle-pin="togglePin"
      @update-color="updateColor"
      @close="closeNote"
      @new-note="createNewNote"
    />

    <!-- Formatting Toolbar (can be toggled) -->
    <EditorToolbar
      v-if="showToolbar"
      :editor="editorInstance"
      @pick-image="handlePickImage"
    />

    <!-- TipTap Editor -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <NoteEditor
        v-if="note"
        ref="editorComponent"
        :note-id="note.id"
        :initial-content="note.content"
        :editable="true"
        @update="onEditorUpdate"
      />
    </div>
  </div>
</template>
