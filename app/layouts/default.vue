<script setup lang="ts">
</script>

<template>
  <div class="app-root">
    <ClientOnly>
      <AnimatedBackground />
    </ClientOnly>
    <ClientOnly>
      <NotificationSystem />
    </ClientOnly>

    <slot />
  </div>
</template>

<style scoped>
.app-root {
  height: 100vh;
  overflow: hidden;
  position: relative;
}
</style>
