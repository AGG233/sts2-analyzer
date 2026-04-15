<script setup lang="ts">
import type { DeckChange, GoldPoint, HpPoint } from '~/data/analytics'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import AppToggleButton from '~/components/shared/AppToggleButton.vue'
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps<{
  hpData?: HpPoint[]
  goldData?: GoldPoint[]
  deckData?: DeckChange[]
  allPlayersHpData?: HpPoint[][]
  allPlayersGoldData?: GoldPoint[][]
  allPlayersDeckData?: DeckChange[][]
}>()

const emit = defineEmits<{
  (e: 'hoverFloor', floor: number | null): void
}>()

use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const { t } = useI18n()

// 玩家颜色
const playerColors = ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc']

// 图表类型切换
const chartType = ref<'hp' | 'gold' | 'deck'>('hp')

const chartTypeOptions = computed(() => [
  { label: t('chart.hp'), value: 'hp' as const },
  { label: t('chart.gold'), value: 'gold' as const },
  { label: t('chart.deckSize'), value: 'deck' as const },
])

const option = computed(() => {
  const series = []

  if (chartType.value === 'hp') {
    // HP 图表
    if (props.allPlayersHpData && props.allPlayersHpData.length > 0) {
      for (let i = 0; i < props.allPlayersHpData.length; i++) {
        const playerData = props.allPlayersHpData[i]
        if (playerData.length > 0) {
          series.push({
            name: `P${i + 1} HP`,
            type: 'line',
            data: playerData.map(d => d.hp),
            itemStyle: { color: playerColors[i % playerColors.length] },
            showSymbol: true,
            symbolSize: 4,
          })
        }
      }
    }
    else if (props.hpData && props.hpData.length > 0) {
      series.push({
        name: t('chart.hp'),
        type: 'line',
        data: props.hpData.map(d => d.hp),
        itemStyle: { color: '#e53935' },
        areaStyle: { color: 'rgba(229,57,53,0.1)' },
      })
      series.push({
        name: t('chart.maxHp'),
        type: 'line',
        data: props.hpData.map(d => d.maxHp),
        itemStyle: { color: '#90a4ae' },
        lineStyle: { type: 'dashed' },
      })
    }
  }
  else if (chartType.value === 'gold') {
    // 金币图表
    if (props.allPlayersGoldData && props.allPlayersGoldData.length > 0) {
      for (let i = 0; i < props.allPlayersGoldData.length; i++) {
        const playerData = props.allPlayersGoldData[i]
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
    }
    else if (props.goldData && props.goldData.length > 0) {
      series.push({
        name: t('chart.gold'),
        type: 'line',
        data: props.goldData.map(d => d.gold),
        itemStyle: { color: '#f9a825' },
        areaStyle: { color: 'rgba(249,168,37,0.1)' },
      })
      series.push({
        name: t('chart.spent'),
        type: 'bar',
        data: props.goldData.map(d => d.spent),
        itemStyle: { color: 'rgba(229,57,53,0.6)' },
      })
      series.push({
        name: t('chart.gained'),
        type: 'bar',
        data: props.goldData.map(d => d.gained),
        itemStyle: { color: 'rgba(46,125,50,0.6)' },
      })
    }
  }
  else {
    // 卡组数量图表
    if (props.allPlayersDeckData && props.allPlayersDeckData.length > 1) {
      for (let i = 0; i < props.allPlayersDeckData.length; i++) {
        const playerData = props.allPlayersDeckData[i]
        if (playerData.length > 0) {
          series.push({
            name: `P${i + 1}`,
            type: 'line',
            data: playerData.map(d => d.deckSize),
            itemStyle: { color: playerColors[i % playerColors.length] },
            showSymbol: true,
            symbolSize: 4,
            smooth: true,
          })
        }
      }
    }
    else if (props.deckData && props.deckData.length > 0) {
      series.push({
        name: t('chart.deckSize'),
        type: 'line',
        data: props.deckData.map(d => d.deckSize),
        itemStyle: { color: '#42a5f5' },
        areaStyle: { color: 'rgba(66,165,245,0.1)' },
        smooth: true,
      })
    }
  }

  // 确定 X 轴数据
  let xAxisData: number[] = []
  if (chartType.value === 'hp') {
    if (props.allPlayersHpData && props.allPlayersHpData.length > 0) {
      xAxisData = props.allPlayersHpData[0].map(d => d.floor)
    }
    else if (props.hpData) {
      xAxisData = props.hpData.map(d => d.floor)
    }
  }
  else if (chartType.value === 'gold') {
    if (props.allPlayersGoldData && props.allPlayersGoldData.length > 0) {
      xAxisData = props.allPlayersGoldData[0].map(d => d.floor)
    }
    else if (props.goldData) {
      xAxisData = props.goldData.map(d => d.floor)
    }
  }
  else {
    if (props.allPlayersDeckData && props.allPlayersDeckData.length > 0) {
      xAxisData = props.allPlayersDeckData[0].map(d => d.floor)
    }
    else if (props.deckData) {
      xAxisData = props.deckData.map(d => d.floor)
    }
  }

  const yAxisName = chartType.value === 'hp'
    ? t('chart.hp')
    : chartType.value === 'gold'
      ? t('chart.gold')
      : t('chart.deckSize')

  return {
    animation: true,
    animationDuration: 500,
    animationEasing: 'cubicOut' as const,
    animationDurationUpdate: 300,
    animationEasingUpdate: 'cubicOut' as const,
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 60, right: 30, top: 60, bottom: 50 },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: t('chart.floorAxis'),
      nameLocation: 'middle',
      nameGap: 30,
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameLocation: 'middle',
      nameGap: 40,
    },
    series,
  }
})

function handleChartMouseOver(params: { dataIndex?: number, targetType?: string }) {
  if (params.targetType === 'axis' && params.dataIndex !== undefined) {
    // Get xAxis data for current chart type
    let xAxisData: number[] = []
    if (chartType.value === 'hp') {
      xAxisData = props.allPlayersHpData?.length ? props.allPlayersHpData[0].map(d => d.floor) : props.hpData?.map(d => d.floor) ?? []
    }
    else if (chartType.value === 'gold') {
      xAxisData = props.allPlayersGoldData?.length ? props.allPlayersGoldData[0].map(d => d.floor) : props.goldData?.map(d => d.floor) ?? []
    }
    else {
      xAxisData = props.allPlayersDeckData?.length ? props.allPlayersDeckData[0].map(d => d.floor) : props.deckData?.map(d => d.floor) ?? []
    }
    const floor = xAxisData[params.dataIndex]
    if (floor !== undefined) {
      emit('hoverFloor', floor)
    }
  }
}

function handleChartMouseOut() {
  emit('hoverFloor', null)
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
