<script setup lang="ts">
const route = useRoute();
const _seed = computed(() => route.params.seed as string);
</script>

<template>
  <RunDetailView :seed="seed" />
</template>
