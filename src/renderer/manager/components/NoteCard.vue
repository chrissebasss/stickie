<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2, Download } from 'lucide-vue-next'
import type { NoteIndexItem, LanguageMode } from '../../../shared/types'
import { getNoteColorScheme } from '../../../shared/color'
import { resolveDateLocale } from '../../i18n'

const props = defineProps<{
  note: NoteIndexItem
  isDark: boolean
  language?: LanguageMode
  searchQuery?: string
}>()

const emit = defineEmits<{
  (e: 'toggle', note: NoteIndexItem): void
  (e: 'delete', note: NoteIndexItem): void
  (e: 'export', note: NoteIndexItem): void
}>()

const { t } = useI18n()

const colorScheme = computed(() => {
  return getNoteColorScheme(props.note.color, props.isDark)
})

const dateTimeFormatter = computed(() => {
  const dateLocale = resolveDateLocale(
    props.language,
    typeof window !== 'undefined' ? window.stickie?.systemDateLocale : undefined
  )
  return new Intl.DateTimeFormat(dateLocale, {
    dateStyle: 'short',
    timeStyle: 'short'
  })
})

const formattedUpdatedAt = computed(() => dateTimeFormatter.value.format(new Date(props.note.updatedAt)))
const formattedCreatedAt = computed(() => dateTimeFormatter.value.format(new Date(props.note.createdAt)))

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
    class="group relative flex flex-col p-4 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 shadow-sm hover:shadow-md hover:border-blue-400/60 dark:hover:border-blue-500/60 transition-all cursor-pointer overflow-hidden active:scale-[0.99] select-none"
    :style="{ borderLeftColor: colorScheme.barBg, borderLeftWidth: '6px' }"
    v-tooltip="note.isOpen ? t('manager.clickToHide') : t('manager.clickToOpen')"
    @click="emit('toggle', note)"
  >
    <!-- Top row: Title and status -->
    <div class="flex items-start justify-between gap-2 mb-1.5">
      <h3
        class="text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-1 flex-1"
        v-html="highlightMatch(note.title, searchQuery)"
      />
      <span
        v-if="note.isOpen"
        class="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/70 flex items-center space-x-1"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>{{ t('manager.openStatus') }}</span>
      </span>
    </div>

    <!-- Snippet -->
    <p
      class="text-xs text-stone-700 dark:text-stone-400 line-clamp-3 mb-3 flex-1 leading-relaxed"
      v-html="highlightMatch(note.plainText || t('manager.emptyNote'), searchQuery)"
    />

    <!-- Bottom row: Date and hover actions -->
    <div class="flex items-end justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-700/50 text-[10px] leading-tight text-stone-600 dark:text-stone-400">
      <div class="flex flex-col space-y-0.5 min-w-0">
        <span class="truncate"><strong class="font-semibold">{{ t('manager.updatedLabel') }}:</strong> {{ formattedUpdatedAt }}</span>
        <span class="truncate opacity-85"><strong class="font-semibold">{{ t('manager.createdLabel') }}:</strong> {{ formattedCreatedAt }}</span>
      </div>

      <div class="flex items-center space-x-1 opacity-85 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          class="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400"
          v-tooltip="t('manager.exportNote')"
          :aria-label="t('manager.exportNote')"
          @click.stop="emit('export', note)"
        >
          <Download class="w-3.5 h-3.5" />
        </button>
        <button
          class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          v-tooltip="t('manager.deleteNote')"
          :aria-label="t('manager.deleteNote')"
          @click.stop="emit('delete', note)"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>
