import type { RunFile } from '../data/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getRunSummary } from '../data/analytics'
import { batchParseRunFiles, scanDirectoryHandle } from '../data/parser'
import { clearAll, loadDirHandle, loadRuns, saveDirHandle, saveRuns } from '../lib/storage'

export const useRunStore = defineStore('runs', () => {
  const runs = ref<RunFile[]>([])
  const loading = ref(false)
  const dirHandle = ref<FileSystemDirectoryHandle | null>(null)

  const summaries = computed(() =>
    runs.value.map(r => ({ ...getRunSummary(r), _run: r })),
  )

  const wins = computed(() => runs.value.filter(r => r.win).length)
  const losses = computed(() => runs.value.filter(r => !r.win).length)

  async function addRuns(newRuns: RunFile[]) {
    const existingSeeds = new Set(runs.value.map(r => r.seed))
    const unique = newRuns.filter(r => !existingSeeds.has(r.seed))
    if (unique.length === 0)
      return
    runs.value.push(...unique)
    await saveRuns(runs.value as unknown[])
  }

  function getRunBySeed(seed: string): RunFile | undefined {
    return runs.value.find(r => r.seed === seed)
  }

  async function setDirHandle(handle: FileSystemDirectoryHandle) {
    dirHandle.value = handle
    await saveDirHandle(handle)
  }

  async function rescan(): Promise<number> {
    if (!dirHandle.value)
      return 0
    loading.value = true
    try {
      const handle = dirHandle.value as FileSystemDirectoryHandle & {
        queryPermission: (desc: { mode: string }) => Promise<PermissionState>
        requestPermission: (desc: { mode: string }) => Promise<PermissionState>
      }
      const perm = await handle.queryPermission({ mode: 'read' })
      if (perm !== 'granted') {
        const requested = await handle.requestPermission({ mode: 'read' })
        if (requested !== 'granted')
          return 0
      }
      const files = await scanDirectoryHandle(dirHandle.value)
      const parsed = await batchParseRunFiles(files)
      await addRuns(parsed.map(r => r.data))
      return parsed.length
    } finally {
      loading.value = false
    }
  }

  async function clear() {
    runs.value = []
    dirHandle.value = null
    await clearAll()
  }

  // Restore from IndexedDB on store creation
  async function init() {
    const data = await loadRuns()
    if (data.length > 0) {
      runs.value = data as RunFile[]
    }
    const handle = await loadDirHandle()
    if (handle) {
      dirHandle.value = handle
    }
  }
  init()

  return { runs, loading, summaries, wins, losses, addRuns, getRunBySeed, clear, dirHandle, setDirHandle, rescan }
})
