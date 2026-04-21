<script setup lang="ts">
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	CopyCheck,
	Filter,
	TrendingUp,
} from "@lucide/vue";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { CardPickRateOptions, CardPickStat } from "~/data/analytics";
import { getCardPickRate, getCardPickRateByCharacter } from "~/data/analytics";
import { getAllCardMetadata } from "~/data/card-metadata";
import { getDB } from "~/lib/db.client";
import { useGameI18n } from "~/locales/lookup";
import { useRunStore } from "~/stores/runStore";

const props = defineProps<{ characterId?: string }>();
const store = useRunStore();
const { cardName } = useGameI18n();
const { t } = useI18n();

// 卡牌元数据缓存：cardId -> { rarity, type }
const cardMetaMap = ref<Map<string, { rarity: string; type: string }>>(
	new Map(),
);

onMounted(async () => {
	const db = getDB();
	const meta = await getAllCardMetadata(db);
	const map = new Map<string, { rarity: string; type: string }>();
	for (const [id, entry] of Object.entries(meta)) {
		map.set(id, { rarity: entry.rarity, type: entry.type });
	}
	cardMetaMap.value = map;
});

function getCardRarity(cardId: string): string {
	const bare = cardId.replace("CARD.", "");
	return cardMetaMap.value.get(bare)?.rarity ?? "Unknown";
}

function getCardType(cardId: string): string {
	const bare = cardId.replace("CARD.", "");
	return cardMetaMap.value.get(bare)?.type ?? "";
}

const chartData = ref<CardPickStat[]>([]);
const sortBy = ref<"total" | "pickRate">("total");
const sortOrder = ref<"desc" | "asc">("desc");
const showPickRateOnly = ref(false);
const deduplicate = ref(false);
const characterPoolOnly = ref(true);
const floorRange = ref<{ min?: number; max?: number } | undefined>(undefined);
const selectedRarity = ref<string | undefined>(undefined);
const selectedType = ref<string | undefined>(undefined);

const RARITY_FILTER_OPTIONS = [
	"Common",
	"Uncommon",
	"Rare",
	"Ancient",
	"Event",
] as const;

const TYPE_FILTER_OPTIONS = ["Attack", "Skill", "Power"] as const;

type FloorRangeOption = { label: string; min?: number; max?: number };
const floorRangeOptions = computed<FloorRangeOption[]>(() => [
	{ label: t("chart.floorAll"), min: undefined, max: undefined },
	{ label: t("chart.floorPhase1"), min: 1, max: 17 },
	{ label: t("chart.floorPhase2"), min: 18, max: 33 },
	{ label: t("chart.floorPhase3"), min: 34, max: undefined },
]);

const pickRateOptions = computed<CardPickRateOptions>(() => ({
	deduplicate: deduplicate.value,
	floorMin: floorRange.value?.min,
	floorMax: floorRange.value?.max,
}));

const filteredData = computed(() => {
	if (!chartData.value) return [];

	let data = [...chartData.value];

	// 稀有度筛选
	if (selectedRarity.value) {
		data = data.filter((d) => getCardRarity(d.cardId) === selectedRarity.value);
	}

	// 卡牌种类筛选
	if (selectedType.value) {
		data = data.filter((d) => getCardType(d.cardId) === selectedType.value);
	}

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
			sortOrder.value === "desc" ? a.picked - b.picked : b.picked - a.picked,
		);
	}

	// 只显示高选取率的卡牌
	if (showPickRateOnly.value) {
		data = data.filter((d) => d.pickRate >= 0.5 && d.total >= 10);
	}

	return sortOrder.value === "desc" ? data.slice(-25) : data.slice(0, 25);
});

