<script setup lang="ts">
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CombinedTimelineChart from '../components/CombinedTimelineChart.vue'
import FloorDetail from '../components/FloorDetail.vue'
import RunMap from '../components/RunMap.vue'
import {
  getDeckAtFloor,
  getDeckEvolution,
  getGoldTimeline,
  getHpTimeline,
  getRelicsAtFloor,
  getRunSummary,
} from '../data/analytics'
import { useGameI18n } from '../locales/lookup'
import { useRunStore } from '../stores/runStore'
import { usePlayerStore } from '../stores/playerStore'

const props = defineProps<{ seed: string }>()
const store = useRunStore()
const playerStore = usePlayerStore()
const { t } = useI18n()
const { characterName, encounterName, cardName, relicName } = useGameI18n()

// Core data
const selectedPlayer = ref(0)
const selectedFloor = ref<number | undefined>(undefined)
const viewMode = ref<'preview' | 'detail'>('preview')
const mapRef = ref<InstanceType<typeof RunMap> | null>(null)

const run = computed(() => store.getRunBySeed(props.seed))
const summary = computed(() => run.value ? getRunSummary(run.value) : null)

// Player display name cache
const playerNames = ref<Map<string | number, string>>(new Map())

// Helper to get display name for a player index
const getPlayerDisplayName = (playerIndex: number): string => {
  const s = summary.value
  if (!s)
    return 'Unknown Player'

  const player = s.players[playerIndex]
  if (!player)
    return 'Unknown Player'

  // Try to use cached name
  if (playerNames.value.has(player.playerId)) {
    return playerNames.value.get(player.playerId)!
  }

  // Fallback to character name
  return characterName(player.character)
}

// Load player names when summary becomes available
watch(() => summary.value, async (newSummary) => {
  if (!newSummary) {
    playerNames.value.clear()
    return
  }

  // Load names for all players
  for (let i = 0; i < newSummary.players.length; i++) {
    const player = newSummary.players[i]
    try {
      const displayName = await playerStore.getPlayerDisplayName(player.playerId)
      playerNames.value.set(player.playerId, displayName)
    } catch (error) {
      console.warn(`Error loading name for player ${player.playerId}:`, error)
      playerNames.value.set(player.playerId, characterName(player.character))
    }
  }
})

const viewModeOptions = computed(() => [
  { label: t('ui.run.preview'), value: 'preview' },
  { label: t('ui.run.detail'), value: 'detail' },
])

// 监听 viewMode 变化
watch(
  () => viewMode.value,
  (newMode, oldMode) => {
    if (newMode === 'detail' && oldMode === 'preview' && selectedFloor.value === undefined) {
      selectedFloor.value = 1 // 默认选择第一层
    }
  },
)

// 修改 handleSelectFloor 函数
function handleSelectFloor(floor: number) {
  selectedFloor.value = floor
  if (viewMode.value === 'preview') {
    viewMode.value = 'detail'
  }
}

// Preview mode: hover floor for live deck/relics update
const hoveredFloor = ref<number | null>(null)

function handleHoverFloor(floor: number | null) {
  hoveredFloor.value = floor
}

// 单个玩家数据
const hpData = computed(() => run.value ? getHpTimeline(run.value, selectedPlayer.value) : [])
const goldData = computed(() => run.value ? getGoldTimeline(run.value, selectedPlayer.value) : [])
const deckData = computed(() => run.value ? getDeckEvolution(run.value, selectedPlayer.value) : [])

// 所有玩家数据（总览模式）
const allPlayersHpData = computed(() => {
  if (!run.value || !summary.value)
    return []
  const data = []
  for (let i = 0; i < summary.value.playerCount; i++) {
    data.push(getHpTimeline(run.value, i))
  }
  return data
})
const allPlayersGoldData = computed(() => {
  if (!run.value || !summary.value)
    return []
  const data = []
  for (let i = 0; i < summary.value.playerCount; i++) {
    data.push(getGoldTimeline(run.value, i))
  }
  return data
})
const allPlayersDeckData = computed(() => {
  if (!run.value || !summary.value)
    return []
  const data = []
  for (let i = 0; i < summary.value.playerCount; i++) {
    data.push(getDeckEvolution(run.value, i))
  }
  return data
})

