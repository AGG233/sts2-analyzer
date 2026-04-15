<script setup lang="ts">
import AppTag from '~/components/shared/AppTag.vue'
import type { SimDeckCard } from '~/data/analytics'

interface Props {
  deck: SimDeckCard[]
  relics: Array<{
    id: string
    floor_added_to_deck: number
  }>
  hoveredFloor?: number | null
}

const props = defineProps<Props>()

const { t } = useI18n()
const { cardName, relicName } = useGameI18n()

const groupedCurrentDeck = computed(() => {
  const map = new Map<string, { name: string; upgraded: boolean; count: number }>()
  for (const card of props.deck) {
    const lvl = 'current_upgrade_level' in card ?
      (card as { current_upgrade_level?: number }).current_upgrade_level ?? 0 : 0
    const key = `${card.id}|${lvl}`
    if (!map.has(key)) {
      map.set(key, {
        name: cardName(card.id),
        upgraded: lvl > 0,
        count: 1
      })
    } else {
      map.get(key)!.count++
    }
  }
  return Array.from(map.values())
})

const groupedCurrentRelics = computed(() => {
  const map = new Map<string, { name: string; count: number; floor: number }>()
  for (const relic of props.relics) {
    if (!map.has(relic.id)) {
      map.set(relic.id, {
        name: relicName(relic.id),
        count: 1,
        floor: relic.floor_added_to_deck ?? 1
      })
    } else {
      map.get(relic.id)!.count++
    }
  }
  return Array.from(map.values())
})
</script>

<template>
  <div class="deck-relics-section">
    <!-- Deck -->
    <div class="items-section">
      <div class="items-row">
        <span class="items-label">
          {{ hoveredFloor !== null ? `${t('run.deckSize')} (F${hoveredFloor})` : t('run.finalDeck') }}: {{ deck.length }}
        </span>
      </div>
      <div class="items-container deck-container">
        <AppTag
          v-for="(group, idx) in groupedCurrentDeck"
          :key="idx"
          :severity="group.upgraded ? 'warn' : 'secondary'"
        >
          {{ `${group.name}${group.count > 1 ? ` x${group.count}` : ''}` }}
        </AppTag>
      </div>
    </div>

    <!-- Relics -->
    <div class="items-section">
      <div class="items-row">
        <span class="items-label">{{ t('run.relics') }}: {{ relics.length }}</span>
      </div>
      <div class="items-container relics-container">
        <AppTag
          v-for="relic in groupedCurrentRelics"
          :key="relic.name"
          severity="secondary"
        >
          {{ `${relic.name}${relic.count > 1 ? ` x${relic.count}` : ''} F${relic.floor}` }}
        </AppTag>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-relics-section {
  margin-top: 1rem;
}

.items-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.items-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.items-label {
  font-weight: 600;
  color: #e0e0e0;
}

.items-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  max-height: 80px;
  overflow: hidden;
}
</style>
