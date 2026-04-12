<script setup lang="ts">
import type { FlatFloor } from '../../data/analytics'
import Tag from 'primevue/tag'
import { typeColors } from '../../data/map'
import { useGameI18n } from '../../locales/lookup'

const props = defineProps<{
  floor: FlatFloor
}>()

const { mapTypeName, modelIdName, monsterName } = useGameI18n()

function typeColor(type: string): string {
  return typeColors[type] ?? typeColors.unknown
}
</script>

<template>
  <div class="floor-header">
    <div class="card-header">
      <div
        class="type-badge"
        :style="{ background: typeColor(props.floor.mapPoint.map_point_type) }"
      >
        {{ props.floor.globalFloor }}
      </div>
      <div class="header-info">
        <span class="header-type">{{ mapTypeName(props.floor.mapPoint.map_point_type) }}</span>
        <span v-if="props.floor.mapPoint.rooms[0]?.model_id" class="header-model">
          {{ modelIdName(props.floor.mapPoint.rooms[0].model_id) }}
        </span>
      </div>
      <template v-if="props.floor.mapPoint.rooms[0]?.monster_ids?.length">
        <div class="header-monsters">
          <Tag
            v-for="monster in props.floor.mapPoint.rooms[0].monster_ids"
            :key="monster"
            :value="monsterName(monster)"
            severity="info"
            class="monster-tag"
          />
        </div>
      </template>
      <div v-if="(props.floor.mapPoint.rooms[0]?.turns_taken ?? 0) > 0" class="header-turns">
        ⏱️ {{ props.floor.mapPoint.rooms[0].turns_taken }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.floor-header {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

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
</style>
