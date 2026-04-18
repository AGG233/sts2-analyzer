<script setup lang="ts">
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import { BarChart, LineChart } from "echarts/charts";
import {
	GridComponent,
	LegendComponent,
	TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, defineAsyncComponent, ref } from "vue";
import type { DeckChange, GoldPoint, HpPoint } from "~/data/analytics";

const VChart = defineAsyncComponent(() =>
	import("vue-echarts").then((module) => module.default),
);

type ChartType = "hp" | "gold" | "deck";
type TimelinePoint = HpPoint | GoldPoint | DeckChange;
type SeriesOption = LineSeriesOption | BarSeriesOption;

const props = defineProps<{
	hpData?: HpPoint[];
	goldData?: GoldPoint[];
	deckData?: DeckChange[];
	allPlayersHpData?: HpPoint[][];
	allPlayersGoldData?: GoldPoint[][];
	allPlayersDeckData?: DeckChange[][];
}>();

const emit = defineEmits<(e: "hoverFloor", floor: number | null) => void>();

use([
	LineChart,
	BarChart,
	GridComponent,
	TooltipComponent,
	LegendComponent,
	CanvasRenderer,
]);

const { t } = useI18n();

// 玩家颜色
const playerColors = ["#42a5f5", "#66bb6a", "#ffa726", "#ab47bc"];

// 图表类型切换
const chartType = ref<ChartType>("hp");

const chartTypeOptions = computed(() => [
	{ label: t("chart.hp"), value: "hp" as const },
	{ label: t("chart.gold"), value: "gold" as const },
	{ label: t("chart.deckSize"), value: "deck" as const },
]);

const chartData = computed(() => ({
	hp: {
		allPlayers: props.allPlayersHpData,
		single: props.hpData,
		yAxisName: t("chart.hp"),
	},
	gold: {
		allPlayers: props.allPlayersGoldData,
		single: props.goldData,
		yAxisName: t("chart.gold"),
	},
	deck: {
		allPlayers: props.allPlayersDeckData,
		single: props.deckData,
		yAxisName: t("chart.deckSize"),
	},
}));

const getFloorData = (
	allData: TimelinePoint[][] | undefined,
	singleData: TimelinePoint[] | undefined,
): number[] => {
	if (allData && allData.length > 0 && allData[0]) {
		return allData[0].map((d) => d.floor);
	}
	if (singleData) {
		return singleData.map((d) => d.floor);
	}
	return [];
};

const buildAllPlayersSeries = <T extends TimelinePoint>(
	data: T[][] | undefined,
	label: (playerIndex: number) => string,
	value: (point: T) => number,
	options?: Pick<LineSeriesOption, "smooth">,
): SeriesOption[] => {
	if (!data || data.length === 0) return [];

	return data.flatMap((playerData, index) =>
		playerData.length > 0
			? [
					{
						name: label(index),
						type: "line",
						data: playerData.map(value),
						itemStyle: { color: playerColors[index % playerColors.length] },
						showSymbol: true,
						symbolSize: 4,
						...options,
					} satisfies LineSeriesOption,
				]
			: [],
	);
};

const getXAxisData = (type: ChartType): number[] =>
	getFloorData(chartData.value[type].allPlayers, chartData.value[type].single);

const getSeriesForChartType = (type: ChartType): SeriesOption[] => {
	if (type === "hp") {
		const allPlayersSeries = buildAllPlayersSeries(
			props.allPlayersHpData,
			(index) => `P${index + 1} HP`,
			(point) => point.hp,
		);
		if (allPlayersSeries.length > 0) return allPlayersSeries;
		if (!props.hpData?.length) return [];

		return [
			{
				name: t("chart.hp"),
				type: "line",
				data: props.hpData.map((d) => d.hp),
				itemStyle: { color: "#e53935" },
				areaStyle: { color: "rgba(229,57,53,0.1)" },
			},
			{
				name: t("chart.maxHp"),
				type: "line",
				data: props.hpData.map((d) => d.maxHp),
				itemStyle: { color: "#90a4ae" },
				lineStyle: { type: "dashed" },
			},
		];
	}

	if (type === "gold") {
		const allPlayersSeries = buildAllPlayersSeries(
			props.allPlayersGoldData,
			(index) => `P${index + 1} Gold`,
			(point) => point.gold,
		);
		if (allPlayersSeries.length > 0) return allPlayersSeries;
		if (!props.goldData?.length) return [];

		return [
			{
				name: t("chart.gold"),
				type: "line",
				data: props.goldData.map((d) => d.gold),
				itemStyle: { color: "#f9a825" },
				areaStyle: { color: "rgba(249,168,37,0.1)" },
			},
			{
				name: t("chart.spent"),
				type: "bar",
				data: props.goldData.map((d) => d.spent),
				itemStyle: { color: "rgba(229,57,53,0.6)" },
			},
			{
				name: t("chart.gained"),
				type: "bar",
				data: props.goldData.map((d) => d.gained),
				itemStyle: { color: "rgba(46,125,50,0.6)" },
			},
		];
	}

	const allPlayersSeries = buildAllPlayersSeries(
		props.allPlayersDeckData,
		(index) => `P${index + 1}`,
		(point) => point.deckSize,
		{ smooth: true },
	);
	if (allPlayersSeries.length > 1) return allPlayersSeries;
	if (!props.deckData?.length) return [];

	return [
		{
			name: t("chart.deckSize"),
			type: "line",
			data: props.deckData.map((d) => d.deckSize),
			itemStyle: { color: "#42a5f5" },
			areaStyle: { color: "rgba(66,165,245,0.1)" },
			smooth: true,
		},
	];
};

const option = computed(() => {
	const series = getSeriesForChartType(chartType.value);

	const xAxisData = getXAxisData(chartType.value);

	const yAxisName = chartData.value[chartType.value].yAxisName;

	return {
		animation: true,
		animationDuration: 500,
		animationEasing: "cubicOut" as const,
		animationDurationUpdate: 300,
		animationEasingUpdate: "cubicOut" as const,
		tooltip: { trigger: "axis" },
		legend: { top: 0 },
		grid: { left: 60, right: 30, top: 60, bottom: 50 },
		xAxis: {
			type: "category",
			data: xAxisData,
			name: t("chart.floorAxis"),
			nameLocation: "middle",
			nameGap: 30,
		},
		yAxis: {
			type: "value",
			name: yAxisName,
			nameLocation: "middle",
			nameGap: 40,
		},
		series,
	};
});

function handleChartMouseOver(params: {
	dataIndex?: number;
	targetType?: string;
}) {
	if (params.targetType === "axis" && params.dataIndex !== undefined) {
		const xAxisData = getXAxisData(chartType.value);
		const floor = xAxisData[params.dataIndex];
		if (floor !== undefined) {
			emit("hoverFloor", floor);
		}
	}
}

function handleChartMouseOut() {
	emit("hoverFloor", null);
}
</script>

<template>
  <div class="combined-timeline">
    <AppToggleButton
      v-model="chartType"
      :options="chartTypeOptions"
      size="small"
      class="chart-switcher"
    />
    <VChart :option="option" style="height: 300px; width: 100%" autoresize @mouseover="handleChartMouseOver" @mouseout="handleChartMouseOut" />
  </div>
</template>

<style scoped lang="scss">
.combined-timeline {
  position: relative;
}

.chart-switcher {
  margin-bottom: $space-md;
}
</style>
