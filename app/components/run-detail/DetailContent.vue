<script setup lang="ts">
import FloorDetail from '~/components/floor-detail/FloorDetail.vue'
import type { RunFile } from '~/data/types'

const props = defineProps<{
  run: RunFile
  selectedFloor?: number
}>()
</script>

<template>
  <div class="detail-content">
    <div class="floor-detail-wrapper">
      <FloorDetail
        :run="run"
        :floor="selectedFloor"
      />
    </div>
  </div>
</template>

<style scoped>
.detail-content {
  flex: 1;
}

.floor-detail-wrapper {
  overflow-y: auto;
}
</style>
