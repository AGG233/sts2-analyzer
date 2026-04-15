<script setup lang="ts">
import AppButton from '~/components/shared/AppButton.vue'
import AppTag from '~/components/shared/AppTag.vue'
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
        <AppButton variant="text" size="small">
          ← {{ t('run.back') }}
        </AppButton>
      </router-link>
    </div>

    <div class="top-summary">
      <span v-if="summary.playerCount <= 1" class="character">{{ characterName(summary.character) }}</span>
      <AppTag :severity="summary.win ? 'success' : 'danger'">
        {{ summary.win ? t('run.victory') : t('run.defeat') }}
      </AppTag>
      <span class="seed">Seed: {{ summary.seed }}</span>
      <span class="ascension">A{{ summary.ascension }}</span>
      <span class="top-meta">{{ summary.totalFloors }} {{ t('run.floors') }}</span>
      <span class="top-meta">{{ formatTime(summary.runTime) }}</span>
      <span class="top-meta">{{ formatDate(summary.startTime) }}</span>
      <span v-if="!summary.win" class="top-meta death">{{ t('run.killedBy') }}: {{ encounterName(summary.deathCause) }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.top-bar {
  display: flex;
  align-items: center;
  gap: $space-lg;
  padding: $space-sm $space-xl;
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
  gap: $space-lg;
  flex: 1;
  flex-wrap: nowrap;
  overflow: hidden;
  white-space: nowrap;
}

.character {
  font-size: 1.25rem;
  font-weight: 700;
  color: $warn;
}

.seed,
.ascension {
  color: $text-secondary;
  font-family: monospace;
}

.top-meta {
  color: $text-muted;
  font-size: 0.8rem;

  &.death {
    color: $danger;
  }
}
</style>
