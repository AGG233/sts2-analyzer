<script setup lang="ts">
import Tag from 'primevue/tag'

interface RelicItem {
  id: string
  name: string
  floor: number
}

interface Props {
  relics: RelicItem[]
  gainedIds?: Set<string>
  removedIds?: Set<string>
}

const props = defineProps<Props>()

const getRelicSeverity = (relicId: string): 'success' | 'secondary' | 'danger' | undefined => {
  if (props.gainedIds?.has(relicId)) return 'success'
  if (props.removedIds?.has(relicId)) return 'danger'
  return 'secondary'
}
</script>

<template>
  <div class="tag-list">
    <Tag
      v-for="relic in relics"
      :key="relic.id"
      :value="`${relic.name} F${relic.floor}`"
      :severity="getRelicSeverity(relic.id)"
      :class="{ 'tag-strikethrough': removedIds?.has(relic.id) }"
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
