<script setup lang="ts">
import { Check, PieChart, Trophy, X } from "@lucide/vue";
import { computed } from "vue";

const props = defineProps<{
	total: number;
	wins: number;
	losses: number;
}>();

const { t } = useI18n();

const winRate = computed(() => {
	if (!props.total) return "0.0";
	return ((props.wins / props.total) * 100).toFixed(1);
});
</script>

<template>
  <div class="stats-overview">
    <div class="stat-item">
      <Trophy class="w-5 h-5 mb-1" />
      <span class="stat-label">{{ t('home.total') }}</span>
      <span class="stat-value">{{ total }}</span>
    </div>
    <div class="stat-item win">
      <Check class="w-5 h-5 mb-1" />
      <span class="stat-label">{{ t('home.wins') }}</span>
      <span class="stat-value">{{ wins }}</span>
    </div>
    <div class="stat-item loss">
      <X class="w-5 h-5 mb-1" />
      <span class="stat-label">{{ t('home.losses') }}</span>
      <span class="stat-value">{{ losses }}</span>
    </div>
    <div class="stat-item rate">
      <PieChart class="w-5 h-5 mb-1" />
      <span class="stat-label">{{ t('home.winRate') }}</span>
      <span class="stat-value">{{ winRate }}%</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-lg;
  margin: $space-lg 0;
  padding: $space-lg;
  background: rgba(255, 255, 255, 0.06);
  border-radius: $radius-lg;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-md;
  background: rgba(255, 255, 255, 0.03);
  border-radius: $radius-md;

  i {
    font-size: 1.2rem;
    margin-bottom: $space-xs;
  }

  &.win { color: $success; }
  &.loss { color: $danger; }
  &.rate { color: $warn; }
}

.stat-label {
  font-size: 0.8rem;
  margin-bottom: $space-xs;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
}
</style>
