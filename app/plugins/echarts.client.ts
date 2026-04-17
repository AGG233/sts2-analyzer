import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import {
	DataZoomComponent,
	GridComponent,
	LegendComponent,
	TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";

export default defineNuxtPlugin((nuxtApp) => {
	// Register ECharts components
	use([
		CanvasRenderer,
		LineChart,
		BarChart,
		ScatterChart,
		GridComponent,
		LegendComponent,
		TooltipComponent,
		DataZoomComponent,
	]);

	// Register VChart component globally
	nuxtApp.vueApp.component("VChart", VChart);
});
