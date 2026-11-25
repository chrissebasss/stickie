<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, Sun, Moon, Laptop, Languages, Type } from 'lucide-vue-next'
import type { Settings, ThemeMode, LanguageMode, FontMode } from '../../../shared/types'

const props = defineProps<{
  settings: Settings
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<Settings>): void
  (e: 'close'): void
}>()

const { t } = useI18n()

function setTheme(theme: ThemeMode) {
  emit('update', { theme })
}

function setLanguage(language: LanguageMode) {
  emit('update', { language })
}

function setFont(font: FontMode) {
  emit('update', { font })
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
        <h3 class="font-semibold text-stone-900 dark:text-stone-100 text-sm">{{ t('settings.title') }}</h3>
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
        <label class="text-xs font-medium text-stone-700 dark:text-stone-300">{{ t('settings.theme') }}</label>
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
            {{ t('settings.themeSystem') }}
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
            {{ t('settings.themeLight') }}
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
            {{ t('settings.themeDark') }}
          </button>
        </div>
      </div>

      <!-- Language Switcher -->
      <div class="space-y-2">
        <label class="text-xs font-medium text-stone-700 dark:text-stone-300">{{ t('settings.language') }}</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            class="flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all text-center"
            :class="
              (settings.language || 'system') === 'system'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 text-stone-600 dark:text-stone-300'
            "
            @click="setLanguage('system')"
          >
            <Languages class="w-4 h-4 mb-1" />
            <span class="truncate w-full">{{ t('settings.langSystem') }}</span>
          </button>

          <button
            class="flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all"
            :class="
              settings.language === 'en'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 text-stone-600 dark:text-stone-300'
            "
            @click="setLanguage('en')"
          >
            <span class="text-xs font-bold mb-1">EN</span>
            {{ t('settings.langEn') }}
          </button>

          <button
            class="flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all"
            :class="
              settings.language === 'nb'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 text-stone-600 dark:text-stone-300'
            "
            @click="setLanguage('nb')"
          >
            <span class="text-xs font-bold mb-1">NO</span>
            {{ t('settings.langNb') }}
          </button>
        </div>
      </div>

      <!-- Font Switcher -->
      <div class="space-y-2">
        <label class="text-xs font-medium text-stone-800 dark:text-stone-300 flex items-center space-x-1.5">
          <Type class="w-3.5 h-3.5" />
          <span>{{ t('settings.font') }}</span>
        </label>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="f in (['system', 'sans', 'serif', 'mono'] as const)"
            :key="f"
            class="px-2 py-2 rounded-lg border text-xs font-medium transition-all text-center"
            :class="
              (settings.font || 'system') === f
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 text-stone-700 dark:text-stone-300'
            "
            @click="setFont(f)"
          >
            {{ t(`settings.font${f.charAt(0).toUpperCase()}${f.slice(1)}`) }}
          </button>
        </div>
      </div>

      <!-- Launch options -->
      <div class="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-700/50">
        <label class="flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
          <span>{{ t('settings.reopenOnLaunch') }}</span>
          <input
            type="checkbox"
            :checked="settings.reopenNotesOnLaunch"
            class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            @change="toggleReopen"
          />
        </label>

        <label class="flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
          <span>{{ t('settings.launchAtLogin') }}</span>
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
          {{ t('settings.done') }}
        </button>
      </div>
    </div>
  </div>
</template>

