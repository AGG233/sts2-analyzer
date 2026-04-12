// stores/runStore.ts
import { defineStore } from 'pinia'
import type { RunFile } from '~/data/types'
import { parseRunFile, scanDirectoryHandle, batchParseRunFiles } from '~/data/parser'
import { getRunSummary } from '~/data/analytics'
import { saveRuns, loadRuns, saveDirHandle, loadDirHandle, clearAll } from '~/lib/storage.client'

export const useRunStore = defineStore('runs', () => {
  // State
  const runs = ref<RunFile[]>([])
  const loading = ref(false)
  const dirHandle = ref<FileSystemDirectoryHandle | null>(null)

  // Computed
  const summaries = computed(() =>
    runs.value.map(getRunSummary)
  )

  const wins = computed(() =>
    summaries.value.filter(s => s.win).length
  )

  const losses = computed(() =>
    summaries.value.filter(s => !s.win).length
  )

  // Actions
  const addRuns = (newRuns: RunFile[]) => {
    runs.value = [...runs.value, ...newRuns]
    if (import.meta.client) {
      saveRuns(runs.value)
    }
  }

  const getRunBySeed = (seed: string) => {
    return runs.value.find(r => r.seed === seed)
  }

  const setDirHandle = async (handle: FileSystemDirectoryHandle) => {
    dirHandle.value = handle
    if (import.meta.client) {
      await saveDirHandle(handle)
    }
  }

  const rescan = async () => {
    if (!dirHandle.value) return

    loading.value = true
    try {
      const files = await scanDirectoryHandle(dirHandle.value)
      const parsed = await batchParseRunFiles(files)
      runs.value = parsed.map(p => p.data)
      if (import.meta.client) {
        await saveRuns(runs.value)
      }
    } catch (error) {
      console.error('Rescan failed:', error)
    } finally {
      loading.value = false
    }
  }

  const clear = () => {
    runs.value = []
    dirHandle.value = null
    if (import.meta.client) {
      clearAll()
    }
  }

  // Initialize (client only)
  const init = async () => {
    if (!import.meta.client) return

    try {
      // Load runs from IndexedDB
      const savedRuns = await loadRuns()
      if (savedRuns.length > 0) {
        runs.value = savedRuns
      }

      // Load directory handle
      const savedDirHandle = await loadDirHandle()
      if (savedDirHandle) {
        dirHandle.value = savedDirHandle
      }
    } catch (error) {
      console.error('Failed to load from storage:', error)
    }
  }

  return {
    // State
    runs,
    loading,
    dirHandle,

    // Computed
    summaries,
    wins,
    losses,

    // Actions
    addRuns,
    getRunBySeed,
    setDirHandle,
    rescan,
    clear,
    init
  }
})
