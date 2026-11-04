<script setup lang="ts">
import { ref } from 'vue'
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
  ChevronDown
} from 'lucide-vue-next'

const props = defineProps<{
  editor?: Editor
}>()

const emit = defineEmits<{
  (e: 'pickImage'): void
}>()

const showColorMenu = ref(false)
const showHighlightMenu = ref(false)
const showTableMenu = ref(false)

const textColors = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea']
const highlightColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa']

function setTextColor(color: string) {
  props.editor?.chain().focus().setColor(color).run()
  showColorMenu.value = false
}

function setHighlight(color: string) {
  props.editor?.chain().focus().setHighlight({ color }).run()
  showHighlightMenu.value = false
}

function insertTable() {
  props.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  showTableMenu.value = false
}
</script>

<template>
  <div
    v-if="editor"
    class="flex items-center space-x-0.5 px-2 py-1 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-xs overflow-x-auto select-none"
  >
    <!-- Bold -->
    <button
      class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      :class="{ 'bg-black/15 dark:bg-white/15 font-bold': editor.isActive('bold') }"
      title="Bold (Ctrl+B)"
      @click="editor.chain().focus().toggleBold().run()"
    >
      <Bold class="w-3.5 h-3.5" />
    </button>

    <!-- Italic -->
    <button
      class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      :class="{ 'bg-black/15 dark:bg-white/15': editor.isActive('italic') }"
      title="Italic (Ctrl+I)"
      @click="editor.chain().focus().toggleItalic().run()"
    >
      <Italic class="w-3.5 h-3.5" />
    </button>

    <!-- Underline -->
    <button
      class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      :class="{ 'bg-black/15 dark:bg-white/15': editor.isActive('underline') }"
      title="Underline (Ctrl+U)"
      @click="editor.chain().focus().toggleUnderline().run()"
    >
      <UnderlineIcon class="w-3.5 h-3.5" />
    </button>

    <!-- Strikethrough -->
    <button
      class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      :class="{ 'bg-black/15 dark:bg-white/15': editor.isActive('strike') }"
      title="Strikethrough (Ctrl+Shift+X)"
      @click="editor.chain().focus().toggleStrike().run()"
    >
      <Strikethrough class="w-3.5 h-3.5" />
    </button>

    <div class="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-0.5" />

    <!-- Text Color Menu -->
    <div class="relative">
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center"
        title="Text color"
        @click="showColorMenu = !showColorMenu"
      >
        <Baseline class="w-3.5 h-3.5" />
      </button>
      <div
        v-if="showColorMenu"
        class="absolute left-0 top-full mt-1 p-1.5 bg-white dark:bg-stone-800 rounded shadow-lg border border-black/10 dark:border-white/10 flex space-x-1 z-50"
      >
        <button
          v-for="c in textColors"
          :key="c"
          class="w-4 h-4 rounded-full border border-black/20"
          :style="{ backgroundColor: c }"
          @click="setTextColor(c)"
        />
      </div>
    </div>

    <!-- Highlight Color Menu -->
    <div class="relative">
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center"
        :class="{ 'bg-black/15 dark:bg-white/15': editor.isActive('highlight') }"
        title="Highlight"
        @click="showHighlightMenu = !showHighlightMenu"
      >
        <Highlighter class="w-3.5 h-3.5" />
      </button>
      <div
        v-if="showHighlightMenu"
        class="absolute left-0 top-full mt-1 p-1.5 bg-white dark:bg-stone-800 rounded shadow-lg border border-black/10 dark:border-white/10 flex space-x-1 z-50"
      >
        <button
          v-for="c in highlightColors"
          :key="c"
          class="w-4 h-4 rounded-full border border-black/20"
          :style="{ backgroundColor: c }"
          @click="setHighlight(c)"
        />
        <button
          class="text-[10px] px-1 border border-black/20 rounded"
          title="Clear highlight"
          @click="editor.chain().focus().unsetHighlight().run(); showHighlightMenu = false"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-0.5" />

    <!-- Bullet List -->
    <button
      class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      :class="{ 'bg-black/15 dark:bg-white/15': editor.isActive('bulletList') }"
      title="Bullet List (Ctrl+Shift+8)"
      @click="editor.chain().focus().toggleBulletList().run()"
    >
      <List class="w-3.5 h-3.5" />
    </button>

    <!-- Ordered List -->
    <button
      class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      :class="{ 'bg-black/15 dark:bg-white/15': editor.isActive('orderedList') }"
      title="Numbered List (Ctrl+Shift+7)"
      @click="editor.chain().focus().toggleOrderedList().run()"
    >
      <ListOrdered class="w-3.5 h-3.5" />
    </button>

    <!-- Task / Checklist -->
    <button
      class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      :class="{ 'bg-black/15 dark:bg-white/15': editor.isActive('taskList') }"
      title="Checklist (Ctrl+Shift+9)"
      @click="editor.chain().focus().toggleTaskList().run()"
    >
      <CheckSquare class="w-3.5 h-3.5" />
    </button>

    <div class="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-0.5" />

    <!-- Table Menu -->
    <div class="relative">
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center"
        :class="{ 'bg-black/15 dark:bg-white/15': editor.isActive('table') }"
        title="Table options"
        @click="showTableMenu = !showTableMenu"
      >
        <TableIcon class="w-3.5 h-3.5" />
      </button>

      <div
        v-if="showTableMenu"
        class="absolute left-0 top-full mt-1 p-1 bg-white dark:bg-stone-800 rounded shadow-lg border border-black/10 dark:border-white/10 flex flex-col space-y-1 z-50 text-[11px] min-w-28 text-stone-800 dark:text-stone-200"
      >
        <button
          v-if="!editor.isActive('table')"
          class="px-2 py-1 text-left rounded hover:bg-black/5 dark:hover:bg-white/5"
          @click="insertTable"
        >
          Insert 3x3 Table
        </button>
        <template v-else>
          <button
            class="px-2 py-1 text-left rounded hover:bg-black/5 dark:hover:bg-white/5"
            @click="editor.chain().focus().addRowAfter().run(); showTableMenu = false"
          >
            Add Row
          </button>
          <button
            class="px-2 py-1 text-left rounded hover:bg-black/5 dark:hover:bg-white/5"
            @click="editor.chain().focus().addColumnAfter().run(); showTableMenu = false"
          >
            Add Column
          </button>
          <button
            class="px-2 py-1 text-left rounded hover:bg-black/5 dark:hover:bg-white/5 text-red-500"
            @click="editor.chain().focus().deleteRow().run(); showTableMenu = false"
          >
            Delete Row
          </button>
          <button
            class="px-2 py-1 text-left rounded hover:bg-black/5 dark:hover:bg-white/5 text-red-500"
            @click="editor.chain().focus().deleteColumn().run(); showTableMenu = false"
          >
            Delete Column
          </button>
          <button
            class="px-2 py-1 text-left rounded hover:bg-black/5 dark:hover:bg-white/5 text-red-600 font-semibold border-t border-black/5 dark:border-white/5"
            @click="editor.chain().focus().deleteTable().run(); showTableMenu = false"
          >
            Delete Table
          </button>
        </template>
      </div>
    </div>

    <!-- Image -->
    <button
      class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      title="Insert image"
      @click="emit('pickImage')"
    >
      <ImageIcon class="w-3.5 h-3.5" />
    </button>
  </div>
</template>

