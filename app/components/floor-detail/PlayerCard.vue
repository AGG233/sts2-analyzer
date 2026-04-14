<script setup lang="ts">
import type { FloorPlayerStats } from '~/data/types'
import type { SimDeckCard } from '~/data/analytics'
import Tag from 'primevue/tag'
import { getCharacterColor } from '~/data/characters'
import { useGameI18n } from '~/locales/lookup'
import { useI18n } from 'vue-i18n'
import PlayerExpandedDetail from './PlayerExpandedDetail.vue'

const props = defineProps<{
  playerIndex: number
  stats: FloorPlayerStats
  character: string
  cards: any[]
  relics: any[]
  potions: any[]
  deck: SimDeckCard[]
  floorRelics: any[]
  isExpanded: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', playerIndex: number): void
}>()

const { t } = useI18n()
const { characterName, restSiteChoiceName } = useGameI18n()

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

function onToggle() {
  emit('toggle', props.playerIndex)
}

// Transition hooks for smooth height animation
function onExpandEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = '0'
  htmlEl.style.opacity = '0'
  htmlEl.style.overflow = 'hidden'
  htmlEl.offsetHeight // force reflow
  htmlEl.style.transition = 'height 0.3s ease-out, opacity 0.3s ease-out'
  htmlEl.style.height = `${htmlEl.scrollHeight}px`
  htmlEl.style.opacity = '1'
  htmlEl.addEventListener('transitionend', () => {
    htmlEl.style.height = ''
    htmlEl.style.overflow = ''
    htmlEl.style.transition = ''
    done()
  }, { once: true })
}

function onExpandLeave(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = `${htmlEl.scrollHeight}px`
  htmlEl.style.overflow = 'hidden'
  htmlEl.offsetHeight // force reflow
  htmlEl.style.transition = 'height 0.25s ease-in, opacity 0.25s ease-in'
  htmlEl.style.height = '0'
  htmlEl.style.opacity = '0'
  htmlEl.addEventListener('transitionend', () => {
    htmlEl.style.transition = ''
    done()
  }, { once: true })
}
</script>

<template>
  <div
    class="player-card"
    :style="{ borderTopColor: getPlayerColor(props.character) }"
  >
    <!-- Summary Row (always visible) -->
    <div class="card-header-row" @click="onToggle">
      <div class="player-identity">
        <span
          class="player-color-dot"
          :style="{ background: getPlayerColor(props.character) }"
        />
        <span class="player-name">{{ characterName(props.character) }}</span>
      </div>

      <div class="card-stats-inline">
        <!-- HP -->
        <span class="stat-item-inline">
          <span class="stat-icon">❤️</span>
          <span class="stat-value-inline">
            <span class="value">{{ props.stats.current_hp }}</span>
            <span class="separator">/</span>
            <span class="value">{{ props.stats.max_hp }}</span>
          </span>
          <Tag v-if="props.stats.damage_taken > 0" :value="`-${props.stats.damage_taken}`" severity="danger" class="change-tag" />
          <Tag v-if="props.stats.hp_healed > 0" :value="`+${props.stats.hp_healed}`" severity="success" class="change-tag" />
        </span>

        <!-- Gold -->
        <span class="stat-item-inline">
          <span class="stat-icon">💰</span>
          <span class="stat-value-inline">
            <span class="value">{{ props.stats.current_gold }}g</span>
          </span>
          <Tag v-if="props.stats.gold_gained > 0" :value="`+${props.stats.gold_gained}`" severity="success" class="change-tag" />
          <Tag v-if="props.stats.gold_spent > 0" :value="`-${props.stats.gold_spent}`" severity="danger" class="change-tag" />
        </span>

        <!-- Potions -->
        <span v-if="props.potions.length > 0" class="stat-item-inline">
          <span class="stat-icon">🧪</span>
          <Tag
            v-for="pot in props.potions"
            :key="pot.id"
            :value="pot.name"
            :severity="pot.status === 'choice-picked' ? 'success' : pot.status === 'used' ? 'secondary' : undefined"
            :class="{ 'tag-strikethrough': pot.status === 'choice-skipped' || pot.status === 'used' }"
            class="potion-tag"
          />
        </span>

        <!-- Rest Site Choice -->
        <span v-if="props.stats.rest_site_choices?.length" class="stat-item-inline">
          <span class="stat-label-inline">{{ t('run.restSiteChoice') }}:</span>
          <Tag :value="props.stats.rest_site_choices.map(restSiteChoiceName).join(', ')" />
        </span>

        <!-- Event Choices -->
        <span v-if="props.stats.event_choices?.length" class="stat-item-inline">
          <span class="stat-label-inline">{{ t('run.eventChoices') }}:</span>
          <Tag
            v-for="(choice, index) in props.stats.event_choices"
            :key="index"
            :value="choice.title?.key ? t(`game.${choice.title.table}.${choice.title.key}`) : ''"
            severity="info"
          />
        </span>

        <!-- Relic Changes -->
        <span v-if="props.relics.length > 0" class="stat-item-inline">
          <span class="stat-icon">🎁</span>
          <Tag
            v-for="(relic, index) in props.relics"
            :key="index"
            :value="`${relic.status === 'removed' ? '✕ ' : ''}${relic.name}`"
            :severity="relic.status === 'choice-picked' || relic.status === 'gained' ? 'success' : relic.status === 'removed' ? 'danger' : 'secondary'"
            :class="{ 'tag-strikethrough': relic.status === 'choice-skipped' || relic.status === 'removed' }"
            class="relic-tag"
          />
        </span>

        <!-- Card Changes -->
        <span v-if="props.cards.length > 0" class="stat-item-inline">
          <span class="stat-icon">🃏</span>
          <Tag
            v-for="(item, index) in props.cards"
            :key="index"
            :value="`${item.status === 'transformed-from' ? '↗ ' : item.status === 'transformed-to' ? '↘ ' : item.status === 'removed' ? '✕ ' : ''}${item.name}`"
            :severity="getCardSeverity(item.status)"
            :class="{ 'tag-strikethrough': item.status === 'choice-skipped' || item.status === 'transformed-from' || item.status === 'removed' }"
            class="card-tag"
          />
        </span>
      </div>

      <span class="expand-icon">
        <i class="pi" :class="props.isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
      </span>
    </div>

    <!-- Expanded Details (with JS transition) -->
    <Transition :enter="onExpandEnter" :leave="onExpandLeave" :css="false">
      <div v-if="props.isExpanded">
        <PlayerExpandedDetail
          :deck="props.deck"
          :floor-relics="props.floorRelics"
          :gained-ids="new Set(props.relics.filter(r => r.status === 'choice-picked' || r.status === 'gained').map(r => r.id))"
          :removed-ids="new Set(props.relics.filter(r => r.status === 'removed').map(r => r.id))"
          :current-floor="0"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
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
</style>
