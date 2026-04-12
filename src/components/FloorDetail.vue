<script setup lang="ts">
import type { SimDeckCard } from '../data/analytics'
import type { FloorPlayerStats, RunFile } from '../data/types'
import Button from 'primevue/button'
import Fieldset from 'primevue/fieldset'
import Tag from 'primevue/tag'
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDeckAtFloor, getFloorTimeline, getRelicsAtFloor } from '../data/analytics'
import { typeColors } from '../data/map'
import { getCharacterColor } from '../data/characters'
import { useGameI18n } from '../locales/lookup'

const props = defineProps<{
  run: RunFile
  floor?: number
}>()

const { t } = useI18n()
const { monsterName, mapTypeName, cardName, relicName, potionName, restSiteChoiceName, modelIdName, characterName } = useGameI18n()

const floors = computed(() => getFloorTimeline(props.run))

const currentFloor = computed(() => {
  if (props.floor === undefined)
    return null
  return floors.value.find(f => f.globalFloor === props.floor) ?? null
})

function typeColor(type: string): string {
  return typeColors[type] ?? typeColors.unknown
}

// ---- Helper functions for merging data per player ----

interface MergedCard {
  id: string
  name: string
  status: 'choice-picked' | 'choice-skipped' | 'gained' | 'transformed-from' | 'transformed-to' | 'upgraded' | 'removed'
}

function buildMergedCards(stats: FloorPlayerStats): MergedCard[] {
  const result: MergedCard[] = []

  for (const choice of stats.card_choices ?? []) {
    result.push({
      id: choice.card.id,
      name: cardName(choice.card.id),
      status: choice.was_picked ? 'choice-picked' : 'choice-skipped',
    })
  }

  const pickedIds = new Set((stats.card_choices ?? []).filter(c => c.was_picked).map(c => c.card.id))
  for (const card of stats.cards_gained ?? []) {
    if (!pickedIds.has(card.id)) {
      result.push({
        id: card.id,
        name: cardName(card.id),
        status: 'gained',
      })
    }
  }

  for (const ct of stats.cards_transformed ?? []) {
    result.push({
      id: ct.original_card.id,
      name: cardName(ct.original_card.id),
      status: 'transformed-from',
    })
    result.push({
      id: ct.final_card.id,
      name: cardName(ct.final_card.id),
      status: 'transformed-to',
    })
  }

  for (const cardId of stats.upgraded_cards ?? []) {
    result.push({
      id: cardId,
      name: cardName(cardId),
      status: 'upgraded',
    })
  }

  for (const card of stats.cards_removed ?? []) {
    result.push({
      id: card.id,
      name: cardName(card.id),
      status: 'removed',
    })
  }

  return result
}

interface MergedRelic {
  id: string
  name: string
  status: 'choice-picked' | 'choice-skipped' | 'gained' | 'removed'
}

function buildMergedRelics(stats: FloorPlayerStats): MergedRelic[] {
  const result: MergedRelic[] = []
  for (const choice of stats.relic_choices ?? []) {
    result.push({
      id: choice.choice,
      name: relicName(choice.choice),
      status: choice.was_picked ? 'choice-picked' : 'choice-skipped',
    })
  }
  for (const relicId of stats.bought_relics ?? []) {
    result.push({
      id: relicId,
      name: relicName(relicId),
      status: 'gained',
    })
  }
  for (const relicId of stats.relics_removed ?? []) {
    result.push({
      id: relicId,
      name: relicName(relicId),
      status: 'removed',
    })
  }
  return result
}

interface MergedPotion {
  id: string
  name: string
  status: 'choice-picked' | 'choice-skipped' | 'used'
}

function buildMergedPotions(stats: FloorPlayerStats): MergedPotion[] {
  const result: MergedPotion[] = []

  for (const choice of stats.potion_choices ?? []) {
    result.push({
      id: choice.choice,
      name: potionName(choice.choice),
      status: choice.was_picked ? 'choice-picked' : 'choice-skipped',
    })
  }

  const pickedIds = new Set((stats.potion_choices ?? []).filter(c => c.was_picked).map(c => c.choice))
  for (const potion of stats.potion_used ?? []) {
    if (!pickedIds.has(potion)) {
      result.push({
        id: potion,
        name: potionName(potion),
        status: 'used',
      })
    }
  }

  return result
}

