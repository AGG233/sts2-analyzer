<script setup lang="ts">
interface Option {
	label: string;
	value: unknown;
}

interface Props {
	modelValue: unknown;
	options: Option[];
	allowEmpty?: boolean;
	size?: "small" | "medium" | "large";
	class?: string;
}

const props = withDefaults(defineProps<Props>(), {
	allowEmpty: false,
	size: "medium",
	class: "",
});

const emit = defineEmits<(e: "update:modelValue", value: unknown) => void>();

const _sizeClasses: Record<string, string> = {
	small: "text-xs px-2 py-1",
	medium: "text-sm px-3 py-1.5",
	large: "text-base px-4 py-2",
};

function selectOption(option: Option) {
	if (props.modelValue === option.value && props.allowEmpty) {
		emit("update:modelValue", null);
	} else {
		emit("update:modelValue", option.value);
	}
}
</script>

<template>
  <div :class="['inline-flex rounded-lg bg-white/5 p-0.5', props.class]">
    <button
      v-for="option in options"
      :key="option.value"
      :class="[
        'rounded-md transition-all',
        sizeClasses[size],
        modelValue === option.value
          ? 'bg-primary-400 text-surface-900 font-medium'
          : 'text-gray-300 hover:bg-white/10'
      ]"
      @click="selectOption(option)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
