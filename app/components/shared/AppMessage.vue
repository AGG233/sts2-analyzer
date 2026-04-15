<script setup lang="ts">
interface Props {
  severity?: 'success' | 'info' | 'warn' | 'error'
  closable?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'info',
  closable: false,
  class: '',
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const visible = ref(true)

const severityClasses: Record<string, string> = {
  success: 'bg-green-500/20 border-green-500/30 text-green-200',
  info: 'bg-blue-500/20 border-blue-500/30 text-blue-200',
  warn: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200',
  error: 'bg-red-500/20 border-red-500/30 text-red-200',
}

const severityIcons: Record<string, string> = {
  success: '✓',
  info: 'ℹ',
  warn: '⚠',
  error: '✕',
}
</script>

<template>
  <div
    v-if="visible"
    :class="[
      'flex items-center gap-3 px-4 py-3 rounded-lg border',
      severityClasses[severity],
      props.class
    ]"
  >
    <span class="text-lg">{{ severityIcons[severity] }}</span>
    <div class="flex-1">
      <slot />
    </div>
    <button
      v-if="closable"
      class="opacity-70 hover:opacity-100"
      @click="visible = false; emit('close')"
    >
      ✕
    </button>
  </div>
</template>