// ---- Per-player grouped deck/relics ----

function groupDeck(deck: SimDeckCard[]) {
  const map = new Map<string, { name: string, upgraded: number, count: number, floorAdded: number }>()
  for (const card of deck) {
    const key = `${card.id}|${card.upgradeLevel}`
    if (!map.has(key)) {
      map.set(key, { name: cardName(card.id), upgraded: card.upgradeLevel, count: 1, floorAdded: card.floorAdded })
    }
    else {
      map.get(key)!.count++
    }
  }
  return Array.from(map.values())
}

// ---- Aggregate all player details ----

interface PlayerDetail {
  playerIndex: number
  stats: FloorPlayerStats
  character: string
  cards: MergedCard[]
  relics: MergedRelic[]
  potions: MergedPotion[]
  deck: SimDeckCard[]
  groupedDeck: { name: string, upgraded: number, count: number, floorAdded: number }[]
  floorRelics: { id: string, name: string, floor: number }[]
}

const playerDetails = computed<PlayerDetail[]>(() => {
  const f = currentFloor.value
  if (!f)
    return []
  return f.playerStats
    .map((stats, i) => {
      const deck = getDeckAtFloor(props.run, props.floor!, i)
      const relics = getRelicsAtFloor(props.run, props.floor!, i)
      return {
        playerIndex: i,
        stats,
        character: props.run.players[i]?.character ?? '',
        cards: buildMergedCards(stats),
        relics: buildMergedRelics(stats),
        potions: buildMergedPotions(stats),
        deck,
        groupedDeck: groupDeck(deck),
        floorRelics: relics.map(r => ({ id: r.id, name: relicName(r.id), floor: r.floor_added_to_deck })),
      }
    })
    .filter(d => d.stats)
})

function getPlayerColor(characterId: string): string {
  return getCharacterColor(characterId)
}

function getCardSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | undefined {
  switch (status) {
    case 'choice-picked': return 'success'
    case 'choice-skipped': return 'secondary'
    case 'gained': return 'success'
    case 'transformed-from': return 'danger'
    case 'transformed-to': return 'success'
    case 'upgraded': return 'warn'
    case 'removed': return 'danger'
    default: return undefined
  }
}

function isRelicGainedThisFloor(detail: PlayerDetail, relicId: string): boolean {
  return detail.relics.some(r =>
    r.id === relicId &&
    (r.status === 'choice-picked' || r.status === 'gained')
  )
}

function isRelicRemovedThisFloor(detail: PlayerDetail, relicId: string): boolean {
  return detail.relics.some(r => r.id === relicId && r.status === 'removed')
}

function isCardGainedThisFloor(floorAdded: number): boolean {
  const currentFloorNum = props.floor ?? 0
  return floorAdded === currentFloorNum
}

function getCardSeverityForDeck(group: { upgraded: number, floorAdded: number }): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | undefined {
  if (isCardGainedThisFloor(group.floorAdded)) {
    return 'success'
  }
  if (group.upgraded) {
    return 'warn'
  }
  return 'secondary'
}

// Collapsible player cards and sections
const expandedPlayers = reactive<Record<number, boolean>>({})
const expandedSections = reactive<Record<string, boolean>>({})

function togglePlayer(playerIndex: number) {
  expandedPlayers[playerIndex] = !expandedPlayers[playerIndex]
}

function isPlayerExpanded(playerIndex: number): boolean {
  return expandedPlayers[playerIndex] ?? false
}

function toggleSection(key: string) {
  expandedSections[key] = !expandedSections[key]
}

function isSectionExpanded(key: string): boolean {
  return expandedSections[key] ?? false
}

function needsCollapse(items: { length: number }): boolean {
  return items.length > 5
}

