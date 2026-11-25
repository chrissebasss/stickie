<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Editor } from '@tiptap/vue-3'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Baseline,
  List,
  ListOrdered,
  CheckSquare,
  Table as TableIcon,
  Image as ImageIcon,
  X,
  Plus,
  Trash2
} from 'lucide-vue-next'

const props = defineProps<{
  editor?: Editor
}>()

const emit = defineEmits<{
  (e: 'pickImage'): void
}>()

const { t } = useI18n()

type SubToolbar = 'color' | 'highlight' | 'table' | null
const activeSubToolbar = ref<SubToolbar>(null)
const toolbarRef = ref<HTMLElement | null>(null)

function onDocumentPointerDown(event: PointerEvent) {
  if (activeSubToolbar.value && toolbarRef.value && !toolbarRef.value.contains(event.target as Node)) {
    activeSubToolbar.value = null
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && activeSubToolbar.value) {
    activeSubToolbar.value = null
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onKeyDown)
})

const textColors = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea']
const highlightColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa']

// Custom Table state
const customRows = ref(3)
const customCols = ref(3)
const withHeaderRow = ref(true)

function toggleSubToolbar(menu: 'color' | 'highlight' | 'table') {
  activeSubToolbar.value = activeSubToolbar.value === menu ? null : menu
}

function setTextColor(color: string) {
  props.editor?.chain().focus().setColor(color).run()
}

function onCustomTextColor(event: Event) {
  const target = event.target as HTMLInputElement
  if (target && target.value) {
    setTextColor(target.value)
  }
}

function resetTextColor() {
  props.editor?.chain().focus().unsetColor().run()
}

function setHighlight(color: string) {
  props.editor?.chain().focus().setHighlight({ color }).run()
}

function onCustomHighlight(event: Event) {
  const target = event.target as HTMLInputElement
  if (target && target.value) {
    setHighlight(target.value)
  }
}

function clearHighlight() {
  props.editor?.chain().focus().unsetHighlight().run()
}

function insertCustomTable() {
  const rows = Math.max(1, Math.min(30, Number(customRows.value) || 3))
  const cols = Math.max(1, Math.min(30, Number(customCols.value) || 3))
  props.editor?.chain().focus().insertTable({
    rows,
    cols,
    withHeaderRow: withHeaderRow.value
  }).run()
  activeSubToolbar.value = null
}
</script>

