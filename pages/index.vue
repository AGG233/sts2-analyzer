<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="home-page">
    <header class="header">
      <h1>{{ t('ui.home.title') }}</h1>
      <p>{{ t('ui.home.subtitle') }}</p>
    </header>
    <main class="content">
      <div class="placeholder">
        <p>{{ t('ui.home.placeholder') || 'Page under construction...' }}</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a1628;
}

.header {
  padding: 2rem;
  text-align: center;
  background: linear-gradient(135deg, #11223f 0%, #0a1628 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 2.5rem;
  color: #ffc107;
}

.header p {
  margin: 0.5rem 0 0;
  color: #8aa0b8;
  font-size: 1.1rem;
}

.content {
  flex: 1;
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  padding: 2rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.placeholder p {
  color: #8aa0b8;
  font-size: 1.2rem;
}
</style>
