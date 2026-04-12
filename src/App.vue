<script setup lang="ts">
import Menubar from 'primevue/menubar'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import LanguageSwitch from './components/LanguageSwitch.vue'

const { t } = useI18n()
const router = useRouter()

const items = [
  {
    label: t('ui.app.title'),
    icon: 'pi pi-home',
    command: () => router.push('/'),
  },
]
</script>

<template>
  <div class="app-root">
    <Menubar :model="items" class="app-navbar">
      <template #start>
        <router-link to="/" class="nav-title">
          {{ t('ui.app.title') }}
        </router-link>
      </template>
      <template #end>
        <LanguageSwitch />
      </template>
    </Menubar>
    <router-view />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
  background: url('/bg.png') center center / cover no-repeat fixed;
}

.app-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  border-radius: 0;
  height: 60px;
  background: rgba(10, 22, 40, 0.92) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.nav-title {
  font-weight: 700;
  font-size: 1rem;
  color: #f9a825;
  text-decoration: none;
}

.nav-title:hover {
  color: #fdd835;
}
</style>
