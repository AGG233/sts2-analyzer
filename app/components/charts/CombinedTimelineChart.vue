<script setup lang="ts">
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

// biome-ignore lint/suspicious/noExplicitAny: vue-echarts has complex dynamic import typing
const VChart = defineAsyncComponent(() => import("vue-echarts" as any));

type ChartType = "hp" | "gold" | "deck";

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

// 提取X轴数据
const getXAxisData = (type: ChartType): number[] => {
	switch (type) {
		case "hp":
			return getFloorData(props.allPlayersHpData, props.hpData);
		case "gold":
			return getFloorData(props.allPlayersGoldData, props.goldData);
		default:
			return getFloorData(props.allPlayersDeckData, props.deckData);
	}
};

const getFloorData = (
	allData: HpPoint[][] | GoldPoint[][] | DeckChange[][] | undefined,
	singleData: HpPoint[] | GoldPoint[] | DeckChange[] | undefined,
): number[] => {
	if (allData && allData.length > 0 && allData[0]) {
		return allData[0].map((d) => d.floor);
	}
	if (singleData) {
		return singleData.map((d) => d.floor);
	}
	return [];
};

const getSeriesForChartType = (type: ChartType) => {
	if (type === "hp") return getHpChartSeries();
	if (type === "gold") return getGoldChartSeries();
	return getDeckChartSeries();
};

const getYAxisName = (type: ChartType) => {
	if (type === "hp") return t("chart.hp");
	if (type === "gold") return t("chart.gold");
	return t("chart.deckSize");
};

// 提取HP图表配置
const getHpChartSeries = () => {
	const series = [];

	if (props.allPlayersHpData && props.allPlayersHpData.length > 0) {
		for (let i = 0; i < props.allPlayersHpData.length; i++) {
			const playerData = props.allPlayersHpData[i];
			if (playerData.length > 0) {
				series.push({
					name: `P${i + 1} HP`,
					type: "line",
					data: playerData.map((d) => d.hp),
					itemStyle: { color: playerColors[i % playerColors.length] },
					showSymbol: true,
					symbolSize: 4,
				});
			}
		}
	} else if (props.hpData && props.hpData.length > 0) {
		series.push(
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
		);
	}

	return series;
};

// 提取金币图表配置
const getGoldChartSeries = () => {
	const series = [];

	if (props.allPlayersGoldData && props.allPlayersGoldData.length > 0) {
		for (let i = 0; i < props.allPlayersGoldData.length; i++) {
			const playerData = props.allPlayersGoldData[i];
			if (playerData.length > 0) {
				series.push({
					name: `P${i + 1} Gold`,
					type: "line",
					data: playerData.map((d) => d.gold),
					itemStyle: { color: playerColors[i % playerColors.length] },
					showSymbol: true,
					symbolSize: 4,
				});
			}
		}
	} else if (props.goldData && props.goldData.length > 0) {
		series.push(
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
		);
	}

	return series;
};

// 提取卡组数量图表配置
const getDeckChartSeries = () => {
	const series = [];

	if (props.allPlayersDeckData && props.allPlayersDeckData.length > 1) {
		for (let i = 0; i < props.allPlayersDeckData.length; i++) {
			const playerData = props.allPlayersDeckData[i];
			if (playerData.length > 0) {
				series.push({
					name: `P${i + 1}`,
					type: "line",
					data: playerData.map((d) => d.deckSize),
					itemStyle: { color: playerColors[i % playerColors.length] },
					showSymbol: true,
					symbolSize: 4,
					smooth: true,
				});
			}
		}
	} else if (props.deckData && props.deckData.length > 0) {
		series.push({
			name: t("chart.deckSize"),
			type: "line",
			data: props.deckData.map((d) => d.deckSize),
			itemStyle: { color: "#42a5f5" },
			areaStyle: { color: "rgba(66,165,245,0.1)" },
			smooth: true,
		});
	}

	return series;
};

const option = computed(() => {
	const series = getSeriesForChartType(chartType.value);

	const xAxisData = getXAxisData(chartType.value);

	const yAxisName = getYAxisName(chartType.value);

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
