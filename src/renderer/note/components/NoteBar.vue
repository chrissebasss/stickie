<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Pin, PinOff, Palette, X, SlidersHorizontal } from 'lucide-vue-next'
import type { NoteColor, PresetColorId } from '../../../shared/types'
import stickieIcon from '../../assets/icon.png'

const props = defineProps<{
  noteId: string
  alwaysOnTop: boolean
  color: NoteColor
  showToolbar?: boolean
}>()

const emit = defineEmits<{
  (e: 'togglePin'): void
  (e: 'toggleToolbar'): void
  (e: 'updateColor', color: NoteColor): void
  (e: 'close'): void
  (e: 'newNote'): void
}>()

const { t } = useI18n()

const showColorPicker = ref(false)
const colorPickerRef = ref<HTMLElement | null>(null)

function onDocumentPointerDown(event: PointerEvent) {
  if (showColorPicker.value && colorPickerRef.value && !colorPickerRef.value.contains(event.target as Node)) {
    showColorPicker.value = false
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && showColorPicker.value) {
    showColorPicker.value = false
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

const presets: PresetColorId[] = ['yellow', 'green', 'blue', 'pink']

function selectPreset(preset: PresetColorId) {
  emit('updateColor', { kind: 'preset', id: preset })
  showColorPicker.value = false
}

function onCustomColor(event: Event) {
  const target = event.target as HTMLInputElement
  if (target && target.value) {
    emit('updateColor', { kind: 'custom', hex: target.value })
  }
}
</script>

<template>
  <header
    class="group h-8 px-2 flex items-center justify-between select-none bg-note-bar text-note-barFg relative border-b border-black/5 dark:border-black/20 transition-colors duration-150"
    style="-webkit-app-region: drag;"
  >
    <!-- Left: Drag handle area -->
    <div class="flex-1 h-full flex items-center space-x-1" style="-webkit-app-region: drag;">
      <img :src="stickieIcon" alt="" class="w-3.5 h-3.5 object-contain select-none pointer-events-none opacity-80" />
      <span class="text-[11px] font-medium opacity-60 select-none">Stickie</span>
    </div>

    <!-- Right: Interactive Actions -->
    <div
      class="flex items-center space-x-0.5 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
      style="-webkit-app-region: no-drag;"
    >
      <!-- New note -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-note-barFg focus:outline-none focus:ring-1 focus:ring-current"
        :aria-label="t('note.newNote')"
        :title="t('note.newNote')"
        @click="emit('newNote')"
      >
        <Plus class="w-3.5 h-3.5" />
      </button>

      <!-- Color picker toggle -->
      <div ref="colorPickerRef" class="relative">
        <button
          class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-note-barFg focus:outline-none focus:ring-1 focus:ring-current"
          :aria-label="t('note.color')"
          :title="t('note.color')"
          @click="showColorPicker = !showColorPicker"
        >
          <Palette class="w-3.5 h-3.5" />
        </button>

        <!-- Color Palette Dropdown -->
        <div
          v-if="showColorPicker"
          class="absolute right-0 top-full mt-1 p-2 bg-stone-100 dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 flex items-center space-x-2 z-50"
        >
          <button
            v-for="p in presets"
            :key="p"
            class="w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition-transform"
            :class="{
              'bg-yellow-200': p === 'yellow',
              'bg-green-200': p === 'green',
              'bg-blue-200': p === 'blue',
              'bg-pink-200': p === 'pink'
            }"
            :aria-label="`Preset ${p}`"
            @click="selectPreset(p)"
          />
          <div class="w-px h-4 bg-stone-300 dark:bg-stone-600" />
          <label class="cursor-pointer flex items-center justify-center w-5 h-5 rounded-full overflow-hidden border border-black/20 hover:scale-110 transition-transform">
            <input
              type="color"
              class="opacity-0 absolute w-0 h-0"
              :aria-label="t('note.customColor')"
              @change="onCustomColor"
            />
            <span class="text-[10px] font-bold">🎨</span>
          </label>
        </div>
      </div>

      <!-- Toggle toolbar -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-note-barFg focus:outline-none focus:ring-1 focus:ring-current"
        :class="{ 'opacity-60': !showToolbar }"
        :aria-label="t('note.toggleToolbar')"
        :title="t('note.toggleToolbar')"
        @click="emit('toggleToolbar')"
      >
        <SlidersHorizontal class="w-3.5 h-3.5" />
      </button>

      <!-- Pin / Always on top -->
      <button
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-note-barFg focus:outline-none focus:ring-1 focus:ring-current"
        :aria-label="alwaysOnTop ? t('note.unpin') : t('note.pin')"
        :title="alwaysOnTop ? t('note.unpin') : t('note.pin')"
        @click="emit('togglePin')"
      >
        <Pin v-if="!alwaysOnTop" class="w-3.5 h-3.5" />
        <PinOff v-else class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      </button>

      <!-- Close note -->
      <button
        class="p-1 rounded hover:bg-red-500 hover:text-white text-note-barFg focus:outline-none focus:ring-1 focus:ring-current transition-colors"
        :aria-label="t('note.close')"
        :title="t('note.close')"
        @click="emit('close')"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </header>
</template>
