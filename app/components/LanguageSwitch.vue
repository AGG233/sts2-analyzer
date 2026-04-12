<script setup lang="ts">
import Select from 'primevue/select'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const languages = [
  { name: 'English', code: 'en' },
  { name: '中文', code: 'zh' },
  { name: '日本語', code: 'ja' },
  { name: '한국어', code: 'ko' },
  { name: 'Deutsch', code: 'de' },
  { name: 'Français', code: 'fr' },
  { name: 'Español', code: 'es' },
  { name: 'Italiano', code: 'it' },
  { name: 'Polski', code: 'pl' },
  { name: 'Português', code: 'pt' },
  { name: 'Русский', code: 'ru' },
  { name: 'Türkçe', code: 'tr' },
  { name: 'ไทย', code: 'th' },
]
</script>

<template>
  <Select
    v-model="locale"
    :options="languages"
    option-label="name"
    option-value="code"
    class="lang-select"
  />
</template>

<style scoped>
.lang-select {
  min-width: 120px;
}
</style>
