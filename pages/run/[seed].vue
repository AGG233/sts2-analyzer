<script setup lang="ts">
import RunDetailView from '~/components/run-detail/RunDetailView.vue'

const route = useRoute()
const seed = computed(() => route.params.seed as string)
</script>

<template>
  <RunDetailView :seed="seed" />
</template>
