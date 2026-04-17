<script setup lang="ts">
import { Check, Copy } from "@lucide/vue";
const props = defineProps<{ seed: string }>();
const copied = ref(false);

function copySeed() {
	navigator.clipboard
		.writeText(props.seed)
		.then(() => {
			copied.value = true;
			setTimeout(() => (copied.value = false), 2000);
		})
		.catch((err) => console.error("复制失败:", err));
}
</script>

<template>
  <AppButton
    variant="text"
    size="small"
    @click="copySeed"
    :title="copied ? '已复制!' : '复制种子'"
    class="seed-copy-button"
  >
    <component :is="copied ? Check : Copy" class="w-4 h-4" />
  </AppButton>
</template>

<style scoped lang="scss">
.seed-copy-button {
  margin-left: $space-sm;
  color: $text-primary;

  &:hover {
    color: $warn;
  }
}
</style>
