<script setup lang="ts">
import { BarChart, LineChart } from "echarts/charts";
import {
	GridComponent,
	LegendComponent,
	TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, defineAsyncComponent } from "vue";
import type { GoldPoint } from "~/data/analytics";

// biome-ignore lint/suspicious/noExplicitAny: vue-echarts has complex dynamic import typing
const VChart = defineAsyncComponent(() => import("vue-echarts" as any));

const props = defineProps<{
	data: GoldPoint[];
	allPlayersData?: GoldPoint[][];
}>();

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

const option = computed(() => {
	const series = [];

	if (props.allPlayersData && props.allPlayersData.length > 0) {
		// 总览模式：显示所有玩家的金币
		for (let i = 0; i < props.allPlayersData.length; i++) {
			const playerData = props.allPlayersData[i];
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
	} else if (props.data && props.data.length > 0) {
		// 单玩家模式
		series.push(
			{
				name: t("chart.gold"),
				type: "line",
				data: props.data.map((d) => d.gold),
				itemStyle: { color: "#f9a825" },
				areaStyle: { color: "rgba(249,168,37,0.1)" },
			},
			{
				name: t("chart.spent"),
				type: "bar",
				data: props.data.map((d) => d.spent),
				itemStyle: { color: "rgba(229,57,53,0.6)" },
			},
			{
				name: t("chart.gained"),
				type: "bar",
				data: props.data.map((d) => d.gained),
				itemStyle: { color: "rgba(46,125,50,0.6)" },
			},
		);
	}

	return {
		tooltip: { trigger: "axis" },
		legend: { top: 0 },
		grid: { left: 60, right: 30, top: 60, bottom: 50 },
		xAxis: {
			type: "category",
			data: (props.data || props.allPlayersData?.[0] || []).map((d) => d.floor),
			name: t("chart.floorAxis"),
			nameLocation: "middle",
			nameGap: 30,
		},
		yAxis: {
			type: "value",
			name: t("chart.gold"),
			nameLocation: "middle",
			nameGap: 40,
		},
		series,
	};
});
</script>

<template>
  <VChart :option="option" style="height: 300px; width: 100%" autoresize />
</template>
