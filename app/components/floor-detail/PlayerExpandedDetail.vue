<script setup lang="ts">
import Fieldset from 'primevue/fieldset'
import DeckTags from './DeckTags.vue'
import RelicTags from './RelicTags.vue'
import type { SimDeckCard } from '~/data/analytics'
import { computed } from 'vue'
import { useGameI18n } from '~/locales/lookup'

interface Props {
  deck: SimDeckCard[]
  floorRelics: Array<{
    id: string
    name: string
    floor: number
  }>
  gainedIds: Set<string>
  removedIds: Set<string>
  currentFloor?: number
}

const props = defineProps<Props>()

const { t } = useI18n()
const { cardName } = useGameI18n()

const groupedDeck = computed(() => {
  const map = new Map<
    string,
    { name: string; upgraded: number; count: number; floorAdded: number }
  >()
  for (const card of props.deck) {
    const key = `${card.id}|${card.upgradeLevel}`
    if (!map.has(key)) {
      map.set(key, {
        name: cardName(card.id),
        upgraded: card.upgradeLevel,
        count: 1,
        floorAdded: card.floorAdded,
      })
    } else {
      map.get(key)!.count++
    }
  }
  return Array.from(map.values())
})
</script>

<template>
  <div class="player-detail">
    <Fieldset class="card-fieldset" :legend="`${t('run.relics')}: ${floorRelics.length}`">
      <RelicTags
        :relics="floorRelics"
        :gained-ids="gainedIds"
        :removed-ids="removedIds"
      />
    </Fieldset>

    <Fieldset class="card-fieldset" :legend="`${t('run.deckSize')}: ${deck.length}`">
      <DeckTags
        :groups="groupedDeck"
        :current-floor="currentFloor"
      />
    </Fieldset>
  </div>
</template>

<style scoped>
.player-detail {
  padding: 0.75rem;
  max-height: 600px;
  overflow-y: auto;
}

.card-fieldset {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 200px;
}

.card-fieldset:last-child {
  border-bottom: none;
}
</style>
