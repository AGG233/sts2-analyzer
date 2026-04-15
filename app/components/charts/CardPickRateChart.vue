<script setup lang="ts">
import VChart from 'vue-echarts'
import { computed, ref, watch } from 'vue'
import { getCardPickRateByCharacter, getCardPickRate } from '~/data/analytics'
import { useGameI18n } from '~/locales/lookup'
import { useRunStore } from '~/stores/runStore'

const props = defineProps<{ characterId?: string }>()
const store = useRunStore()
const { cardName } = useGameI18n()
const chartData = ref()

// 计算图表数据
const chartOption = computed(() => {
  if (!chartData.value) return null

  // 只显示前20个最常出现的卡牌
  const topCards = [...chartData.value].sort((a, b) => b.total - a.total).slice(0, 20)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['选取', '跳过', '总次数'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '次数',
      axisLabel: { color: '#e0e0e0' },
      axisLine: { lineStyle: { color: '#e0e0e0' } }
    },
    yAxis: {
      type: 'category',
      data: topCards.map(c => cardName(c.cardId)),
      axisLabel: {
        color: '#e0e0e0',
        interval: 0,
        rotate: 30
      },
      axisLine: { lineStyle: { color: '#e0e0e0' } }
    },
    series: [
      {
        name: '选取',
        type: 'bar',
        data: topCards.map(c => c.picked),
        itemStyle: { color: '#66bb6a' }
      },
      {
        name: '跳过',
        type: 'bar',
        data: topCards.map(c => c.skipped),
        itemStyle: { color: '#ef5350' }
      },
      {
        name: '总次数',
        type: 'line',
        yAxisIndex: 1,
        data: topCards.map(c => c.total),
        itemStyle: { color: '#f9a825' }
      }
    ]
  }
})

// 监听数据变化
watch(() => store.runs, () => {
  updateChartData()
}, { deep: true })

watch(() => props.characterId, () => {
  updateChartData()
})

function updateChartData() {
  if (!store.runs.length) {
    chartData.value = []
    return
  }

  if (props.characterId) {
    chartData.value = getCardPickRateByCharacter(store.runs, props.characterId)
  } else {
    chartData.value = getCardPickRate(store.runs)
  }
}

// 初始化
updateChartData()
</script>

<template>
  <div class="card-pick-chart">
    <VChart
      v-if="chartOption"
      :option="chartOption"
      autoresize
      class="chart"
    />
  </div>
</template>

<style scoped lang="scss">
.card-pick-chart {
  width: 100%;
  height: 400px;
  margin-top: $space-lg;
}

.chart {
  width: 100%;
  height: 100%;
}
</style>
