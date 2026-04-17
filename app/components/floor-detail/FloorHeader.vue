<script setup lang="ts">
import type { FlatFloor } from "~/data/analytics";
import { typeColors } from "~/data/map";
import { useGameI18n } from "~/locales/lookup";

const props = defineProps<{
	floor: FlatFloor;
}>();

const { mapTypeName, modelIdName, monsterName } = useGameI18n();

function typeColor(type: string): string {
	return typeColors[type] ?? typeColors.unknown;
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
          <AppTag
            v-for="monster in props.floor.mapPoint.rooms[0].monster_ids"
            :key="monster"
            severity="info"
            class="monster-tag"
          >{{ monsterName(monster) }}</AppTag>
        </div>
      </template>
      <div v-if="(props.floor.mapPoint.rooms[0]?.turns_taken ?? 0) > 0" class="header-turns">
        ⏱️ {{ props.floor.mapPoint.rooms[0].turns_taken }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.floor-header {
  margin-bottom: $space-lg;
  padding: $space-md $space-lg;
  background: rgba(255, 255, 255, 0.04);
  border-radius: $radius-lg;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.card-header {
  display: flex;
  gap: $space-lg;
  align-items: center;
}

.type-badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  @include flex-center;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: baseline;
  gap: $space-sm;
  flex-wrap: nowrap;
}

.header-type {
  font-size: 1.1rem;
  font-weight: 700;
  color: $text-primary;
}

.header-model {
  color: $text-secondary;
  font-size: 0.9rem;
}

.header-turns {
  color: $text-secondary;
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
