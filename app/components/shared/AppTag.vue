<script setup lang="ts">
interface Props {
  severity?: 'success' | 'warn' | 'danger' | 'info' | 'secondary'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'secondary',
  class: '',
})

const severityClasses: Record<string, string> = {
  success: 'bg-green-500/20 text-green-300 border-green-500/30',
  warn: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  danger: 'bg-red-500/20 text-red-300 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  secondary: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-1 rounded text-xs font-medium border',
      severityClasses[severity],
      props.class
    ]"
  >
    <slot />
  </span>
</template>
