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
import type { HpPoint } from "~/data/analytics";

const VChart = defineAsyncComponent(() => import("vue-echarts" as any));

const props = defineProps<{
	data: HpPoint[];
	allPlayersData?: HpPoint[][];
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
		// 总览模式：显示所有玩家的 HP 和 Max HP
		for (let i = 0; i < props.allPlayersData.length; i++) {
			const playerData = props.allPlayersData[i];
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
	} else if (props.data && props.data.length > 0) {
		// 单玩家模式
		series.push(
			{
				name: t("chart.hp"),
				type: "line",
				data: props.data.map((d) => d.hp),
				itemStyle: { color: "#e53935" },
				areaStyle: { color: "rgba(229,57,53,0.1)" },
			},
			{
				name: t("chart.maxHp"),
				type: "line",
				data: props.data.map((d) => d.maxHp),
				itemStyle: { color: "#90a4ae" },
				lineStyle: { type: "dashed" },
			},
			{
				name: t("chart.damageTaken"),
				type: "bar",
				data: props.data.map((d) => d.damageTaken),
				itemStyle: { color: "rgba(255,152,0,0.6)" },
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
		yAxis: { type: "value", name: "HP", nameLocation: "middle", nameGap: 40 },
		series,
	};
});
</script>

<template>
  <VChart :option="option" style="height: 300px; width: 100%" autoresize />
</template>
