<script setup lang="ts">
import Tag from 'primevue/tag'

interface Props {
  relics: Array<{
    id: string
    name: string
    floor: number
  }>
  gainedIds: Set<string>
  removedIds: Set<string>
}

const props = defineProps<Props>()

function isRelicGained(relicId: string): boolean {
  return props.gainedIds.has(relicId)
}

function isRelicRemoved(relicId: string): boolean {
  return props.removedIds.has(relicId)
}
</script>

<template>
  <div class="tag-list">
    <Tag
      v-for="relic in relics"
      :key="relic.id"
      :value="`${relic.name} F${relic.floor}`"
      :severity="isRelicGained(relic.id) ? 'success' : isRelicRemoved(relic.id) ? 'danger' : 'secondary'"
      :class="{ 'tag-strikethrough': isRelicRemoved(relic.id) }"
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

.tag-strikethrough {
  text-decoration: line-through;
  opacity: 0.6;
}
</style>
