<script setup lang="ts">
import type { RunSummary } from '~/data/analytics'
import AppButton from '~/components/shared/AppButton.vue'
import AppTag from '~/components/shared/AppTag.vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameI18n } from '~/locales/lookup'
import SeedCopyButton from '~/components/SeedCopyButton.vue'

const props = defineProps<{ summaries: (RunSummary & { _run: unknown })[] }>()

const { t } = useI18n()
const { characterName } = useGameI18n()
const router = useRouter()

// Filtering
const filterCharacter = ref<string>('')
const filterResult = ref<string>('')
const filterAscension = ref<string>('')

function resetFilters() {
  filterCharacter.value = ''
  filterResult.value = ''
  filterAscension.value = ''
}

// Get unique characters for filter
const uniqueCharacters = computed(() => {
  const chars = new Set<string>()
  props.summaries.forEach(s => chars.add(s.character))
  return Array.from(chars).map(c => ({ label: characterName(c), value: c }))
})

// Get unique ascension levels for filter
const uniqueAscensions = computed(() => {
  const levels = new Set<number>()
  props.summaries.forEach(s => levels.add(s.ascension))
  return Array.from(levels).sort((a, b) => a - b).map(a => ({ label: `A${a}`, value: String(a) }))
})

// Filtered summaries
const filteredSummaries = computed(() => {
  let result = [...props.summaries]

  if (filterCharacter.value)
    result = result.filter(s => s.character === filterCharacter.value)
  if (filterResult.value)
    result = result.filter(s => (filterResult.value === 'win' ? s.win : !s.win))
  if (filterAscension.value)
    result = result.filter(s => s.ascension === Number.parseInt(filterAscension.value))

  return result
})

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString()
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function getResultSeverity(win: boolean): 'success' | 'danger' {
  return win ? 'success' : 'danger'
}

function onRowClick(data: RunSummary) {
  router.push(`/run/${data.seed}`)
}
</script>

<template>
  <div v-if="summaries.length > 0" class="run-list">
    <h2>{{ t('home.runHistory') }} ({{ filteredSummaries.length }} {{ t('home.runs') }})</h2>

    <!-- Filters -->
    <div class="filters">
      <select v-model="filterCharacter" class="filter-select">
        <option value="">
          {{ t('run.allCharacters') }}
        </option>
        <option v-for="char in uniqueCharacters" :key="char.value" :value="char.value">
          {{ char.label }}
        </option>
      </select>

      <select v-model="filterResult" class="filter-select">
        <option value="">
          {{ t('run.allResults') }}
        </option>
        <option value="win">
          {{ t('run.victory') }}
        </option>
        <option value="loss">
          {{ t('run.defeat') }}
        </option>
      </select>

      <select v-model="filterAscension" class="filter-select">
        <option value="">
          {{ t('run.allAscensions') }}
        </option>
        <option v-for="asc in uniqueAscensions" :key="asc.value" :value="asc.value">
          {{ asc.label }}
        </option>
      </select>

      <AppButton variant="outlined" size="small" @click="resetFilters">
        ↻ {{ t('run.reset') }}
      </AppButton>
    </div>

    <!-- Table -->
    <div class="table-container overflow-x-auto">
      <table class="w-full text-sm cursor-pointer">
        <thead class="text-left bg-white/5">
          <tr>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('table.result') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('table.character') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('table.asc') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('run.seed') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('run.floors') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('table.time') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('run.date') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          <tr
            v-for="summary in filteredSummaries"
            :key="summary.seed"
            class="hover:bg-white/5 transition-colors"
            @click="onRowClick(summary)"
          >
            <td class="px-4 py-3">
              <AppTag :severity="getResultSeverity(summary.win)">
                {{ summary.win ? t('table.win') : t('table.loss') }}
              </AppTag>
            </td>
            <td class="px-4 py-3">
              {{ characterName(summary.character) }}
            </td>
            <td class="px-4 py-3">
              A{{ summary.ascension }}
            </td>
            <td class="px-4 py-3">
              <code class="seed-code">{{ summary.seed }}</code>
              <SeedCopyButton :seed="summary.seed" />
            </td>
            <td class="px-4 py-3">
              {{ summary.totalFloors }}
            </td>
            <td class="px-4 py-3">
              {{ formatTime(summary.runTime) }}
            </td>
            <td class="px-4 py-3">
              {{ formatDate(summary.startTime) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.run-list h2 {
  font-size: 1.1rem;
  margin: 1.5rem 0 0.75rem;
  color: #e0e0e0;
}

.filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  padding: 0.4rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.08);
  color: #e0e0e0;
  cursor: pointer;
}

.filter-select option {
  background: #152a42;
  color: #e0e0e0;
}

.seed-code {
  font-family: monospace;
  font-size: 0.8rem;
}
</style>