const summaryStats = computed(() => {
	if (!chartData.value.length) {
		return { mostPicked: null, highestPickRate: null };
	}

	const sortedByTotal = [...chartData.value].sort((a, b) => b.total - a.total);
	const sortedByPickRate = [...chartData.value]
		.filter((entry) => entry.total >= 5)
		.sort((a, b) => b.pickRate - a.pickRate);

	return {
		mostPicked: sortedByTotal[0] ?? null,
		highestPickRate: sortedByPickRate[0] ?? null,
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
          <div style="margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 4px;">
            ${t("chart.pickRateLabel")}: <span style="color: #f9a825">${(card.pickRate * 100).toFixed(1)}%</span>
          </div>
        `;
			},
		},
		legend: {
			data: [
				sortBy.value === "pickRate"
					? t("chart.pickRateLabel")
					: t("chart.count"),
			],
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
			name:
				sortBy.value === "pickRate"
					? t("chart.pickRateLabel")
					: t("chart.count"),
			axisLabel: {
				color: "#9ca3af",
				formatter: sortBy.value === "pickRate" ? "{value}%" : undefined,
			},
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
				name:
					sortBy.value === "pickRate"
						? t("chart.pickRateLabel")
						: t("chart.count"),
				type: "bar",
				data:
					sortBy.value === "pickRate"
						? data.map((c) => +(c.pickRate * 100).toFixed(1))
						: data.map((c) => c.picked),
				itemStyle: { color: "#22c55e" },
				barWidth: "60%",
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

async function updateChartData() {
	if (!store.runs.length) {
		chartData.value = [];
		return;
	}

	if (props.characterId) {
		chartData.value = await getCardPickRateByCharacter(
			store.runs,
			props.characterId,
			{
				characterPoolOnly: characterPoolOnly.value,
			},
		);
	} else {
		chartData.value = getCardPickRate(store.runs, pickRateOptions.value);
	}
}

onMounted(async () => {
	await updateChartData();
});
</script>

<template>
  <div class="card-pick-chart">
    <!-- 统计摘要 -->
    <div v-if="summaryStats.mostPicked || summaryStats.highestPickRate" class="chart-summary">
      <div v-if="summaryStats.mostPicked" class="stat-pill highlight">
        <span class="stat-label">{{ t('chart.mostPicked') }}</span>
        <span class="stat-value">{{ cardName(summaryStats.mostPicked.cardId) }}</span>
        <span class="stat-rate">{{ summaryStats.mostPicked.total }}</span>
      </div>
      <div v-if="summaryStats.highestPickRate" class="stat-pill highlight">
        <span class="stat-label">{{ t('chart.highestPickRate') }}</span>
        <span class="stat-value">{{ cardName(summaryStats.highestPickRate.cardId) }}</span>
        <span class="stat-rate">{{ (summaryStats.highestPickRate.pickRate * 100).toFixed(0) }}%</span>
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
      <button
        v-if="props.characterId"
        :class="['control-btn', { active: characterPoolOnly }]"
        @click="characterPoolOnly = !characterPoolOnly"
      >
        <Filter :size="14" />
        {{ characterPoolOnly ? t('chart.characterPoolOnly') : t('chart.allCards') }}
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

    <!-- 稀有度筛选 -->
    <div class="filter-row">
      <span class="filter-label">{{ t('chart.rarity') }}</span>
      <div class="filter-buttons">
        <button
          :class="['floor-range-btn', { active: selectedRarity === undefined }]"
          @click="selectedRarity = undefined"
        >
          {{ t('chart.rarityAll') }}
        </button>
        <button
          v-for="r in RARITY_FILTER_OPTIONS"
          :key="r"
          :class="['floor-range-btn', { active: selectedRarity === r }]"
          @click="selectedRarity = selectedRarity === r ? undefined : r"
        >
          {{ t(`chart.rarity${r}`) }}
        </button>
      </div>
    </div>

    <!-- 卡牌种类筛选 -->
    <div class="filter-row">
      <span class="filter-label">{{ t('chart.cardType') }}</span>
      <div class="filter-buttons">
        <button
          :class="['floor-range-btn', { active: selectedType === undefined }]"
          @click="selectedType = undefined"
        >
          {{ t('chart.typeAll') }}
        </button>
        <button
          v-for="tp in TYPE_FILTER_OPTIONS"
          :key="tp"
          :class="['floor-range-btn', { active: selectedType === tp }]"
          @click="selectedType = selectedType === tp ? undefined : tp"
        >
          {{ t(`chart.type${tp}`) }}
        </button>
      </div>
    </div>

    <!-- 图表 -->
    <div class="chart-container">
      <AppChart
        v-if="chartOption"
        :option="chartOption"
        height="720px"
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
  margin-bottom: $space-md;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: $space-sm;
  margin-bottom: $space-md;
  flex-wrap: wrap;
}

.filter-label {
  color: $text-secondary;
  font-size: 0.8rem;
  min-width: 3rem;
}

.filter-buttons {
  display: flex;
  gap: $space-sm;
  flex-wrap: wrap;
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
