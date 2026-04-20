import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import {
	DataZoomComponent,
	GridComponent,
	LegendComponent,
	TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

export default defineNuxtPlugin(() => {
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
});
