<script setup lang="ts">
import AppToggleButton from '~/components/shared/AppToggleButton.vue'
import RunMap from '~/components/RunMap.vue'
import TopBar from './TopBar.vue'
import PreviewContent from './PreviewContent.vue'
import DetailContent from './DetailContent.vue'
import { getDeckAtFloor, getDeckEvolution, getGoldTimeline, getHpTimeline, getRelicsAtFloor, getRunSummary } from '~/data/analytics'
import { useRunStore } from '~/stores/runStore'
import { handleMainWheel } from './wheel-utils'

const props = defineProps<{
  seed: string
}>()

const store = useRunStore()
const { t } = useI18n()
const mapRef = ref<InstanceType<typeof RunMap> | null>(null)

const run = computed(() => store.getRunBySeed(props.seed))
const summary = computed(() => run.value ? getRunSummary(run.value) : null)

const selectedPlayer = ref(0)
const selectedFloor = ref<number | undefined>(undefined)
const viewMode = ref<'preview' | 'detail'>('preview')

// 玩家显示名
const playerNames = ref<Map<string | number, string>>(new Map())

const getPlayerDisplayName = (playerIndex: number): string => {
  const s = summary.value
  if (!s) return 'Unknown Player'

  const player = s.players[playerIndex]
  if (!player) return 'Unknown Player'

  return playerNames.value.get(player.playerId) || 'Unknown Player'
}

const viewModeOptions = computed(() => [
  { label: t('run.preview'), value: 'preview' },
  { label: t('run.detail'), value: 'detail' },
])

watch(() => viewMode.value, (newMode, oldMode) => {
  if (newMode === 'detail' && oldMode === 'preview' && selectedFloor.value === undefined) {
    selectedFloor.value = 1
  }
})

const handleSelectFloor = (floor: number) => {
  selectedFloor.value = floor
  if (viewMode.value === 'preview') {
    viewMode.value = 'detail'
  }
}

const hoveredFloor = ref<number | null>(null)

const handleHoverFloor = (floor: number | null) => {
  hoveredFloor.value = floor
}

// 单个玩家数据
const hpData = computed(() => run.value ? getHpTimeline(run.value, selectedPlayer.value) : [])
const goldData = computed(() => run.value ? getGoldTimeline(run.value, selectedPlayer.value) : [])
const deckData = computed(() => run.value ? getDeckEvolution(run.value, selectedPlayer.value) : [])

// 所有玩家数据（总览模式）
const allPlayersHpData = computed(() => {
  if (!run.value || !summary.value) return []
  const data = []
  for (let i = 0; i < summary.value.playerCount; i++) {
    data.push(getHpTimeline(run.value, i))
  }
  return data
})

const allPlayersGoldData = computed(() => {
  if (!run.value || !summary.value) return []
  const data = []
  for (let i = 0; i < summary.value.playerCount; i++) {
    data.push(getGoldTimeline(run.value, i))
  }
  return data
})

const allPlayersDeckData = computed(() => {
  if (!run.value || !summary.value) return []
  const data = []
  for (let i = 0; i < summary.value.playerCount; i++) {
    data.push(getDeckEvolution(run.value, i))
  }
  return data
})

const currentDeck = computed(() => {
  if (!run.value) return []
  if (hoveredFloor.value !== null) {
    return getDeckAtFloor(run.value, hoveredFloor.value, selectedPlayer.value)
  }
  return run.value.players[selectedPlayer.value]?.deck ?? []
})

const currentRelics = computed(() => {
  if (!run.value) return []
  if (hoveredFloor.value !== null) {
    return getRelicsAtFloor(run.value, hoveredFloor.value, selectedPlayer.value).map(r => ({
      id: r.id,
      floor_added_to_deck: r.floor_added_to_deck
    }))
  }
  return run.value.players[selectedPlayer.value]?.relics ?? []
})
</script>

<template>
  <div v-if="run && summary" class="run-detail-page">
    <TopBar :run="run" />

    <div class="main-content" @wheel="handleMainWheel">
      <!-- Left: Map -->
      <div class="left-panel">
        <div class="left-overlay">
          <AppToggleButton
            v-model="viewMode"
            :options="viewModeOptions"
            size="small"
          />
        </div>
        <RunMap
          ref="mapRef"
          :run="run"
          :selected-floor="selectedFloor"
          @select-floor="handleSelectFloor"
        />
      </div>

      <!-- Right: Details -->
      <div class="right-panel">
        <div class="detail-content">
          <!-- Preview Mode -->
          <PreviewContent
            v-if="viewMode === 'preview'"
            :hp-data="hpData"
            :gold-data="goldData"
            :deck-data="deckData"
            :all-players-hp-data="allPlayersHpData"
            :all-players-gold-data="allPlayersGoldData"
            :all-players-deck-data="allPlayersDeckData"
            :player-count="summary.playerCount"
            :current-deck="currentDeck"
            :current-relics="currentRelics"
            @hover-floor="handleHoverFloor"
          />

          <!-- Detail Mode -->
          <DetailContent
            v-else
            :run="run"
            :selected-floor="selectedFloor"
          />
        </div>
      </div>
    </div>
  </div>

  <div v-else class="not-found">
    <p>
      {{ t('run.runNotFound') }} <router-link to="/">
        {{ t('run.goBack') }}
      </router-link>
    </p>
  </div>
</template>

<style scoped>
.run-detail-page {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  width: 30%;
  min-width: 300px;
  max-width: 400px;
  background: rgba(10, 22, 40, 0.85);
  backdrop-filter: blur(8px);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.left-overlay {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.preview-player-selector {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: rgba(10, 22, 40, 0.88);
  backdrop-filter: blur(8px);
}

.detail-content {
  flex: 1;
}

.not-found {
  text-align: center;
  padding: 4rem;
  color: #8aa0b8;
}
</style>
