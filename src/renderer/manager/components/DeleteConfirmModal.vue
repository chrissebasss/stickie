<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import type { NoteIndexItem } from '../../../shared/types'

const props = defineProps<{
  note: NoteIndexItem | null
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div
    v-if="note"
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
    @click.self="emit('cancel')"
  >
    <div
      class="bg-white dark:bg-stone-800 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 max-w-sm w-full p-5 space-y-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div class="flex items-center space-x-3 text-red-600 dark:text-red-400">
        <div class="p-2 rounded-full bg-red-100 dark:bg-red-950/60">
          <AlertTriangle class="w-5 h-5" />
        </div>
        <h3 id="dialog-title" class="font-semibold text-stone-900 dark:text-stone-100">
          Delete Sticky Note?
        </h3>
      </div>

      <p class="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
        Are you sure you want to delete <span class="font-medium text-stone-800 dark:text-stone-200">"{{ note.title }}"</span>? This will permanently remove the note and all attached images.
      </p>

      <div class="flex items-center justify-end space-x-2 pt-2">
        <button
          class="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          @click="emit('confirm')"
        >
          Delete Note
        </button>
      </div>
    </div>
  </div>
</template>

