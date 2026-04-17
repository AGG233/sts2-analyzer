<script setup lang="ts">
import { useRunStore } from "~/stores/runStore";

const store = useRunStore();
onMounted(() => store.init());
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
