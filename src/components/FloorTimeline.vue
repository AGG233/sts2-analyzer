<script setup lang="ts">
import type { FlatFloor } from '../data/analytics'
import type { RunFile } from '../data/types'
import Tag from 'primevue/tag'
import { computed } from 'vue'
import { getFloorTimeline } from '../data/analytics'
import { useGameI18n } from '../locales/lookup'

const props = defineProps<{
  run: RunFile
  playerIndex?: number
  compact?: boolean
}>()

const { mapTypeShort, cardName, modelIdName } = useGameI18n()

const floors = computed(() => getFloorTimeline(props.run))
const playerIndex = computed(() => props.playerIndex ?? 0)

const typeColors: Record<string, string> = {
  monster: '#42a5f5',
  elite: '#ef5350',
  boss: '#ab47bc',
  event: '#66bb6a',
  shop: '#ffa726',
  treasure: '#ffca28',
  rest_site: '#78909c',
  ancient: '#7e57c2',
  unknown: '#bdbdbd',
}

function getCardsPicked(floor: FlatFloor): string[] {
  const stats = floor.playerStats[playerIndex.value]
  return (stats?.card_choices ?? [])
    .filter(c => c.was_picked)
    .map(c => cardName(c.card.id))
}

function getCardsSkipped(floor: FlatFloor): string[] {
  const stats = floor.playerStats[playerIndex.value]
  return (stats?.card_choices ?? [])
    .filter(c => !c.was_picked)
    .map(c => cardName(c.card.id))
}
</script>

<template>
  <div class="timeline">
    <div
      v-for="floor in floors"
      :key="floor.globalFloor"
      class="floor-row"
      :class="{ compact }"
    >
      <div
        class="floor-badge"
        :style="{ background: typeColors[floor.mapPoint.map_point_type] ?? '#bdbdbd' }"
      >
        {{ floor.globalFloor }}
      </div>
      <div class="floor-type">
        {{ mapTypeShort(floor.mapPoint.map_point_type) }}
      </div>
      <div class="floor-info">
        <Tag :value="`${floor.playerStats[playerIndex]?.current_hp ?? '-'}/${floor.playerStats[playerIndex]?.max_hp ?? '-'}`" severity="danger" class="info-tag" />
        <Tag :value="`${floor.playerStats[playerIndex]?.current_gold ?? '-'}g`" severity="warn" class="info-tag" />
        <template v-if="!compact">
          <Tag v-if="(floor.playerStats[playerIndex]?.damage_taken ?? 0) > 0" :value="`-${floor.playerStats[playerIndex]?.damage_taken}`" severity="danger" class="info-tag" />
          <Tag v-if="(floor.playerStats[playerIndex]?.hp_healed ?? 0) > 0" :value="`+${floor.playerStats[playerIndex]?.hp_healed}`" severity="success" class="info-tag" />
          <Tag v-for="card in getCardsPicked(floor)" :key="card" :value="card" severity="info" class="info-tag" />
          <Tag v-for="card in getCardsSkipped(floor)" :key="`s-${card}`" :value="card" severity="secondary" class="info-tag tag-strikethrough" />
        </template>
      </div>
      <div v-if="!compact && floor.mapPoint.rooms[0]?.model_id" class="floor-encounter">
        {{ modelIdName(floor.mapPoint.rooms[0].model_id) }}
        <span v-if="floor.mapPoint.rooms[0].turns_taken > 0" class="turns">({{ floor.mapPoint.rooms[0].turns_taken }}T)</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.floor-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 0.8rem;
  transition: background 0.15s;
}
.floor-row:hover {
  background: rgba(255, 255, 255, 0.06);
}
.floor-row:last-child { border-bottom: none; }
.floor-row.compact {
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
}
.floor-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.75rem;
  flex-shrink: 0;
}
.floor-type {
  width: 40px;
  font-weight: 600;
  font-size: 0.75rem;
  color: #8aa0b8;
  flex-shrink: 0;
}
.floor-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  flex: 1;
}
.info-tag {
  font-size: 0.75rem;
}
.tag-strikethrough {
  text-decoration: line-through;
  opacity: 0.6;
}
.floor-encounter {
  color: #5a7a9a;
  font-size: 0.75rem;
  flex-shrink: 0;
}
.turns { color: #3d6080; }
</style>
