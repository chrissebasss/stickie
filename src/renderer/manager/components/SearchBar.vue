<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="relative flex items-center w-full">
    <Search class="absolute left-3 w-4 h-4 text-stone-400 pointer-events-none" />
    <input
      type="text"
      :value="modelValue"
      placeholder="Search notes..."
      class="w-full pl-9 pr-8 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      @input="onInput"
    />
    <button
      v-if="modelValue"
      class="absolute right-2.5 p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
      aria-label="Clear search"
      @click="clear"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </div>
</template>

