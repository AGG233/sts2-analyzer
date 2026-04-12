<script setup lang="ts">
import type { RunFile } from '../data/types'
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getFloorTimeline, getDeckAtFloor, getRelicsAtFloor } from '../data/analytics'
import { useGameI18n } from '../locales/lookup'
import FloorHeader from './floor-detail/FloorHeader.vue'
import PlayerCard from './floor-detail/PlayerCard.vue'
import {
  buildMergedCards,
  buildMergedRelics,
  buildMergedPotions,
  groupDeck
} from './floor-detail/merge-utils'

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
    <p>{{ t('ui.run.selectFloorToView') }}</p>
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

/* Shared Floor Header */
.floor-header {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

/* Card Header */
.card-header {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.type-badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.header-type {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e0e0e0;
}

.header-model {
  color: #8aa0b8;
  font-size: 0.9rem;
}

.header-turns {
  color: #8aa0b8;
  font-size: 0.9rem;
  font-weight: 600;
  flex-shrink: 0;
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

/* Per-Player Card */
.player-card {
  background: rgba(15, 31, 53, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 3px solid transparent;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}

.player-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

/* Card Header Row */
.card-header-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* Player Identity */
.player-identity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding-top: 0.2rem;
}

.player-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: #e0e0e0;
  white-space: nowrap;
}

/* Stats Inline */
.card-stats-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.stat-item-inline {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.stat-item-inline .stat-label-inline {
  font-size: 0.8rem;
  font-weight: 600;
  color: #8aa0b8;
}

.stat-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.stat-value-inline {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2rem;
}

.stat-value-inline .value {
  font-weight: 700;
  font-size: 0.95rem;
}

.stat-value-inline .value:first-child {
  color: #ef5350;
}

.stat-value-inline .value:last-child {
  color: #e0e0e0;
}

.separator {
  color: #5a7a9a;
  font-size: 0.85rem;
}

.change-tag {
  font-size: 0.75rem;
}

.potion-tag {
  font-size: 0.8rem;
}

.relic-tag {
  font-size: 0.8rem;
}

.card-tag {
  font-size: 0.8rem;
}

.tag-strikethrough {
  text-decoration: line-through;
  opacity: 0.6;
}

.tag-bold {
  font-weight: 700;
}

/* Expand Icon */
.expand-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8aa0b8;
  flex-shrink: 0;
  padding-top: 0.2rem;
}

.expand-icon:hover {
  color: #e0e0e0;
}

/* Player Detail */
.player-detail {
  padding: 0.75rem;
  max-height: 600px;
  overflow-y: auto;
}

/* Tag list */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-width: 0;
}

.header-monsters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-left: auto;
  margin-right: 10px;
}

.monster-tag {
  font-size: 0.8rem;
}

/* Fieldset */
.card-fieldset {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 200px;
}

.card-fieldset:last-child {
  border-bottom: none;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .player-cards-grid {
    grid-template-columns: 1fr;
  }

  .card-header-row {
    flex-direction: column;
    align-items: stretch;
  }

  .card-stats-inline {
    margin-top: 0.5rem;
  }

  .expand-icon {
    align-self: flex-end;
  }
}
</style>
