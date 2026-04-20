<script setup lang="ts">
import { computed, ref } from "vue";
import type { RunSummary } from "~/data/analytics";
import { useGameI18n } from "~/locales/lookup";

const props = defineProps<{
	summaries: RunSummary[];
	characterFilter?: string;
}>();

const { t } = useI18n();
const { characterName } = useGameI18n();
const router = useRouter();

// Filtering
const filterResult = ref<string>("");
const filterAscension = ref<string>("");

function resetFilters() {
	filterResult.value = "";
	filterAscension.value = "";
}

// Get unique ascension levels for filter
const uniqueAscensions = computed(() => {
	const levels = new Set<number>();
	for (const s of props.summaries) {
		levels.add(s.ascension);
	}
	return Array.from(levels)
		.sort((a, b) => a - b)
		.map((a) => ({ label: `A${a}`, value: String(a) }));
});

// Filtered summaries
const filteredSummaries = computed(() => {
	let result = [...props.summaries];

	if (props.characterFilter)
		result = result.filter((s) => s.character === props.characterFilter);
	if (filterResult.value)
		result = result.filter((s) =>
			filterResult.value === "win" ? s.win : !s.win,
		);
	if (filterAscension.value)
		result = result.filter(
			(s) => s.ascension === Number.parseInt(filterAscension.value, 10),
		);

	return result;
});

function formatDate(ts: number): string {
	return new Date(ts * 1000).toLocaleDateString();
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}m ${s}s`;
}

function getResultSeverity(win: boolean): "success" | "danger" {
	return win ? "success" : "danger";
}

function onRowClick(data: RunSummary) {
	router.push(`/run/${data.seed}`);
}
</script>

<template>
  <div v-if="summaries.length > 0" class="run-list">
    <h2>{{ t('home.runHistory') }} ({{ filteredSummaries.length }} {{ t('home.runs') }})</h2>

    <!-- Filters -->
    <div class="filters">
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
              <AppSeedCopyButton :seed="summary.seed" @click.stop />
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

<style scoped lang="scss">
.run-list {
  h2 {
    font-size: 1.1rem;
    margin: $space-xl 0 $space-md;
    color: $text-primary;
  }
}

.filters {
  display: flex;
  gap: $space-sm;
  margin-bottom: $space-lg;
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  padding: 0.4rem 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
  font-size: 0.85rem;
  line-height: 1;
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  cursor: pointer;

  option {
    background: $surface-dark;
    color: $text-primary;
  }
}

.seed-code {
  font-family: monospace;
  font-size: 0.8rem;
}
</style>