// 当前选中玩家的卡牌和遗物
const currentDeck = computed(() => {
  if (!run.value)
    return []
  // When hovering on timeline, show deck at that floor
  if (hoveredFloor.value !== null) {
    return getDeckAtFloor(run.value, hoveredFloor.value, selectedPlayer.value)
  }
  return run.value.players[selectedPlayer.value]?.deck ?? []
})
const currentRelics = computed(() => {
  if (!run.value)
    return []
  // When hovering on timeline, show relics at that floor
  if (hoveredFloor.value !== null) {
    return getRelicsAtFloor(run.value, hoveredFloor.value, selectedPlayer.value).map(r => ({ id: r.id, floor_added_to_deck: r.floor_added_to_deck }))
  }
  return run.value.players[selectedPlayer.value]?.relics ?? []
})

// 预览模式：卡组按 (id, upgradeLevel) 分组
const groupedCurrentDeck = computed(() => {
  const map = new Map<string, { name: string, upgraded: boolean, count: number }>()
  for (const card of currentDeck.value) {
    const lvl = 'current_upgrade_level' in card ? (card as { current_upgrade_level?: number }).current_upgrade_level ?? 0 : 0
    const key = `${card.id}|${lvl}`
    if (!map.has(key)) {
      map.set(key, { name: cardName(card.id), upgraded: lvl > 0, count: 1 })
    }
    else {
      map.get(key)!.count++
    }
  }
  return Array.from(map.values())
})

const groupedCurrentRelics = computed(() => {
  const map = new Map<string, { name: string, count: number, floor: number }>()
  for (const relic of currentRelics.value) {
    if (!map.has(relic.id)) {
      map.set(relic.id, { name: relicName(relic.id), count: 1, floor: relic.floor_added_to_deck ?? 1 })
    }
    else {
      map.get(relic.id)!.count++
    }
  }
  return Array.from(map.values())
})

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString()
}

// ---- Smart wheel routing ----

function findNearestScrollable(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el
  while (current) {
    const style = getComputedStyle(current)
    const overflowY = style.overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
      return current
    }
    current = current.parentElement
  }
  return null
}

function canScroll(el: HTMLElement, direction: 'up' | 'down'): boolean {
  if (direction === 'up') {
    return el.scrollTop > 0
  }
  return el.scrollTop + el.clientHeight < el.scrollHeight - 1
}

function handleMainWheel(event: WheelEvent) {
  if (!run.value)
    return

  const target = event.target as HTMLElement
  const direction = event.deltaY > 0 ? 'down' : 'up'

  // Check if mouse is over a scrollable container
  const scrollable = findNearestScrollable(target)
  if (scrollable && canScroll(scrollable, direction)) {
    // Let the container scroll naturally
    return
  }

  // No scrollable container or at boundary → floor selection
  event.preventDefault()
  if (!mapRef.value)
    return

  const floors = mapRef.value.getAllFloorsSorted()
  if (floors.length === 0)
    return

  const current = selectedFloor.value ?? floors[0]
  const currentIndex = floors.indexOf(current)
  if (currentIndex === -1)
    return

  const step = event.deltaY > 0 ? 1 : -1
  const newIndex = Math.max(0, Math.min(floors.length - 1, currentIndex + step))
  if (newIndex !== currentIndex) {
    handleSelectFloor(floors[newIndex])
  }
}
</script>

