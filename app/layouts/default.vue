<script setup lang="ts">
import AnimatedBackground from '~/components/AnimatedBackground.vue'
import NotificationSystem from '~/components/NotificationSystem.vue'
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
