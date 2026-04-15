<script setup lang="ts">
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import { computed, ref } from 'vue'
import DirectoryScanner from '~/components/DirectoryScanner.vue'
import RunList from '~/components/RunList.vue'
import CardPickRateChart from '~/components/CardPickRateChart.vue'
import LanguageSwitch from '~/components/LanguageSwitch.vue'
import { getWinRateByCharacter } from '~/data/analytics'
import { useGameI18n } from '~/locales/lookup'
import { useRunStore } from '~/stores/runStore'

const store = useRunStore()
const { t } = useI18n()
const { characterName } = useGameI18n()
const selectedCharacter = ref<string>('')

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
    <!-- Left sidebar -->
    <aside class="left-panel">
      <div class="panel-header">
        <h1 class="app-title">
          <i class="pi pi-chart-line" />
          {{ t('app.title') }}
        </h1>
      </div>

      <div class="panel-content">
        <ClientOnly fallback="Loading scanner...">
          <DirectoryScanner />
        </ClientOnly>

        <div v-if="store.runs.length > 0" class="stats-overview">
          <div class="stat-item">
            <i class="pi pi-trophy" />
            <span class="stat-label">{{ t('home.total') }}</span>
            <span class="stat-value">{{ store.runs.length }}</span>
          </div>
          <div class="stat-item win">
            <i class="pi pi-check" />
            <span class="stat-label">{{ t('home.wins') }}</span>
            <span class="stat-value">{{ store.wins }}</span>
          </div>
          <div class="stat-item loss">
            <i class="pi pi-times" />
            <span class="stat-label">{{ t('home.losses') }}</span>
            <span class="stat-value">{{ store.losses }}</span>
          </div>
          <div class="stat-item rate">
            <i class="pi pi-chart-pie" />
            <span class="stat-label">{{ t('home.winRate') }}</span>
            <span class="stat-value">{{ (store.wins / store.runs.length * 100).toFixed(1) }}%</span>
          </div>
        </div>

        <div v-if="characterStats.length > 0" class="character-stats">
          <h2>{{ t('home.characterStats') }}</h2>
          <DataTable
            :value="characterStats"
            sort-mode="single"
            removable-sort
            class="character-table"
          >
            <Column :header="t('home.character')">
              <template #body="{ data }">
                {{ characterName(data.character) }}
              </template>
            </Column>
            <Column :header="t('home.wins')" field="wins" sortable>
              <template #body="{ data }">
                <Tag :value="data.wins" severity="success" />
              </template>
            </Column>
            <Column :header="t('home.losses')" field="losses" sortable>
              <template #body="{ data }">
                <Tag :value="data.losses" severity="danger" />
              </template>
            </Column>
            <Column :header="t('home.total')" field="total" sortable />
            <Column :header="t('home.winRate')" field="winRate" sortable>
              <template #body="{ data }">
                <Tag
                  :value="`${(data.winRate * 100).toFixed(1)}%`"
                  :severity="getWinRateSeverity(data.winRate)"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </div>

      <div class="panel-footer">
        <LanguageSwitch />
      </div>
    </aside>

    <!-- Right panel -->
    <main class="right-panel">
      <div v-if="characterStats.length > 0" class="character-filter">
        <label for="character-filter">{{ t('home.character') }}:</label>
        <select
          v-model="selectedCharacter"
          id="character-filter"
          class="filter-select"
        >
          <option value="">{{ t('run.allCharacters') }}</option>
          <option
            v-for="char in characterStats"
            :key="char.character"
            :value="char.character"
          >
            {{ characterName(char.character) }}
          </option>
        </select>
      </div>

      <div v-if="store.runs.length > 0" class="card-pick-section">
        <h2>{{ selectedCharacter ? t('chart.cardPickRateByCharacter') : t('chart.cardPickRate') }}</h2>
        <ClientOnly fallback="Loading chart...">
          <CardPickRateChart :character-id="selectedCharacter" />
        </ClientOnly>
      </div>

      <RunList :summaries="store.summaries" />
    </main>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  gap: 2rem;
  height: 100vh;
  padding: 2rem;
}

.left-panel {
  flex: 0 0 30%;
  max-width: 320px;
  background: rgba(10, 22, 40, 0.88);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(8px);
}

.panel-header {
  margin-bottom: 1.5rem;
}

.app-title {
  font-size: 1.2rem;
  color: #f9a825;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.panel-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.right-panel {
  flex: 1;
  overflow-y: auto;
  background: rgba(10, 22, 40, 0.88);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.stat-item i {
  font-size: 1.2rem;
  margin-bottom: 0.25rem;
}

.stat-item.win { color: #66bb6a; }
.stat-item.loss { color: #ef5350; }
.stat-item.rate { color: #f9a825; }

.stat-label {
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.character-stats h2 {
  font-size: 1.1rem;
  margin: 1.5rem 0 0.75rem;
  color: #e0e0e0;
}

.character-table {
  font-size: 0.9rem;
}

.character-filter {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #e0e0e0;
  cursor: pointer;
  min-width: 200px;
}

.card-pick-section h2 {
  font-size: 1.2rem;
  margin: 2rem 0 1rem;
  color: #e0e0e0;
}
</style>
