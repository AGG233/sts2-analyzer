<script setup lang="ts">
import Tag from 'primevue/tag'

interface Props {
  groups: Array<{
    name: string
    upgraded: number
    count: number
    floorAdded: number
  }>
  currentFloor?: number
}

const props = defineProps<Props>()

function isCardGainedThisFloor(floorAdded: number): boolean {
  const currentFloorNum = props.currentFloor ?? 0
  return floorAdded === currentFloorNum
}

function getCardSeverity(group: { upgraded: number; floorAdded: number }): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | undefined {
  if (isCardGainedThisFloor(group.floorAdded)) {
    return 'success'
  }
  if (group.upgraded) {
    return 'warn'
  }
  return 'secondary'
}
</script>

<template>
  <div class="tag-list">
    <Tag
      v-for="(group, idx) in groups"
      :key="idx"
      :value="`${group.name}${group.count > 1 ? ` x${group.count}` : ''}${group.upgraded > 1 ? ` <+${group.upgraded}>` : ''}`"
      :severity="getCardSeverity(group)"
      :class="{ 'tag-bold': group.upgraded > 1 }"
    />
  </div>
</template>

<style scoped>
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-width: 0;
}

.tag-bold {
  font-weight: 700;
}
</style>