<template>
  <div ref="toolbarRef" v-if="editor" class="flex flex-col border-b border-black/10 dark:border-white/10 select-none">
    <!-- Main Toolbar Row -->
    <div
      class="flex items-center space-x-0.5 px-2 py-1 bg-black/[0.03] dark:bg-black/25 text-xs text-note-fg/75 overflow-x-auto select-none transition-colors"
    >
      <!-- Bold -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg font-bold': editor.isActive('bold') }"
        v-tooltip="t('note.bold')"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <Bold class="w-3.5 h-3.5" />
      </button>

      <!-- Italic -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg': editor.isActive('italic') }"
        v-tooltip="t('note.italic')"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <Italic class="w-3.5 h-3.5" />
      </button>

      <!-- Underline -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg': editor.isActive('underline') }"
        v-tooltip="t('note.underline')"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <UnderlineIcon class="w-3.5 h-3.5" />
      </button>

      <!-- Strikethrough -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg': editor.isActive('strike') }"
        v-tooltip="t('note.strike')"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <Strikethrough class="w-3.5 h-3.5" />
      </button>

      <div class="w-px h-3 bg-black/10 dark:bg-white/10 mx-1" />

      <!-- Text Color Button -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg flex items-center"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg': activeSubToolbar === 'color' }"
        v-tooltip="t('note.textColor')"
        @click="toggleSubToolbar('color')"
      >
        <Baseline class="w-3.5 h-3.5" />
      </button>

      <!-- Highlight Button -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg flex items-center"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg': activeSubToolbar === 'highlight' || editor.isActive('highlight') }"
        v-tooltip="t('note.highlight')"
        @click="toggleSubToolbar('highlight')"
      >
        <Highlighter class="w-3.5 h-3.5" />
      </button>

      <div class="w-px h-3 bg-black/10 dark:bg-white/10 mx-1" />

      <!-- Bullet List -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg': editor.isActive('bulletList') }"
        v-tooltip="t('note.bulletList')"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <List class="w-3.5 h-3.5" />
      </button>

      <!-- Ordered List -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg': editor.isActive('orderedList') }"
        v-tooltip="t('note.orderedList')"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered class="w-3.5 h-3.5" />
      </button>

      <!-- Task / Checklist -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg': editor.isActive('taskList') }"
        v-tooltip="t('note.checklist')"
        @click="editor.chain().focus().toggleTaskList().run()"
      >
        <CheckSquare class="w-3.5 h-3.5" />
      </button>

      <div class="w-px h-3 bg-black/10 dark:bg-white/10 mx-1" />

      <!-- Table Button -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg flex items-center"
        :class="{ 'bg-black/15 dark:bg-white/15 text-note-fg': activeSubToolbar === 'table' || editor.isActive('table') }"
        v-tooltip="t('note.table')"
        @click="toggleSubToolbar('table')"
      >
        <TableIcon class="w-3.5 h-3.5" />
      </button>

      <!-- Image -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-note-fg"
        v-tooltip="t('note.image')"
        @click="emit('pickImage')"
      >
        <ImageIcon class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Second Toolbar Row (Highlight / Text Color / Table) -->
    <div
      v-if="activeSubToolbar"
      class="flex items-center flex-wrap gap-1 px-2.5 py-1.5 bg-black/[0.05] dark:bg-white/[0.07] text-xs text-note-fg border-t border-black/5 dark:border-white/5 transition-all select-none"
    >
      <!-- Subtoolbar 1: Highlight -->
      <template v-if="activeSubToolbar === 'highlight'">
        <span class="text-[11px] font-medium opacity-70 mr-1">{{ t('note.highlight') }}:</span>
        <div class="flex items-center space-x-1.5">
          <button
            v-for="c in highlightColors"
            :key="c"
            class="w-4 h-4 rounded-full border border-black/20 hover:scale-110 transition-transform cursor-pointer"
            :style="{ backgroundColor: c }"
            v-tooltip="c"
            @click="setHighlight(c)"
          />
          <label
            class="w-4 h-4 rounded-full border border-black/20 overflow-hidden cursor-pointer relative hover:scale-110 transition-transform bg-gradient-to-tr from-yellow-300 via-pink-400 to-purple-500"
            v-tooltip="t('note.customColor')"
          >
            <input
              type="color"
              class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              @input="onCustomHighlight"
            />
          </label>
          <button
            class="text-[11px] px-1.5 py-0.5 rounded border border-black/15 dark:border-white/15 hover:bg-black/10 dark:hover:bg-white/10 opacity-80 hover:opacity-100 ml-1 cursor-pointer"
            v-tooltip="t('note.clearHighlight')"
            @click="clearHighlight"
          >
            {{ t('note.clearHighlight') }}
          </button>
        </div>
      </template>

      <!-- Subtoolbar 2: Text Color -->
      <template v-else-if="activeSubToolbar === 'color'">
        <span class="text-[11px] font-medium opacity-70 mr-1">{{ t('note.textColor') }}:</span>
        <div class="flex items-center space-x-1.5">
          <button
            v-for="c in textColors"
            :key="c"
            class="w-4 h-4 rounded-full border border-black/20 hover:scale-110 transition-transform cursor-pointer"
            :style="{ backgroundColor: c }"
            v-tooltip="c"
            @click="setTextColor(c)"
          />
          <label
            class="w-4 h-4 rounded-full border border-black/20 overflow-hidden cursor-pointer relative hover:scale-110 transition-transform bg-gradient-to-tr from-red-500 via-green-500 to-blue-500"
            v-tooltip="t('note.customColor')"
          >
            <input
              type="color"
              class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              @input="onCustomTextColor"
            />
          </label>
          <button
            class="text-[11px] px-1.5 py-0.5 rounded border border-black/15 dark:border-white/15 hover:bg-black/10 dark:hover:bg-white/10 opacity-80 hover:opacity-100 ml-1 cursor-pointer"
            v-tooltip="t('note.resetColor')"
            @click="resetTextColor"
          >
            {{ t('note.resetColor') }}
          </button>
        </div>
      </template>

      <!-- Subtoolbar 3: Table (Custom creation + Contextual editing) -->
      <template v-else-if="activeSubToolbar === 'table'">
        <!-- Custom Table Insertion Form -->
        <template v-if="!editor.isActive('table')">
          <span class="text-[11px] font-medium opacity-70 mr-1">{{ t('note.table') }}:</span>
          <div class="flex items-center space-x-2 flex-wrap gap-y-1">
            <div class="flex items-center space-x-1">
              <span class="text-[11px] opacity-75">{{ t('note.rows') }}:</span>
              <input
                type="number"
                min="1"
                max="30"
                v-model.number="customRows"
                class="w-11 px-1 py-0.5 text-xs text-center rounded border border-black/20 dark:border-white/20 bg-white/70 dark:bg-stone-800/70 text-note-fg outline-none"
              />
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-[11px] opacity-75">{{ t('note.cols') }}:</span>
              <input
                type="number"
                min="1"
                max="30"
                v-model.number="customCols"
                class="w-11 px-1 py-0.5 text-xs text-center rounded border border-black/20 dark:border-white/20 bg-white/70 dark:bg-stone-800/70 text-note-fg outline-none"
              />
            </div>
            <label class="flex items-center space-x-1 cursor-pointer text-[11px] opacity-80 hover:opacity-100">
              <input type="checkbox" v-model="withHeaderRow" class="rounded accent-note-fg" />
              <span>{{ t('note.header') }}</span>
            </label>
            <button
              class="px-2 py-0.5 rounded bg-black/15 dark:bg-white/15 hover:bg-black/25 dark:hover:bg-white/25 text-note-fg font-medium text-[11px] transition-colors cursor-pointer"
              @click="insertCustomTable"
            >
              {{ t('note.insert') }}
            </button>
          </div>
        </template>

        <!-- Contextual Table Controls when inside a table -->
        <template v-else>
          <span class="text-[11px] font-medium opacity-70 mr-1">{{ t('note.table') }}:</span>
          <div class="flex items-center space-x-1 flex-wrap gap-y-1">
            <button
              class="px-1.5 py-0.5 rounded border border-black/15 dark:border-white/15 hover:bg-black/10 dark:hover:bg-white/10 text-[11px] cursor-pointer"
              v-tooltip="t('note.addRowBelow')"
              @click="editor.chain().focus().addRowAfter().run()"
            >
              + {{ t('note.row') }}
            </button>
            <button
              class="px-1.5 py-0.5 rounded border border-black/15 dark:border-white/15 hover:bg-black/10 dark:hover:bg-white/10 text-[11px] cursor-pointer"
              v-tooltip="t('note.addColumnAfter')"
              @click="editor.chain().focus().addColumnAfter().run()"
            >
              + {{ t('note.col') }}
            </button>
            <button
              class="px-1.5 py-0.5 rounded border border-red-500/20 text-red-500 hover:bg-red-500/10 text-[11px] cursor-pointer"
              v-tooltip="t('note.deleteRow')"
              @click="editor.chain().focus().deleteRow().run()"
            >
              - {{ t('note.row') }}
            </button>
            <button
              class="px-1.5 py-0.5 rounded border border-red-500/20 text-red-500 hover:bg-red-500/10 text-[11px] cursor-pointer"
              v-tooltip="t('note.deleteColumn')"
              @click="editor.chain().focus().deleteColumn().run()"
            >
              - {{ t('note.col') }}
            </button>
            <button
              class="px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 text-[11px] font-medium ml-1 cursor-pointer"
              v-tooltip="t('note.deleteTable')"
              @click="editor.chain().focus().deleteTable().run(); activeSubToolbar = null"
            >
              {{ t('note.deleteTable') }}
            </button>
          </div>
        </template>
      </template>

      <!-- Dismiss button for the second row -->
      <div class="flex-1" />
      <button
        class="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 cursor-pointer ml-auto"
        v-tooltip="'Close'"
        @click="activeSubToolbar = null"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
