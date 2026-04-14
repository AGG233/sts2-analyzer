<script setup lang="ts">
import Button from 'primevue/button'
import Message from 'primevue/message'
import { onMounted, ref } from 'vue'
import { batchParseRunFiles, filterRunFiles, scanDirectoryHandle } from '~/data/parser'
import { useRunStore } from '~/stores/runStore'

const { t } = useI18n()
const store = useRunStore()

const scanning = ref(false)
const scanResult = ref<{ count: number } | null>(null)
const error = ref<string | null>(null)
const supportsDirectoryPicker = import.meta.client && 'showDirectoryPicker' in window

async function onPickDirectory() {
  if (!supportsDirectoryPicker)
    return
  scanning.value = true
  error.value = null
  scanResult.value = null

  try {
    const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker()
    const files = await scanDirectoryHandle(dirHandle)
    const parsed = await batchParseRunFiles(files)
    scanResult.value = { count: parsed.length }
    await store.setDirHandle(dirHandle)
    await store.addRuns(parsed.map(r => r.data))
  }
  catch (e) {
    if ((e as DOMException)?.name === 'AbortError') {
      // User cancelled the picker
    }
    else {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }
  finally {
    scanning.value = false
  }
}

async function onUpdate() {
  scanning.value = true
  error.value = null
  try {
    const count = await store.rescan()
    scanResult.value = { count }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    scanning.value = false
  }
}

async function onFallbackInput(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files)
    return

  scanning.value = true
  error.value = null

  try {
    const files = filterRunFiles(Array.from(input.files))
    const parsed = await batchParseRunFiles(files)
    scanResult.value = { count: parsed.length }
    await store.addRuns(parsed.map(r => r.data))
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    scanning.value = false
  }
}

// Auto-rescan on mount if we have a stored directory handle
onMounted(async () => {
  if (store.dirHandle) {
    try {
      const handle = store.dirHandle as FileSystemDirectoryHandle & {
        queryPermission: (desc: { mode: string }) => Promise<PermissionState>
      }
      const perm = await handle.queryPermission({ mode: 'read' })
      if (perm === 'granted') {
        await onUpdate()
      }
    }
    catch {
      // Permission not available, user can click Update manually
    }
  }
})
</script>

<template>
  <div class="scanner">
    <div class="btn-group">
      <template v-if="supportsDirectoryPicker">
        <Button
          :label="scanning ? t('home.scanning') : (store.dirHandle ? t('home.changeDir') : t('home.selectDir'))"
          icon="pi pi-folder-open"
          :loading="scanning"
          @click="onPickDirectory"
        />
        <Button
          v-if="store.dirHandle"
          :label="t('home.update')"
          icon="pi pi-refresh"
          variant="outlined"
          :loading="scanning"
          @click="onUpdate"
        />
      </template>
      <template v-else>
        <label class="fallback-label">
          <Button
            :label="scanning ? t('home.scanning') : t('home.selectDir')"
            icon="pi pi-folder-open"
            :loading="scanning"
            severity="secondary"
          />
          <input type="file" webkitdirectory :disabled="scanning" @change="onFallbackInput">
        </label>
      </template>
    </div>

    <Message v-if="scanResult" severity="success" :closable="false" class="scan-message">
      {{ t('home.foundRuns', { count: scanResult.count }) }}
    </Message>
    <Message v-if="error" severity="error" :closable="false" class="scan-message">
      {{ error }}
    </Message>
  </div>
</template>

<style scoped>
.scanner {
  text-align: center;
  padding: 2rem;
}
.btn-group {
  display: inline-flex;
  gap: 0.75rem;
}
.fallback-label {
  position: relative;
  display: inline-block;
}
.fallback-label input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.scan-message {
  margin-top: 0.75rem;
}
</style>
