<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink, Trash2, Download } from 'lucide-vue-next'
import type { NoteIndexItem } from '../../../shared/types'
import { getNoteColorScheme } from '../../../shared/color'

const props = defineProps<{
  note: NoteIndexItem
  isDark: boolean
  searchQuery?: string
}>()

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'delete', note: NoteIndexItem): void
  (e: 'export', note: NoteIndexItem): void
}>()

const colorScheme = computed(() => {
  return getNoteColorScheme(props.note.color, props.isDark)
})

const formattedDate = computed(() => {
  const d = new Date(props.note.updatedAt)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
})

function highlightMatch(text: string, query?: string): string {
  if (!query || !query.trim()) {
    return escapeHtml(text)
  }
  const escaped = escapeHtml(text)
  const regex = new RegExp(`(${escapeRegExp(query.trim())})`, 'gi')
  return escaped.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-600 dark:text-white rounded px-0.5">$1</mark>')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<template>
  <div
    class="group relative flex flex-col p-4 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
    :style="{ borderLeftColor: colorScheme.barBg, borderLeftWidth: '6px' }"
    @dblclick="emit('open', note.id)"
  >
    <!-- Top row: Title and status -->
    <div class="flex items-start justify-between gap-2 mb-1.5">
      <h3
        class="text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-1 flex-1"
        v-html="highlightMatch(note.title, searchQuery)"
      />
      <span
        v-if="note.isOpen"
        class="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
      >
        Open
      </span>
    </div>

    <!-- Snippet -->
    <p
      class="text-xs text-stone-500 dark:text-stone-400 line-clamp-3 mb-3 flex-1 leading-relaxed"
      v-html="highlightMatch(note.plainText || 'Empty note', searchQuery)"
    />

    <!-- Bottom row: Date and hover actions -->
    <div class="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-700/50 text-[11px] text-stone-400">
      <span>{{ formattedDate }}</span>

      <div class="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          class="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400"
          title="Export note"
          aria-label="Export note"
          @click.stop="emit('export', note)"
        >
          <Download class="w-3.5 h-3.5" />
        </button>
        <button
          class="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400"
          title="Open note"
          aria-label="Open note"
          @click.stop="emit('open', note.id)"
        >
          <ExternalLink class="w-3.5 h-3.5" />
        </button>
        <button
          class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Delete note"
          aria-label="Delete note"
          @click.stop="emit('delete', note)"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>
