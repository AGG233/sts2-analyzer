<script setup lang="ts">
import AppTag from '~/components/shared/AppTag.vue'
import type { MergedPotion } from './merge-utils'

interface Props {
  potions: MergedPotion[]
}

const props = defineProps<Props>()

const getPotionSeverity = (status: string): 'success' | 'secondary' | undefined => {
  switch (status) {
    case 'choice-picked':
      return 'success'
    case 'used':
      return 'secondary'
    default:
      return undefined
  }
}
</script>

<template>
  <div class="tag-list">
    <AppTag
      v-for="pot in potions"
      :key="pot.id"
      :severity="getPotionSeverity(pot.status)"
      :class="{ 'tag-strikethrough': pot.status === 'choice-skipped' || pot.status === 'used' }"
    >{{ pot.name }}</AppTag>
  </div>
</template>

<style scoped>
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag-strikethrough {
  text-decoration: line-through;
  opacity: 0.6;
}
</style>
