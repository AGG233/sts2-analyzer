<script setup lang="ts">
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import { computed } from 'vue'
import DirectoryScanner from '~/components/DirectoryScanner.vue'
import RunList from '~/components/RunList.vue'
import { getWinRateByCharacter } from '~/data/analytics'
import { useGameI18n } from '~/locales/lookup'
import { useRunStore } from '~/stores/runStore'

const { t } = useI18n()
const store = useRunStore()
const { characterName } = useGameI18n()

const characterStats = computed(() => {
  return getWinRateByCharacter(store.runs)
})

function getWinRateSeverity(rate: number): 'success' | 'warn' | 'danger' {
  if (rate >= 0.5)
    return 'success'
  if (rate >= 0.25)
    return 'warn'
  return 'danger'
}
</script>

<template>
  <div class="home">
    <h1>{{ t('app.title') }}</h1>

    <DirectoryScanner />

    <div v-if="store.runs.length > 0" class="stats-overview">
      <span class="stat">{{ t('home.total') }}: {{ store.runs.length }}</span>
      <span class="stat win">{{ t('home.wins') }}: {{ store.wins }}</span>
      <span class="stat loss">{{ t('home.losses') }}: {{ store.losses }}</span>
      <span class="stat">{{ t('home.winRate') }}: {{ (store.wins / store.runs.length * 100).toFixed(1) }}%</span>
    </div>

    <!-- Character Statistics -->
    <div v-if="characterStats.length > 0" class="character-stats">
      <h2>{{ t('home.characterStats') }}</h2>
      <DataTable :value="characterStats" sort-mode="single" removable-sort>
        <Column :header="t('home.character')">
          <template #body="{ data }">
            {{ characterName(data.character) }}
          </template>
        </Column>
        <Column :header="t('home.wins')" sortable>
          <template #body="{ data }">
            <Tag :value="String(data.wins)" severity="success" />
          </template>
        </Column>
        <Column :header="t('home.losses')" sortable>
          <template #body="{ data }">
            <Tag :value="String(data.losses)" severity="danger" />
          </template>
        </Column>
        <Column :header="t('home.total')" sortable />
        <Column :header="t('home.winRate')" sortable>
          <template #body="{ data }">
            <Tag :value="`${(data.winRate * 100).toFixed(1)}%`" :severity="getWinRateSeverity(data.winRate)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <RunList :summaries="store.summaries" />
  </div>
</template>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
  padding: calc(60px + 2rem) 2rem 2rem;
  background: rgba(10, 22, 40, 0.88);
  backdrop-filter: blur(8px);
  min-height: calc(100vh - 60px);
}
h1 {
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  color: #f9a825;
}
.stats-overview {
  display: flex;
  gap: 1.5rem;
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  font-size: 0.95rem;
}
.stat.win { color: #66bb6a; }
.stat.loss { color: #ef5350; }

.character-stats {
  margin: 1.5rem 0;
}

.character-stats h2 {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: #e0e0e0;
}
</style>
