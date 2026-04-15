<script setup lang="ts">
import AppTag from '~/components/shared/AppTag.vue'
import { computed, ref } from 'vue'
import DirectoryScanner from '~/components/DirectoryScanner.vue'
import RunList from '~/components/RunList.vue'
import CardPickRateChart from '~/components/charts/CardPickRateChart.vue'
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
          📈
          {{ t('app.title') }}
        </h1>
      </div>

      <div class="panel-content">
        <ClientOnly fallback="Loading scanner...">
          <DirectoryScanner />
        </ClientOnly>

        <div v-if="store.runs.length > 0" class="stats-overview">
          <div class="stat-item">
            🏆
            <span class="stat-label">{{ t('home.total') }}</span>
            <span class="stat-value">{{ store.runs.length }}</span>
          </div>
          <div class="stat-item win">
            ✓
            <span class="stat-label">{{ t('home.wins') }}</span>
            <span class="stat-value">{{ store.wins }}</span>
          </div>
          <div class="stat-item loss">
            ✕
            <span class="stat-label">{{ t('home.losses') }}</span>
            <span class="stat-value">{{ store.losses }}</span>
          </div>
          <div class="stat-item rate">
            📊
            <span class="stat-label">{{ t('home.winRate') }}</span>
            <span class="stat-value">{{ (store.wins / store.runs.length * 100).toFixed(1) }}%</span>
          </div>
        </div>

        <div v-if="characterStats.length > 0" class="character-stats">
          <h2>{{ t('home.characterStats') }}</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="text-left bg-white/5">
                <tr>
                  <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.character') }}</th>
                  <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.wins') }}</th>
                  <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.losses') }}</th>
                  <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.total') }}</th>
                  <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.winRate') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/10">
                <tr v-for="stat in characterStats" :key="stat.character" class="hover:bg-white/5 transition-colors">
                  <td class="px-4 py-3">{{ characterName(stat.character) }}</td>
                  <td class="px-4 py-3">
                    <AppTag severity="success">{{ stat.wins }}</AppTag>
                  </td>
                  <td class="px-4 py-3">
                    <AppTag severity="danger">{{ stat.losses }}</AppTag>
                  </td>
                  <td class="px-4 py-3">{{ stat.total }}</td>
                  <td class="px-4 py-3">
                    <AppTag :severity="getWinRateSeverity(stat.winRate)">
                      {{ `${(stat.winRate * 100).toFixed(1)}%` }}
                    </AppTag>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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

<style scoped lang="scss">
.home {
  display: flex;
  gap: $space-2xl;
  height: 100vh;
  padding: $space-2xl;
}

.left-panel,
.right-panel {
  @include glass;
  border-radius: $radius-xl;
  padding: $space-xl;
}

.left-panel {
  flex: 0 0 30%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  margin-bottom: $space-xl;
}

.app-title {
  font-size: 1.2rem;
  color: $warn;
  display: flex;
  align-items: center;
  gap: $space-sm;
  margin: 0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  @include dark-scrollbar;
}

.panel-footer {
  margin-top: auto;
  padding-top: $space-lg;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.right-panel {
  flex: 1;
  overflow-y: auto;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-lg;
  margin: $space-lg 0;
  padding: $space-lg;
  background: rgba(255, 255, 255, 0.06);
  border-radius: $radius-lg;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-md;
  background: rgba(255, 255, 255, 0.03);
  border-radius: $radius-md;

  i {
    font-size: 1.2rem;
    margin-bottom: $space-xs;
  }

  &.win { color: $success; }
  &.loss { color: $danger; }
  &.rate { color: $warn; }
}

.stat-label {
  font-size: 0.8rem;
  margin-bottom: $space-xs;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.character-stats {
  h2 {
    font-size: 1.1rem;
    margin: $space-xl 0 $space-md;
    color: $text-primary;
  }
}

.character-table {
  font-size: 0.9rem;
}

.character-filter {
  margin-bottom: $space-xl;
  display: flex;
  align-items: center;
  gap: $space-lg;
}

.filter-select {
  padding: $space-sm $space-lg;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: $radius-md;
  background: rgba(255, 255, 255, 0.08);
  color: $text-primary;
  cursor: pointer;
  min-width: 200px;
}

.card-pick-section {
  h2 {
    font-size: 1.2rem;
    margin: $space-2xl 0 $space-lg;
    color: $text-primary;
  }
}
</style>
