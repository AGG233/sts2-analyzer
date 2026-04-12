<script setup lang="ts">
import type { GoldPoint } from '~/data/analytics'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  data: GoldPoint[]
  allPlayersData?: GoldPoint[][]
}>()

use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const { t } = useI18n()

// 玩家颜色
const playerColors = ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc']

const option = computed(() => {
  const series = []

  if (props.allPlayersData && props.allPlayersData.length > 0) {
    // 总览模式：显示所有玩家的金币
    for (let i = 0; i < props.allPlayersData.length; i++) {
      const playerData = props.allPlayersData[i]
      if (playerData.length > 0) {
        series.push({
          name: `P${i + 1} Gold`,
          type: 'line',
          data: playerData.map(d => d.gold),
          itemStyle: { color: playerColors[i % playerColors.length] },
          showSymbol: true,
          symbolSize: 4,
        })
      }
    }
  } else if (props.data && props.data.length > 0) {
    // 单玩家模式
    series.push({
      name: t('ui.chart.gold'),
      type: 'line',
      data: props.data.map(d => d.gold),
      itemStyle: { color: '#f9a825' },
      areaStyle: { color: 'rgba(249,168,37,0.1)' },
    })
    series.push({
      name: t('ui.chart.spent'),
      type: 'bar',
      data: props.data.map(d => d.spent),
      itemStyle: { color: 'rgba(229,57,53,0.6)' },
    })
    series.push({
      name: t('ui.chart.gained'),
      type: 'bar',
      data: props.data.map(d => d.gained),
      itemStyle: { color: 'rgba(46,125,50,0.6)' },
    })
  }

  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 60, right: 30, top: 60, bottom: 50 },
    xAxis: {
      type: 'category',
      data: (props.data || (props.allPlayersData && props.allPlayersData[0]) || []).map(d => d.floor),
      name: t('ui.chart.floorAxis'),
      nameLocation: 'middle',
      nameGap: 30,
    },
    yAxis: { type: 'value', name: t('ui.chart.gold'), nameLocation: 'middle', nameGap: 40 },
    series,
  }
})
</script>

<template>
  <VChart :option="option" style="height: 300px; width: 100%" autoresize />
</template>
