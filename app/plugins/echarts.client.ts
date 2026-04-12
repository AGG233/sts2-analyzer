import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  LineChart,
  BarChart,
  ScatterChart
} from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

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
    DataZoomComponent
  ])

  // Register VChart component globally
  nuxtApp.vueApp.component('VChart', VChart)
})