<script setup lang="ts">
import { ref, onMounted } from 'vue'

const noteId = ref<string>('')

function closeNote(): void {
  if (noteId.value && window.stikly) {
    window.stikly.closeNote(noteId.value)
  }
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  noteId.value = params.get('id') || ''
})
</script>

<template>
  <div class="h-full w-full flex flex-col bg-note-bg text-note-fg rounded-lg shadow-lg overflow-hidden border border-black/10 dark:border-white/10">
    <div
      class="h-8 bg-note-bar text-note-barFg px-3 flex items-center justify-between select-none"
      style="-webkit-app-region: drag;"
    >
      <span class="text-xs font-medium opacity-70">Sticky Note</span>
      <div class="flex items-center space-x-1" style="-webkit-app-region: no-drag;">
        <button
          class="w-5 h-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-xs"
          @click="closeNote"
        >
          ✕
        </button>
      </div>
    </div>
    <div class="flex-1 p-3 overflow-auto">
      <p class="text-sm">Note placeholder</p>
    </div>
  </div>
</template>