<template>
  <div v-if="run && summary" class="run-detail-page">
    <div class="top-bar">
      <div class="top-bar-left">
        <router-link to="/" class="back-link">
          <Button :label="t('ui.run.back')" icon="pi pi-arrow-left" variant="text" size="small" />
        </router-link>
      </div>

      <div class="top-summary">
        <span v-if="summary.playerCount <= 1" class="character">{{ characterName(summary.character) }}</span>
        <Tag
          :value="summary.win ? t('ui.run.victory') : t('ui.run.defeat')"
          :severity="summary.win ? 'success' : 'danger'"
        />
        <span class="seed">Seed: {{ summary.seed }}</span>
        <span class="ascension">A{{ summary.ascension }}</span>
        <span class="top-meta">{{ summary.totalFloors }} {{ t('ui.run.floors') }}</span>
        <span class="top-meta">{{ formatTime(summary.runTime) }}</span>
        <span class="top-meta">{{ formatDate(summary.startTime) }}</span>
        <span v-if="!summary.win" class="top-meta death">{{ t('ui.run.killedBy') }}: {{ encounterName(summary.deathCause) }}</span>
      </div>
    </div>

    <div class="main-content" @wheel="handleMainWheel">
      <!-- Left: Map -->
      <div class="left-panel">
        <!-- Fixed controls overlay -->
        <div class="left-overlay">
          <SelectButton
            v-model="viewMode"
            :options="viewModeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
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
        <!-- Floor Detail or Charts -->
        <div class="detail-content">
          <!-- 详细模式：显示楼层详情 -->
          <div v-if="viewMode === 'detail'" class="floor-detail-wrapper">
            <FloorDetail
              :run="run"
              :floor="selectedFloor"
            />
          </div>

          <!-- 预览模式：显示图表和时间线 -->
          <div v-else class="charts-wrapper">
            <!-- Player selector for preview mode -->
            <div v-if="summary.playerCount > 1" class="preview-player-selector">
              <Button
                v-for="(player, index) in summary.players"
                :key="player.playerId"
                :label="getPlayerDisplayName(index)"
                :variant="selectedPlayer === index ? undefined : 'outlined'"
                size="small"
                @click="selectedPlayer = index"
              />
            </div>
            <!-- Deck and Relics -->
            <div class="items-section">
              <div class="items-row">
                <span class="items-label">
                  {{ hoveredFloor !== null ? `${t('ui.run.deckSize')} (F${hoveredFloor})` : t('ui.run.finalDeck') }}: {{ currentDeck.length }}
                </span>
              </div>
              <div class="items-container deck-container">
                <Tag
                  v-for="(group, idx) in groupedCurrentDeck"
                  :key="idx"
                  :value="`${group.name}${group.count > 1 ? ` x${group.count}` : ''}`"
                  :severity="group.upgraded ? 'warn' : undefined"
                />
              </div>
            </div>

            <div class="items-section">
              <div class="items-row">
                <span class="items-label">{{ t('ui.run.relics') }}: {{ currentRelics.length }}</span>
              </div>
              <div class="items-container relics-container">
                <Tag
                  v-for="relic in groupedCurrentRelics"
                  :key="relic.name"
                  :value="`${relic.name}${relic.count > 1 ? ` x${relic.count}` : ''} F${relic.floor}`"
                  severity="secondary"
                />
              </div>
            </div>

            <!-- Preview Mode: Timeline charts -->
            <div class="preview-content">
              <section class="chart-section">
                <h2>{{ t('ui.run.timeline') }}</h2>
                <CombinedTimelineChart
                  :hp-data="hpData"
                  :gold-data="goldData"
                  :deck-data="deckData"
                  :all-players-hp-data="allPlayersHpData"
                  :all-players-gold-data="allPlayersGoldData"
                  :all-players-deck-data="allPlayersDeckData"
                  @hover-floor="handleHoverFloor"
                />
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="not-found">
    <p>
      {{ t('ui.run.runNotFound') }} <router-link to="/">
        {{ t('ui.run.goBack') }}
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

.top-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1.5rem;
  background: rgba(10, 22, 40, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.back-link {
  text-decoration: none;
}

.top-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  flex-wrap: nowrap;
  overflow: hidden;
  white-space: nowrap;
}

.character {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f9a825;
}

.seed, .ascension {
  color: #8aa0b8;
  font-family: monospace;
}

.top-meta {
  color: #5a7a9a;
  font-size: 0.8rem;
}

.top-meta.death {
  color: #ef5350;
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

.floor-detail-wrapper {
  overflow-y: auto;
}

.charts-wrapper {
  padding: 1rem 1.5rem;
  flex: 1;
}

.preview-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-section {
  margin-bottom: 2rem;
}

.chart-section h2 {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: #e0e0e0;
}

.items-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.items-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.items-label {
  font-weight: 600;
  color: #e0e0e0;
}

.items-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  max-height: 80px;
  overflow: hidden;
}

.not-found {
  text-align: center;
  padding: 4rem;
  color: #8aa0b8;
}
</style>
