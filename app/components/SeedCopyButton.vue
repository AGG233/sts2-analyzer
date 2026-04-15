<script setup lang="ts">
import AppButton from '~/components/shared/AppButton.vue'

const props = defineProps<{ seed: string }>()
const copied = ref(false)

function copySeed() {
  navigator.clipboard.writeText(props.seed)
    .then(() => {
      copied.value = true
      setTimeout(() => copied.value = false, 2000)
    })
    .catch(err => console.error('复制失败:', err))
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
    {{ copied ? '✓' : '📋' }}
  </AppButton>
</template>

<style scoped>
.seed-copy-button {
  margin-left: 0.5rem;
  color: #e0e0e0;
}

.seed-copy-button:hover {
  color: #f9a825;
}
</style>
