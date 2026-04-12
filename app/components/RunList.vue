<script setup lang="ts">
import type { RunSummary } from '~/data/analytics'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useGameI18n } from '~/locales/lookup'

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

// Filtered summaries for DataTable
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

function onRowClick(event: { data: RunSummary }) {
  router.push(`/run/${event.data.seed}`)
}
</script>

<template>
  <div v-if="summaries.length > 0" class="run-list">
    <h2>{{ t('ui.home.runHistory') }} ({{ filteredSummaries.length }} {{ t('ui.home.runs') }})</h2>

    <!-- Filters -->
    <div class="filters">
      <select v-model="filterCharacter" class="filter-select">
        <option value="">
          {{ t('ui.run.allCharacters') }}
        </option>
        <option v-for="char in uniqueCharacters" :key="char.value" :value="char.value">
          {{ char.label }}
        </option>
      </select>

      <select v-model="filterResult" class="filter-select">
        <option value="">
          {{ t('ui.run.allResults') }}
        </option>
        <option value="win">
          {{ t('ui.run.victory') }}
        </option>
        <option value="loss">
          {{ t('ui.run.defeat') }}
        </option>
      </select>

      <select v-model="filterAscension" class="filter-select">
        <option value="">
          {{ t('ui.run.allAscensions') }}
        </option>
        <option v-for="asc in uniqueAscensions" :key="asc.value" :value="asc.value">
          {{ asc.label }}
        </option>
      </select>

      <Button :label="t('ui.run.reset')" icon="pi pi-refresh" variant="outlined" size="small" @click="resetFilters" />
    </div>

    <!-- Table -->
    <DataTable
      :value="filteredSummaries"
      :row-hover="true"
      :paginator="filteredSummaries.length > 20"
      :rows="20"
      sort-mode="single"
      removable-sort
      @row-click="onRowClick"
    >
      <Column field="win" :header="t('ui.table.result')" sortable>
        <template #body="{ data }">
          <Tag :value="data.win ? t('ui.table.win') : t('ui.table.loss')" :severity="getResultSeverity(data.win)" />
        </template>
      </Column>
      <Column field="character" :header="t('ui.table.character')" sortable>
        <template #body="{ data }">
          {{ characterName(data.character) }}
        </template>
        <template #sorticon="{ sortOrder }">
          <i class="pi" :class="sortOrder === 1 ? 'pi-sort-alt' : sortOrder === -1 ? 'pi-sort-alt' : 'pi-sort-alt'" />
        </template>
      </Column>
      <Column field="ascension" :header="t('ui.table.asc')" sortable />
      <Column field="seed" :header="t('ui.run.seed')">
        <template #body="{ data }">
          <code class="seed-code">{{ data.seed }}</code>
        </template>
      </Column>
      <Column field="totalFloors" :header="t('ui.run.floors')" sortable />
      <Column field="runTime" :header="t('ui.table.time')" sortable>
        <template #body="{ data }">
          {{ formatTime(data.runTime) }}
        </template>
      </Column>
      <Column field="startTime" :header="t('ui.run.date')" sortable>
        <template #body="{ data }">
          {{ formatDate(data.startTime) }}
        </template>
      </Column>
    </DataTable>
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

:deep(.p-datatable-table) {
  cursor: pointer;
}
</style>
