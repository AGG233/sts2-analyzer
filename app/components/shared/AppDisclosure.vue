<script setup lang="ts">
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'

interface Props {
  legend: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  class: '',
})
</script>

<template>
  <Disclosure as="div" :class="['card-fieldset', props.class]">
    <DisclosureButton class="w-full flex items-center justify-between py-3 text-left font-medium text-gray-200 hover:text-white">
      <span>{{ legend }}</span>
      <span class="transform transition-transform ui-open:rotate-180">▼</span>
    </DisclosureButton>
    <DisclosurePanel class="pb-3">
      <slot />
    </DisclosurePanel>
  </Disclosure>
</template>

<style scoped lang="scss">
.card-fieldset {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 200px;

  &:last-child {
    border-bottom: none;
  }
}
</style>
