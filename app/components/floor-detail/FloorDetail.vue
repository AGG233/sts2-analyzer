<script setup lang="ts">
import type { RunFile } from '~/data/types'
import { computed, reactive, watch } from 'vue'
import { getFloorTimeline, getDeckAtFloor, getRelicsAtFloor } from '~/data/analytics'
import { useGameI18n } from '~/locales/lookup'
import FloorHeader from './FloorHeader.vue'
import PlayerCard from './PlayerCard.vue'
import {
  buildMergedCards,
  buildMergedRelics,
  buildMergedPotions,
  groupDeck
} from './merge-utils'

const props = defineProps<{
  run: RunFile
  floor?: number
}>()

const { t } = useI18n()
const {
  cardName,
  relicName,
  potionName
} = useGameI18n()

const floors = computed(() => getFloorTimeline(props.run))

const currentFloor = computed(() => {
  if (props.floor === undefined) return null
  return floors.value.find(f => f.globalFloor === props.floor) ?? null
})

interface PlayerDetail {
  playerIndex: number
  stats: any
  character: string
  cards: any[]
  relics: any[]
  potions: any[]
  deck: any[]
  groupedDeck: any[]
  floorRelics: any[]
}

const playerDetails = computed<PlayerDetail[]>(() => {
  const f = currentFloor.value
  if (!f) return []

  return f.playerStats
    .map((stats, i) => {
      const deck = getDeckAtFloor(props.run, props.floor!, i)
      const relics = getRelicsAtFloor(props.run, props.floor!, i)
      return {
        playerIndex: i,
        stats,
        character: props.run.players[i]?.character ?? '',
        cards: buildMergedCards(stats, cardName),
        relics: buildMergedRelics(stats, relicName),
        potions: buildMergedPotions(stats, potionName),
        deck,
        groupedDeck: groupDeck(deck, cardName),
        floorRelics: relics.map(r => ({
          id: r.id,
          name: relicName(r.id),
          floor: r.floor_added_to_deck
        })),
      }
    })
    .filter(d => d.stats)
})

const expandedPlayers = reactive<Record<number, boolean>>({})

const togglePlayer = (playerIndex: number) => {
  expandedPlayers[playerIndex] = !expandedPlayers[playerIndex]
}

const isPlayerExpanded = (playerIndex: number): boolean => {
  return expandedPlayers[playerIndex] ?? false
}

watch(playerDetails, (details) => {
  if (details.length === 1 && !expandedPlayers[0]) {
    expandedPlayers[0] = true
  }
}, { immediate: true })
</script>

<template>
  <div v-if="currentFloor && playerDetails.length" class="floor-detail">
    <!-- Shared Floor Header -->
    <FloorHeader :floor="currentFloor" />

    <!-- Per-Player Character Cards -->
    <div class="player-cards-grid" :class="{ single: playerDetails.length === 1 }">
      <PlayerCard
        v-for="detail in playerDetails"
        :key="detail.playerIndex"
        :player-index="detail.playerIndex"
        :stats="detail.stats"
        :character="detail.character"
        :cards="detail.cards"
        :relics="detail.relics"
        :potions="detail.potions"
        :deck="detail.deck"
        :floor-relics="detail.floorRelics"
        :is-expanded="isPlayerExpanded(detail.playerIndex)"
        @toggle="togglePlayer"
      />
    </div>
  </div>

  <div v-else class="floor-detail-empty">
    <p>{{ t('run.selectFloorToView') }}</p>
  </div>
</template>

<style scoped>
.floor-detail {
  padding: 1rem;
}

.floor-detail-empty {
  padding: 2rem;
  text-align: center;
  color: #5a7a9a;
}

/* Player Cards Grid */
.player-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.player-cards-grid.single {
  grid-template-columns: 1fr;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .player-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
