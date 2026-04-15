<script setup lang="ts">
import AppTag from '~/components/shared/AppTag.vue'
import type { FloorPlayerStats } from '~/data/types'
import type { MergedCard, MergedRelic, MergedPotion } from './merge-utils'
import { getCharacterColor } from '~/data/characters'
import { Heart, Coins, FlaskConical, Tent, Dices, Gem, Scroll } from '@lucide/vue'

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
        <Heart class="stat-icon text-danger" />
        <span class="stat-value-inline">
          <span class="value">{{ stats.current_hp }}</span>
          <span class="separator">/</span>
          <span class="value">{{ stats.max_hp }}</span>
        </span>
        <AppTag v-if="stats.damage_taken > 0" severity="danger" class="change-tag">-{{ stats.damage_taken }}</AppTag>
        <AppTag v-if="stats.hp_healed > 0" severity="success" class="change-tag">+{{ stats.hp_healed }}</AppTag>
        <AppTag v-if="stats.max_hp_gained > 0" severity="success" class="change-tag">+{{ stats.max_hp_gained }}</AppTag>
        <AppTag v-if="stats.max_hp_lost > 0" severity="danger" class="change-tag">-{{ stats.max_hp_lost }}</AppTag>
      </span>

      <!-- Gold -->
      <span class="stat-item-inline">
        <Coins class="stat-icon text-warn" />
        <span class="stat-value-inline">
          <span class="value">{{ stats.current_gold }}g</span>
        </span>
        <AppTag v-if="stats.gold_gained > 0" severity="success" class="change-tag">+{{ stats.gold_gained }}</AppTag>
        <AppTag v-if="stats.gold_spent > 0" severity="danger" class="change-tag">-{{ stats.gold_spent }}</AppTag>
        <AppTag v-if="stats.gold_stolen > 0" severity="danger" class="change-tag">-{{ stats.gold_stolen }}</AppTag>
      </span>

      <!-- Potions -->
      <span class="stat-item-inline">
        <FlaskConical class="stat-icon text-info" />
        <span class="stat-value-inline">
          <span class="value">{{ stats.potion_choices?.length || 0 }}c/{{ stats.potion_used?.length || 0 }}u</span>
        </span>
      </span>

      <!-- Rest Site -->
      <span class="stat-item-inline">
        <Tent class="stat-icon text-success" />
        <span class="stat-value-inline">
          <span class="value">{{ stats.rest_site_choices?.map(c => restSiteChoiceName(c)).join(', ') }}</span>
        </span>
      </span>

      <!-- Event -->
      <span class="stat-item-inline">
        <Dices class="stat-icon text-accent" />
        <span class="stat-value-inline">
          <span class="value">{{ stats.event_choices?.length || 0 }}</span>
        </span>
      </span>

      <!-- Relics -->
      <span class="stat-item-inline">
        <Gem class="stat-icon text-warn" />
        <span class="stat-value-inline">
          <span class="value">{{ stats.relic_choices?.length || 0 }}c/{{ stats.bought_relics?.length || 0 }}g/{{ stats.relics_removed?.length || 0 }}r</span>
        </span>
      </span>

      <!-- Cards -->
      <span class="stat-item-inline">
        <Scroll class="stat-icon text-secondary" />
        <span class="stat-value-inline">
          <span class="value">{{ stats.card_choices?.length || 0 }}c/{{ stats.cards_gained?.length || 0 }}g/{{ stats.cards_transformed?.length || 0 }}t/{{ stats.upgraded_cards?.length || 0 }}u/{{ stats.cards_removed?.length || 0 }}r</span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.player-summary-row {
  display: flex;
  align-items: center;
  padding: $space-md $space-lg;
  background-color: rgba(255, 255, 255, 0.03);
  border-radius: $radius-lg;
  margin-bottom: $space-sm;
  gap: $space-lg;
}

.player-identity {
  display: flex;
  align-items: center;
  gap: $space-sm;
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
  color: $text-primary;
}

.card-stats-inline {
  display: flex;
  flex-wrap: wrap;
  gap: $space-lg;
  flex: 1;
}

.stat-item-inline {
  display: flex;
  align-items: center;
  gap: $space-sm;
}

.stat-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
}

.stat-value-inline {
  display: flex;
  align-items: baseline;
  gap: $space-xs;

  .value {
    font-weight: 500;
    color: $text-primary;
  }

  .separator {
    color: $text-secondary;
    font-size: 0.9rem;
  }
}

.change-tag {
  min-width: auto;
}
</style>
