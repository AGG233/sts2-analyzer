<script setup lang="ts">
import Button from 'primevue/button'
import { ref } from 'vue'

const { locale } = useI18n()

const languages = [
  { name: 'English', code: 'en', icon: 'pi pi-globe' },
  { name: '中文', code: 'zh', icon: 'pi pi-globe' },
  { name: '日本語', code: 'ja', icon: 'pi pi-globe' },
  { name: '한국어', code: 'ko', icon: 'pi pi-globe' },
  { name: 'Deutsch', code: 'de', icon: 'pi pi-globe' },
  { name: 'Français', code: 'fr', icon: 'pi pi-globe' },
  { name: 'Español', code: 'es', icon: 'pi pi-globe' },
  { name: 'Italiano', code: 'it', icon: 'pi pi-globe' },
  { name: 'Polski', code: 'pl', icon: 'pi pi-globe' },
  { name: 'Português', code: 'pt', icon: 'pi pi-globe' },
  { name: 'Русский', code: 'ru', icon: 'pi pi-globe' },
  { name: 'Türkçe', code: 'tr', icon: 'pi pi-globe' },
  { name: 'ไทย', code: 'th', icon: 'pi pi-globe' },
]

const showDropdown = ref(false)
</script>

<template>
  <div class="language-switch">
    <Button
      icon="pi pi-globe"
      text
      @click="showDropdown = !showDropdown"
      class="lang-button"
    />
    <div
      v-if="showDropdown"
      class="lang-dropdown"
      @click-outside="showDropdown = false"
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
