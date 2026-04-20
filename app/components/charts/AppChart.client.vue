<script setup lang="ts">
import { defineAsyncComponent } from "vue";

defineProps<{
	option: Record<string, unknown> | null;
	height?: string;
}>();

const VChart = defineAsyncComponent(() =>
	import("vue-echarts").then((module) => module.default),
);
</script>

<template>
  <VChart
    v-if="option"
    :option="option"
    :style="{ height: height ?? '300px', width: '100%' }"
    autoresize
  />
</template>
