<script setup lang="ts">
import { ref } from 'vue'
import { X, Sun, Moon, Laptop } from 'lucide-vue-next'
import type { Settings, ThemeMode } from '../../../shared/types'

const props = defineProps<{
  settings: Settings
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<Settings>): void
  (e: 'close'): void
}>()

function setTheme(theme: ThemeMode) {
  emit('update', { theme })
}

function toggleReopen(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update', { reopenNotesOnLaunch: target.checked })
}

function toggleLogin(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update', { launchAtLogin: target.checked })
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
    @click.self="emit('close')"
  >
    <div
      class="bg-white dark:bg-stone-800 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 max-w-sm w-full p-5 space-y-5"
      role="dialog"
      aria-modal="true"
    >
      <div class="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
        <h3 class="font-semibold text-stone-900 dark:text-stone-100 text-sm">Settings</h3>
        <button
          class="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          aria-label="Close settings"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Theme Switcher -->
      <div class="space-y-2">
        <label class="text-xs font-medium text-stone-700 dark:text-stone-300">Theme</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            class="flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all"
            :class="
              settings.theme === 'system'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 text-stone-600 dark:text-stone-300'
            "
            @click="setTheme('system')"
          >
            <Laptop class="w-4 h-4 mb-1" />
            System
          </button>

          <button
            class="flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all"
            :class="
              settings.theme === 'light'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 text-stone-600 dark:text-stone-300'
            "
            @click="setTheme('light')"
          >
            <Sun class="w-4 h-4 mb-1" />
            Light
          </button>

          <button
            class="flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all"
            :class="
              settings.theme === 'dark'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 text-stone-600 dark:text-stone-300'
            "
            @click="setTheme('dark')"
          >
            <Moon class="w-4 h-4 mb-1" />
            Dark
          </button>
        </div>
      </div>

      <!-- Launch options -->
      <div class="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-700/50">
        <label class="flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
          <span>Reopen open notes on launch</span>
          <input
            type="checkbox"
            :checked="settings.reopenNotesOnLaunch"
            class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            @change="toggleReopen"
          />
        </label>

        <label class="flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
          <span>Launch at login</span>
          <input
            type="checkbox"
            :checked="settings.launchAtLogin"
            class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            @change="toggleLogin"
          />
        </label>
      </div>

      <div class="pt-2 flex justify-end">
        <button
          class="px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-600"
          @click="emit('close')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

