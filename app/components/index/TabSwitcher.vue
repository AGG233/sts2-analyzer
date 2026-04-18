<script setup lang="ts">
import { BarChart2, List } from "@lucide/vue";

defineProps<{
	modelValue: "chart" | "list";
}>();

const emit =
	defineEmits<(e: "update:modelValue", value: "chart" | "list") => void>();

const { t } = useI18n();
</script>

<template>
  <div class="right-tabs">
    <button
      :class="['tab-btn', { active: modelValue === 'chart' }]"
      @click="emit('update:modelValue', modelValue === 'chart' ? 'list' : 'chart')"
    >
      <BarChart2 :size="16" />
      {{ t('home.cardAnalysis') }}
    </button>
    <button
      :class="['tab-btn', { active: modelValue === 'list' }]"
      @click="emit('update:modelValue', modelValue === 'list' ? 'chart' : 'list')"
    >
      <List :size="16" />
      {{ t('home.runHistory') }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.right-tabs {
  display: inline-flex;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 9999px;
  padding: 4px;
}

.tab-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  border-radius: 9999px;
  color: $text-secondary;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s ease;
  z-index: 1;

  &:hover:not(.active) {
    color: $text-primary;
  }

  &.active {
    color: #ffffff;
  }

  &.active::before {
    content: '';
    position: absolute;
    inset: 0;
    background: $success;
    border-radius: 9999px;
    z-index: -1;
  }
}
</style>