// Initialize expanded state for single player
if (playerDetails.value.length === 1) {
  expandedPlayers[0] = true
}
</script>

<template>
  <div v-if="currentFloor && playerDetails.length" class="floor-detail">
    <!-- Shared Floor Header -->
    <div class="floor-header">
      <div class="card-header">
        <div
          class="type-badge"
          :style="{ background: typeColor(currentFloor.mapPoint.map_point_type) }"
        >
          {{ currentFloor.globalFloor }}
        </div>
        <div class="header-info">
          <span class="header-type">{{ mapTypeName(currentFloor.mapPoint.map_point_type) }}</span>
          <span v-if="currentFloor.mapPoint.rooms[0]?.model_id" class="header-model">
            {{ modelIdName(currentFloor.mapPoint.rooms[0].model_id) }}
          </span>
        </div>
        <template v-if="currentFloor.mapPoint.rooms[0]?.monster_ids?.length">
          <div class="header-monsters">
            <Tag
              v-for="monster in currentFloor.mapPoint.rooms[0].monster_ids"
              :key="monster"
              :value="monsterName(monster)"
              severity="info"
              class="monster-tag"
            />
          </div>
        </template>
        <div v-if="(currentFloor.mapPoint.rooms[0]?.turns_taken ?? 0) > 0" class="header-turns">
          ⏱️ {{ currentFloor.mapPoint.rooms[0].turns_taken }}
        </div>
      </div>
    </div>

    <!-- Per-Player Character Cards -->
    <div class="player-cards-grid" :class="{ single: playerDetails.length === 1 }">
      <div
        v-for="detail in playerDetails"
        :key="detail.playerIndex"
        class="player-card"
        :style="{ borderTopColor: getPlayerColor(detail.character) }"
      >
        <!-- Collapsed View: Summary Row -->
        <div class="card-header-row" @click="togglePlayer(detail.playerIndex)">
          <div class="player-identity">
            <span
              class="player-color-dot"
              :style="{ background: getPlayerColor(detail.character) }"
            />
            <span class="player-name">{{ characterName(detail.character) }}</span>
          </div>

          <div class="card-stats-inline">
            <!-- HP -->
            <span class="stat-item-inline">
              <span class="stat-icon">❤️</span>
              <span class="stat-value-inline">
                <span class="value">{{ detail.stats.current_hp }}</span>
                <span class="separator">/</span>
                <span class="value">{{ detail.stats.max_hp }}</span>
              </span>
              <Tag v-if="detail.stats.damage_taken > 0" :value="`-${detail.stats.damage_taken}`" severity="danger" class="change-tag" />
              <Tag v-if="detail.stats.hp_healed > 0" :value="`+${detail.stats.hp_healed}`" severity="success" class="change-tag" />
            </span>

            <!-- Gold -->
            <span class="stat-item-inline">
              <span class="stat-icon">💰</span>
              <span class="stat-value-inline">
                <span class="value">{{ detail.stats.current_gold }}g</span>
              </span>
              <Tag v-if="detail.stats.gold_gained > 0" :value="`+${detail.stats.gold_gained}`" severity="success" class="change-tag" />
              <Tag v-if="detail.stats.gold_spent > 0" :value="`-${detail.stats.gold_spent}`" severity="danger" class="change-tag" />
            </span>

            <!-- Potions -->
            <span v-if="detail.potions.length > 0" class="stat-item-inline">
              <span class="stat-icon">🧪</span>
              <Tag
                v-for="pot in detail.potions"
                :key="pot.id"
                :value="pot.name"
                :severity="pot.status === 'choice-picked' ? 'success' : pot.status === 'used' ? 'secondary' : undefined"
                :class="{ 'tag-strikethrough': pot.status === 'choice-skipped' || pot.status === 'used' }"
                class="potion-tag"
              />
            </span>

            <!-- Rest Site Choice -->
            <span v-if="detail.stats.rest_site_choices?.length" class="stat-item-inline">
              <span class="stat-label-inline">{{ t('ui.run.restSiteChoice') }}:</span>
              <Tag :value="detail.stats.rest_site_choices.map(restSiteChoiceName).join(', ')" />
            </span>

            <!-- Event Choices -->
            <span v-if="detail.stats.event_choices?.length" class="stat-item-inline">
              <span class="stat-label-inline">{{ t('ui.run.eventChoices') }}:</span>
              <Tag
                v-for="(choice, index) in detail.stats.event_choices"
                :key="index"
                :value="choice.title?.key ? t(`game.${choice.title.table}.${choice.title.key}`) : ''"
                severity="info"
              />
            </span>

            <!-- Relic Changes -->
            <span v-if="detail.relics.length > 0" class="stat-item-inline">
              <span class="stat-icon">🎁</span>
              <Tag
                v-for="(relic, index) in detail.relics"
                :key="index"
                :value="`${relic.status === 'removed' ? '✕ ' : ''}${relic.name}`"
                :severity="relic.status === 'choice-picked' || relic.status === 'gained' ? 'success' : relic.status === 'removed' ? 'danger' : 'secondary'"
                :class="{ 'tag-strikethrough': relic.status === 'choice-skipped' || relic.status === 'removed' }"
                class="relic-tag"
              />
            </span>

            <!-- Card Changes -->
            <span v-if="detail.cards.length > 0" class="stat-item-inline">
              <span class="stat-icon">🃏</span>
              <Tag
                v-for="(item, index) in detail.cards"
                :key="index"
                :value="`${item.status === 'transformed-from' ? '↗ ' : item.status === 'transformed-to' ? '↘ ' : item.status === 'removed' ? '✕ ' : ''}${item.name}`"
                :severity="getCardSeverity(item.status)"
                :class="{ 'tag-strikethrough': item.status === 'choice-skipped' || item.status === 'transformed-from' || item.status === 'removed' }"
                class="card-tag"
              />
            </span>
          </div>

          <span class="expand-icon">
            <i class="pi" :class="isPlayerExpanded(detail.playerIndex) ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
          </span>
        </div>

        <!-- Expanded View: Details -->
        <div v-if="isPlayerExpanded(detail.playerIndex)" class="player-detail">
          <!-- Relics at Floor -->
          <Fieldset class="card-fieldset" :legend="`${t('ui.run.relics')}: ${detail.floorRelics.length}`">
            <div class="tag-list">
              <Tag
                v-for="relic in detail.floorRelics"
                :key="relic.id"
                :value="`${relic.name} F${relic.floor}`"
                :severity="isRelicGainedThisFloor(detail, relic.id) ? 'success' : isRelicRemovedThisFloor(detail, relic.id) ? 'danger' : 'secondary'"
                :class="{ 'tag-strikethrough': isRelicRemovedThisFloor(detail, relic.id) }"
              />
            </div>
          </Fieldset>

          <!-- Deck at Floor -->
          <Fieldset class="card-fieldset" :legend="`${t('ui.run.deckSize')}: ${detail.deck.length}`">
            <div class="tag-list">
              <Tag
                v-for="(group, idx) in detail.groupedDeck"
                :key="idx"
                :value="`${group.name}${group.count > 1 ? ` x${group.count}` : ''}${group.upgraded > 1 ? ` <+${group.upgraded}>` : ''}`"
                :severity="getCardSeverityForDeck(group)"
                :class="{ 'tag-bold': group.upgraded > 1 }"
              />
            </div>
          </Fieldset>
        </div>
      </div>
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
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
}

.player-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

/* Card Header Row */
.card-header-row {
  display: flex;
  align-items: center;
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
}

/* Stats Inline */
.card-stats-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  overflow: hidden;
}

.stat-item-inline {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
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
}

.expand-icon:hover {
  color: #e0e0e0;
}

/* Player Detail */
.player-detail {
  padding: 0.75rem;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 1000px; }
}

/* Tag list */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-width: 0;
}

.tag-list-collapsed {
  max-height: 32px;
  overflow: hidden;
}

.collapse-btn {
  margin-top: 0.35rem;
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
