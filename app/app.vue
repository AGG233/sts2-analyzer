<script setup lang="ts">
import { useRunStore } from '~/stores/runStore'

const store = useRunStore()
onMounted(() => store.init())
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* PrimeVue dark theme overrides */
.p-datatable {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
}

.p-datatable .p-datatable-thead > tr > th {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: #e0e0e0;
}

.p-datatable .p-datatable-tbody > tr {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.08);
  color: #e0e0e0;
}

.p-datatable .p-datatable-tbody > tr:hover {
  background: rgba(255, 255, 255, 0.04);
}
</style>
