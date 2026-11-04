<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const version = ref('0.1.0')

onMounted(async () => {
  if (window.stikly) {
    const theme = await window.stikly.getTheme()
    document.documentElement.setAttribute('data-theme', theme.resolved)
    window.stikly.onThemeChanged((newTheme) => {
      document.documentElement.setAttribute('data-theme', newTheme.resolved)
    })
  }
})
</script>

<template>
  <div class="h-full flex flex-col p-4">
    <header class="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
      <h1 class="text-xl font-bold tracking-tight">{{ t('app.title') }}</h1>
      <span class="text-xs text-stone-500">v{{ version }}</span>
    </header>
    <main class="flex-1 flex items-center justify-center text-stone-400">
      <p>{{ t('app.noNotesDesc') }}</p>
    </main>
  </div>
</template>
