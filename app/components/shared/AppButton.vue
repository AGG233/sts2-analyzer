<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'outlined' | 'text'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  disabled?: boolean
  icon?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  loading: false,
  disabled: false,
  icon: '',
  class: '',
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const variantClasses: Record<string, string> = {
  primary: 'bg-primary-400 hover:bg-primary-300 text-surface-900 border-transparent',
  secondary: 'bg-gray-600 hover:bg-gray-500 text-white border-transparent',
  outlined: 'bg-transparent border-gray-500 hover:bg-gray-500/20 text-gray-200',
  text: 'bg-transparent border-transparent hover:bg-white/10 text-gray-200',
}

const sizeClasses: Record<string, string> = {
  small: 'px-2 py-1 text-xs',
  medium: 'px-4 py-2 text-sm',
  large: 'px-6 py-3 text-base',
}
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-md font-medium border transition-all',
      variantClasses[variant],
      sizeClasses[size],
      { 'opacity-50 cursor-not-allowed': disabled || loading },
      props.class
    ]"
    :disabled="disabled || loading"
    @click="emit('click')"
  >
    <span v-if="loading" class="animate-spin">⟳</span>
    <span v-else-if="icon" class="icon">{{ icon }}</span>
    <slot />
  </button>
</template>
