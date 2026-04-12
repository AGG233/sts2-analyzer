<script setup lang="ts">
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { RunFile } from '~/data/types'
import { getRunSummary } from '~/data/analytics'

const props = defineProps<{
  run: RunFile
}>()

const { t } = useI18n()
const { characterName, encounterName } = useGameI18n()

const summary = computed(() => getRunSummary(props.run))

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

const formatDate = (ts: number): string => {
  return new Date(ts * 1000).toLocaleDateString()
}
</script>

<template>
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
</template>

<style scoped>
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

.seed,
.ascension {
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
</style>
