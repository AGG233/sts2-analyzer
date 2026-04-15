<script setup lang="ts">
import AppButton from '~/components/shared/AppButton.vue'

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

const showDropdown = ref(false)

function handleClickOutside(event: Event) {
  const target = event.target as Element
  if (!target.closest('.language-switch')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="language-switch">
    <AppButton
      variant="text"
      size="small"
      @click="showDropdown = !showDropdown"
      class="lang-button"
    >
      🌐
    </AppButton>
    <div
      v-if="showDropdown"
      class="lang-dropdown"
    >
      <select
        v-model="locale"
        class="lang-select"
        @change="showDropdown = false"
      >
        <option
          v-for="lang in languages"
          :key="lang.code"
          :value="lang.code"
        >
          {{ lang.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.language-switch {
  position: relative;
}

.lang-button {
  color: #e0e0e0;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  width: 40px;
  height: 40px;
}

.lang-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.lang-dropdown {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  width: 150px;
  z-index: 1000;
}

.lang-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(10, 22, 40, 0.95);
  color: #e0e0e0;
  cursor: pointer;
}

.lang-select option {
  background: #0a1628;
  color: #e0e0e0;
}

.lang-select:focus {
  outline: none;
  border-color: #f9a825;
}
</style>
