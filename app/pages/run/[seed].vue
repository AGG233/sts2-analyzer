<script setup lang="ts">
const route = useRoute();
</script>

<template>
  <RunDetailView :seed="route.params.seed as string" />
</template>
