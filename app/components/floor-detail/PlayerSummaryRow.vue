<script setup lang="ts">
import Tag from 'primevue/tag'
import type { FloorPlayerStats } from '~/data/types'
import type { MergedCard, MergedRelic, MergedPotion } from './merge-utils'
import { getCharacterColor } from '~/data/characters'

interface Props {
  stats: FloorPlayerStats
  character: string
  cards: MergedCard[]
  relics: MergedRelic[]
  potions: MergedPotion[]
}

const props = defineProps<Props>()

const { t } = useI18n()
const { characterName, restSiteChoiceName } = useGameI18n()

const getCardSeverity = (status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | undefined => {
  switch (status) {
    case 'choice-picked':
      return 'success'
    case 'choice-skipped':
      return 'secondary'
    case 'gained':
      return 'success'
    case 'transformed-from':
      return 'danger'
    case 'transformed-to':
      return 'success'
    case 'upgraded':
      return 'warn'
    case 'removed':
      return 'danger'
    default:
      return undefined
  }
}
</script>

<template>
  <div class="player-summary-row">
    <div class="player-identity">
      <span
        class="player-color-dot"
        :style="{ background: getCharacterColor(character) }"
      />
      <span class="player-name">{{ characterName(character) }}</span>
    </div>

    <div class="card-stats-inline">
      <!-- HP -->
      <span class="stat-item-inline">
        <span class="stat-icon">❤️</span>
        <span class="stat-value-inline">
          <span class="value">{{ stats.current_hp }}</span>
          <span class="separator">/</span>
          <span class="value">{{ stats.max_hp }}</span>
        </span>
        <Tag v-if="stats.damage_taken > 0" :value="`-${stats.damage_taken}`" severity="danger" class="change-tag" />
        <Tag v-if="stats.hp_healed > 0" :value="`+${stats.hp_healed}`" severity="success" class="change-tag" />
        <Tag v-if="stats.max_hp_gained > 0" :value="`+${stats.max_hp_gained}`" severity="success" class="change-tag" />
        <Tag v-if="stats.max_hp_lost > 0" :value="`-${stats.max_hp_lost}`" severity="danger" class="change-tag" />
      </span>

      <!-- Gold -->
      <span class="stat-item-inline">
        <span class="stat-icon">💰</span>
        <span class="stat-value-inline">
          <span class="value">{{ stats.current_gold }}g</span>
        </span>
        <Tag v-if="stats.gold_gained > 0" :value="`+${stats.gold_gained}`" severity="success" class="change-tag" />
        <Tag v-if="stats.gold_spent > 0" :value="`-${stats.gold_spent}`" severity="danger" class="change-tag" />
        <Tag v-if="stats.gold_stolen > 0" :value="`-${stats.gold_stolen}`" severity="danger" class="change-tag" />
      </span>

      <!-- Potions -->
      <span class="stat-item-inline">
        <span class="stat-icon">🧪</span>
        <span class="stat-value-inline">
          <span class="value">{{ stats.potion_choices?.length || 0 }}c/{{ stats.potion_used?.length || 0 }}u</span>
        </span>
      </span>

      <!-- Rest Site -->
      <span class="stat-item-inline">
        <span class="stat-icon">🏕️</span>
        <span class="stat-value-inline">
          <span class="value">{{ stats.rest_site_choices?.map(c => restSiteChoiceName(c)).join(', ') }}</span>
        </span>
      </span>

      <!-- Event -->
      <span class="stat-item-inline">
        <span class="stat-icon">🎲</span>
        <span class="stat-value-inline">
          <span class="value">{{ stats.event_choices?.length || 0 }}</span>
        </span>
      </span>

      <!-- Relics -->
      <span class="stat-item-inline">
        <span class="stat-icon">💎</span>
        <span class="stat-value-inline">
          <span class="value">{{ stats.relic_choices?.length || 0 }}c/{{ stats.bought_relics?.length || 0 }}g/{{ stats.relics_removed?.length || 0 }}r</span>
        </span>
      </span>

      <!-- Cards -->
      <span class="stat-item-inline">
        <span class="stat-icon">🃏</span>
        <span class="stat-value-inline">
          <span class="value">{{ stats.card_choices?.length || 0 }}c/{{ stats.cards_gained?.length || 0 }}g/{{ stats.cards_transformed?.length || 0 }}t/{{ stats.upgraded_cards?.length || 0 }}u/{{ stats.cards_removed?.length || 0 }}r</span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.player-summary-row {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.player-identity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 180px;
}

.player-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player-name {
  font-weight: 600;
  color: var(--text-color);
}

.card-stats-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  flex: 1;
}

.stat-item-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.stat-value-inline {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.stat-value-inline .value {
  font-weight: 500;
  color: var(--text-color);
}

.stat-value-inline .separator {
  color: var(--text-secondary-color);
  font-size: 0.9rem;
}

.change-tag {
  min-width: auto;
}
</style>
