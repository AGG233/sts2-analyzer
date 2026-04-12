<script setup lang="ts">
import type { FloorPlayerStats, RunFile } from '~/data/types'
import type { SimDeckCard } from '~/data/analytics'
import type { MergedCard, MergedRelic, MergedPotion } from './merge-utils'
import PlayerSummaryRow from './PlayerSummaryRow.vue'
import PlayerExpandedDetail from './PlayerExpandedDetail.vue'
import { getCharacterColor } from '~/data/characters'

interface Props {
  playerIndex: number
  stats: FloorPlayerStats
  character: string
  cards: MergedCard[]
  relics: MergedRelic[]
  potions: MergedPotion[]
  deck: SimDeckCard[]
  floorRelics: Array<{ id: string; name: string; floor: number }>
  isExpanded: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle', playerIndex: number): void
}>()

const isSingle = computed(() => {
  return true
})

const onExpandEnter = (el: Element, done: () => void) => {
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

const onExpandLeave = (el: Element, done: () => void) => {
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
    :style="{ borderTopColor: getCharacterColor(character) }"
  >
    <!-- Summary Row (always visible) -->
    <div class="card-header-row" @click="emit('toggle', playerIndex)">
      <PlayerSummaryRow
        :stats="stats"
        :character="character"
        :cards="cards"
        :relics="relics"
        :potions="potions"
      />
      <span class="expand-icon">
        <i class="pi" :class="isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
      </span>
    </div>

    <!-- Expanded Details (with JS transition) -->
    <Transition :enter="onExpandEnter" :leave="onExpandLeave" :css="false">
      <PlayerExpandedDetail
        v-if="isExpanded"
        :deck="deck"
        :floor-relics="floorRelics"
        :gained-ids="gainedIds"
        :removed-ids="removedIds"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
// Internal computed properties
const gainedIds = computed(() => {
  return new Set(
    props.relics
      .filter(r => r.status === 'choice-picked' || r.status === 'gained')
      .map(r => r.id)
  )
})

const removedIds = computed(() => {
  return new Set(
    props.relics
      .filter(r => r.status === 'removed')
      .map(r => r.id)
  )
})
</script>

<style scoped>
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

.card-header-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

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
</style>
