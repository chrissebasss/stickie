<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import NoteBar from './components/NoteBar.vue'
import EditorToolbar from './components/EditorToolbar.vue'
import NoteEditor from './components/NoteEditor.vue'
import type { Note, NoteColor, JSONContent } from '../../shared/types'
import { getNoteColorScheme } from '../../shared/color'

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

  if (window.stikly) {
    const fetched = await window.stikly.getNote(id)
    if (fetched) {
      note.value = fetched
    }
    const theme = await window.stikly.getTheme()
    isDark.value = theme.resolved === 'dark'
    document.documentElement.setAttribute('data-theme', theme.resolved)

    window.stikly.onThemeChanged((t) => {
      isDark.value = t.resolved === 'dark'
      document.documentElement.setAttribute('data-theme', t.resolved)
    })

    nextTick(() => {
      editorInstance.value?.commands.focus('end')
    })
  }
}

async function saveCurrentNote(forceSync = false) {
  if (!note.value || !window.stikly) return
  if (editorInstance.value) {
    note.value.content = editorInstance.value.getJSON()
    note.value.plainText = editorInstance.value.getText()
  }
  const rawNote: Note = JSON.parse(JSON.stringify(note.value))
  isDirty.value = false
  if (forceSync) {
    await window.stikly.saveNote(rawNote)
  } else {
    window.stikly.saveNote(rawNote)
  }
}

function onEditorUpdate({ content, plainText }: { content: JSONContent; plainText: string }) {
  if (!note.value) return
  note.value.content = content
  note.value.plainText = plainText
  isDirty.value = true
  if (window.stikly) {
    const rawNote: Note = JSON.parse(JSON.stringify(note.value))
    window.stikly.saveNote(rawNote)
  }
}

async function togglePin() {
  if (!note.value || !window.stikly) return
  const currentPin = note.value.alwaysOnTop ?? false
  note.value.alwaysOnTop = !currentPin
  await window.stikly.setNotePin(note.value.id, note.value.alwaysOnTop)
}

async function updateColor(color: NoteColor) {
  if (!note.value || !window.stikly) return
  note.value.color = color
  await window.stikly.updateNoteColor(note.value.id, color)
}

async function closeNote() {
  if (!note.value || !window.stikly) return
  if (editorInstance.value) {
    note.value.content = editorInstance.value.getJSON()
    note.value.plainText = editorInstance.value.getText()
  }
  const rawNote: Note = JSON.parse(JSON.stringify(note.value))
  await window.stikly.closeNote(note.value.id, rawNote)
}

async function createNewNote() {
  if (!window.stikly) return
  await window.stikly.createNote()
}

async function handlePickImage() {
  if (!note.value || !window.stikly) return
  const assetUrl = await window.stikly.pickImage(note.value.id)
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
    class="h-full w-full flex flex-col overflow-hidden border border-black/15 dark:border-white/10 select-none transition-colors duration-150"
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
        @update="onEditorUpdate"
      />
    </div>
  </div>
</template>
