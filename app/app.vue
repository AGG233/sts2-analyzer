<script setup lang="ts">
// Global styles are loaded via nuxt.config.ts
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* Global styles */
body {
  margin: 0;
  padding: 0;
  background: #0a1628;
  color: #e0e0e0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

a {
  color: #42a5f5;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

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
