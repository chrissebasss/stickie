<script setup lang="ts" generic="T extends string">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown, Check, ArrowUpDown } from 'lucide-vue-next'

export interface SelectOption<V = string> {
  value: V
  label: string
}

const props = defineProps<{
  modelValue: T
  options: SelectOption<T>[]
  icon?: boolean
  fullWidth?: boolean
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const currentLabel = computed(() => {
  const match = props.options.find((opt) => opt.value === props.modelValue)
  return match ? match.label : props.modelValue
})

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function selectOption(value: T) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function handleOutsideClick(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    close()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    ref="dropdownRef"
    :class="fullWidth ? 'relative block w-full select-none' : 'relative inline-block text-left select-none'"
  >
    <button
      type="button"
      class="flex items-center space-x-1.5 px-2.5 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm transition-colors"
      :class="fullWidth ? 'w-full justify-between' : ''"
      :aria-expanded="isOpen"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <ArrowUpDown v-if="icon !== false" class="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" aria-hidden="true" />
      <span class="font-medium truncate min-w-0 flex-1 text-left">{{ currentLabel }}</span>
      <ChevronDown
        class="w-3 h-3 text-stone-600 dark:text-stone-400 transition-transform duration-150 shrink-0"
        aria-hidden="true"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full mt-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-xl py-1 z-50 overflow-hidden max-h-60 overflow-y-auto"
      :class="fullWidth ? 'left-0 right-0' : 'right-0 min-w-[180px]'"
      role="listbox"
    >
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        role="option"
        :aria-selected="opt.value === modelValue"
        class="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors"
        :class="
          opt.value === modelValue
            ? 'font-medium text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40'
            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/60'
        "
        @click="selectOption(opt.value)"
      >
        <span class="whitespace-nowrap">{{ opt.label }}</span>
        <Check
          v-if="opt.value === modelValue"
          class="w-3.5 h-3.5 ml-2 text-blue-600 dark:text-blue-400 shrink-0"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>
