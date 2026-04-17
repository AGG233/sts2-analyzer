<script setup lang="ts">
import { ArrowDown, ArrowUpDown, ArrowUp, CopyCheck, Filter, TrendingUp } from "@lucide/vue";
import { computed, defineAsyncComponent, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { CardPickRateOptions } from "~/data/analytics";
import { getCardPickRate, getCardPickRateByCharacter } from "~/data/analytics";
import { useGameI18n } from "~/locales/lookup";
import { useRunStore } from "~/stores/runStore";

const VChart = defineAsyncComponent(() => import("vue-echarts"));

const props = defineProps<{ characterId?: string }>();
const store = useRunStore();
const { cardName } = useGameI18n();
const { t } = useI18n();

const chartData = ref();
const sortBy = ref<"total" | "pickRate">("total");
const sortOrder = ref<"desc" | "asc">("desc");
const showPickRateOnly = ref(false);
const deduplicate = ref(false);
const floorRange = ref<{ min?: number; max?: number } | undefined>(undefined);

type FloorRangeOption = { label: string; min?: number; max?: number };
const floorRangeOptions = computed<FloorRangeOption[]>(() => [
	{ label: t("chart.floorAll"), min: undefined, max: undefined },
	{ label: "1-17", min: 1, max: 17 },
	{ label: "18-33", min: 18, max: 33 },
	{ label: "34+", min: 34, max: undefined },
]);

const pickRateOptions = computed<CardPickRateOptions>(() => ({
	deduplicate: deduplicate.value,
	floorMin: floorRange.value?.min,
	floorMax: floorRange.value?.max,
}));

const filteredData = computed(() => {
	if (!chartData.value) return [];

	let data = [...chartData.value];

	// 排序（ECharts Y轴从下往上渲染，数组末尾=图表顶部）
	if (sortBy.value === "pickRate") {
		data = data
			.filter((d) => d.total >= 10)
			.sort((a, b) =>
				sortOrder.value === "desc"
					? a.pickRate - b.pickRate
					: b.pickRate - a.pickRate,
			);
	} else {
		data = data.sort((a, b) =>
			sortOrder.value === "desc" ? a.total - b.total : b.total - a.total,
		);
	}

	// 只显示高选取率的卡牌
	if (showPickRateOnly.value) {
		data = data.filter((d) => d.pickRate >= 0.5 && d.total >= 10);
	}

	return sortOrder.value === "desc" ? data.slice(-25) : data.slice(0, 25);
});

const summaryStats = computed(() => {
	if (!chartData.value || chartData.value.length === 0) {
		return {
			totalCards: 0,
			avgPickRate: 0,
			mostPicked: null,
			mostSkipped: null,
		};
	}

	const data = chartData.value;
	const avgPickRate =
		data.reduce((sum: number, d: { pickRate: number }) => sum + d.pickRate, 0) /
		data.length;

	const sortedByPickRate = [...data].sort((a, b) => b.pickRate - a.pickRate);
	const sortedBySkipRate = [...data].sort(
		(a, b) => b.skipped / b.total - a.skipped / a.total,
	);

	return {
		totalCards: data.length,
		avgPickRate,
		mostPicked: sortedByPickRate[0],
		mostSkipped: sortedBySkipRate[0],
	};
});

const chartOption = computed(() => {
	if (!filteredData.value || filteredData.value.length === 0) return null;

	const data = filteredData.value;

	return {
		backgroundColor: "transparent",
		animation: true,
		animationDuration: 300,
		animationDurationUpdate: 300,
		tooltip: {
			trigger: "axis",
			axisPointer: { type: "shadow" },
			formatter: (params: unknown) => {
				const p = params as { dataIndex: number }[];
				const idx = p[0]?.dataIndex;
				if (idx === undefined) return "";
				const card = data[idx];
				return `
          <div style="font-weight: bold; margin-bottom: 4px;">${cardName(card.cardId)}</div>
          <div>${t("chart.picked")}: <span style="color: #66bb6a">${card.picked}</span></div>
          <div>${t("chart.skipped")}: <span style="color: #ef5350">${card.skipped}</span></div>
          <div>${t("chart.total")}: ${card.total}</div>
          <div style="margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 4px;">
            ${t("chart.pickRateLabel")}: <span style="color: #f9a825">${(card.pickRate * 100).toFixed(1)}%</span>
          </div>
        `;
			},
		},
		legend: {
			data: [t("chart.picked"), t("chart.skipped")],
			bottom: 0,
			textStyle: { color: "#9ca3af" },
		},
		grid: {
			left: "3%",
			right: "8%",
			bottom: "15%",
			top: "3%",
			containLabel: true,
		},
		xAxis: {
			type: "value",
			name: t("chart.count"),
			axisLabel: { color: "#9ca3af" },
			axisLine: { lineStyle: { color: "#4b5563" } },
			splitLine: { lineStyle: { color: "#374151" } },
		},
		yAxis: {
			type: "category",
			data: data.map((c) => cardName(c.cardId)),
			axisLabel: {
				color: "#e5e7eb",
				interval: 0,
				rotate: 0,
				fontSize: 11,
			},
			axisLine: { lineStyle: { color: "#4b5563" } },
		},
		series: [
			{
				name: t("chart.picked"),
				type: "bar",
				stack: "total",
				data: data.map((c) => c.picked),
				itemStyle: { color: "#22c55e" },
				barWidth: "60%",
			},
			{
				name: t("chart.skipped"),
				type: "bar",
				stack: "total",
				data: data.map((c) => c.skipped),
				itemStyle: { color: "#ef4444" },
			},
		],
	};
});

watch(
	() => store.runs,
	() => {
		updateChartData();
	},
	{ deep: true },
);

watch(
	() => props.characterId,
	() => {
		updateChartData();
	},
);

watch(pickRateOptions, () => {
	updateChartData();
});

function updateChartData() {
	if (!store.runs.length) {
		chartData.value = [];
		return;
	}

	if (props.characterId) {
		chartData.value = getCardPickRateByCharacter(
			store.runs,
			props.characterId,
		);
	} else {
		chartData.value = getCardPickRate(store.runs, pickRateOptions.value);
	}
}

updateChartData();
</script>

<template>
  <div class="card-pick-chart">
    <!-- 统计摘要 -->
    <div v-if="summaryStats.totalCards > 0" class="chart-summary">
      <div class="stat-pill">
        <span class="stat-label">{{ t('chart.cardTypes') }}</span>
        <span class="stat-value">{{ summaryStats.totalCards }}</span>
      </div>
      <div class="stat-pill">
        <span class="stat-label">{{ t('chart.avgPickRate') }}</span>
        <span class="stat-value">{{ (summaryStats.avgPickRate * 100).toFixed(1) }}%</span>
      </div>
      <div v-if="summaryStats.mostPicked" class="stat-pill highlight">
        <span class="stat-label">{{ t('chart.topPicked') }}</span>
        <span class="stat-value">{{ cardName(summaryStats.mostPicked.cardId) }}</span>
        <span class="stat-rate">{{ (summaryStats.mostPicked.pickRate * 100).toFixed(0) }}%</span>
      </div>
    </div>

    <!-- 筛选控制 -->
    <div class="chart-controls">
      <div class="sort-toggle" role="radiogroup">
        <label :class="['sort-toggle-btn', { active: sortBy === 'total' }]">
          <input
            type="radio"
            name="sort-order"
            value="total"
            :checked="sortBy === 'total'"
            class="sr-only"
            @change="sortBy = 'total'"
          />
          <TrendingUp :size="14" />
          {{ t('chart.sortByCount') }}
        </label>
        <label :class="['sort-toggle-btn', { active: sortBy === 'pickRate' }]">
          <input
            type="radio"
            name="sort-order"
            value="pickRate"
            :checked="sortBy === 'pickRate'"
            class="sr-only"
            @change="sortBy = 'pickRate'"
          />
          <ArrowUpDown :size="14" />
          {{ t('chart.sortByRate') }}
        </label>
      </div>
      <button
        :class="['control-btn', 'sort-order-btn', { active: sortOrder === 'asc' }]"
        :title="sortOrder === 'desc' ? t('chart.sortDesc') : t('chart.sortAsc')"
        @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
      >
        <ArrowUp v-if="sortOrder === 'asc'" :size="14" />
        <ArrowDown v-else :size="14" />
        {{ sortOrder === 'desc' ? t('chart.sortDesc') : t('chart.sortAsc') }}
      </button>
      <button
        :class="['control-btn', { active: showPickRateOnly }]"
        @click="showPickRateOnly = !showPickRateOnly"
      >
        <Filter :size="14" />
        {{ showPickRateOnly ? t('chart.showAll') : '≥50%' }}
      </button>
      <button
        :class="['control-btn', { active: deduplicate }]"
        @click="deduplicate = !deduplicate"
      >
        <CopyCheck :size="14" />
        {{ t('chart.deduplicate') }}
      </button>
    </div>

    <!-- 层数筛选 -->
    <div class="floor-range-controls">
      <button
        v-for="opt in floorRangeOptions"
        :key="opt.label"
        :class="['floor-range-btn', { active: !floorRange?.min && !floorRange?.max ? opt.min == null && opt.max == null : floorRange?.min === opt.min && floorRange?.max === opt.max }]"
        @click="floorRange = opt.min != null || opt.max != null ? { min: opt.min, max: opt.max } : undefined"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- 图表 -->
    <div class="chart-container">
      <VChart
        v-if="chartOption"
        :option="chartOption"
        autoresize
        class="chart"
      />
      <div v-else class="chart-empty">
        <p v-if="store.runs.length === 0">{{ t('chart.noData') }}</p>
        <p v-else>{{ t('chart.noMatchingCards') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card-pick-chart {
  margin-top: $space-lg;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.chart-summary {
  display: flex;
  flex-wrap: wrap;
  gap: $space-md;
  margin-bottom: $space-lg;
}

.stat-pill {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: $space-sm;
  padding: 0.3rem 0.85rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
  font-size: 0.85rem;
  line-height: normal;

  &.highlight {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.3);
  }
}

.stat-label {
  line-height: normal;
  color: $text-secondary;
}

.stat-value {
  color: $text-primary;
  line-height: normal;
  font-weight: 600;
}

.stat-rate {
  color: $success;
  font-weight: 600;
  font-size: 0.8rem;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: $space-sm;
  margin-bottom: $space-md;
  flex-wrap: wrap;
}

.floor-range-controls {
  display: flex;
  gap: $space-sm;
  margin-bottom: $space-lg;
}

.floor-range-btn {
  padding: 0.35rem 0.85rem;
  line-height: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
  color: $text-secondary;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-primary;
  }

  &.active {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.4);
    color: $success;
  }
}

.sort-toggle {
  display: inline-flex;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 9999px;
  padding: 3px;
}

.sort-toggle-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-width: 6rem;
  padding: 0.4rem 0.9rem;
  border-radius: 9999px;
  color: $text-secondary;
  font-size: 0.8rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s ease;
  z-index: 1;

  &:hover:not(.active) {
    color: $text-primary;
  }

  &.active {
    color: #fff;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: $success;
      border-radius: 9999px;
      z-index: -1;
    }
  }
  &.sort-order-btn {
    padding: 0.35rem 0.55rem;
  }
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.85rem;
  line-height: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
  color: $text-secondary;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-primary;
  }

  &.active {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.4);
    color: $success;
  }
}

.chart-container {
  background: rgba(0, 0, 0, 0.2);
  border-radius: $radius-lg;
  padding: $space-md;
  min-height: 400px;
}

.chart {
  width: 100%;
  height: 400px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: $text-muted;
  text-align: center;
}
</style>
