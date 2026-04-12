<script setup lang="ts">
import Tag from 'primevue/tag'
import type { GroupedDeckItem } from './merge-utils'

interface Props {
  groups: GroupedDeckItem[]
  currentFloor?: number
}

const props = defineProps<Props>()

const getCardSeverity = (group: GroupedDeckItem): 'success' | 'secondary' | 'warn' | undefined => {
  if (props.currentFloor && group.floorAdded === props.currentFloor) {
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
