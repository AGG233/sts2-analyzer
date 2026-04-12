// IndexedDB persistence layer for run data and directory handle.
// Run data is JSON-serialized to avoid Vue Proxy structured-clone issues.

const DB_NAME = 'sts2-analyzer'
const DB_VERSION = 2
const STORE_NAME = 'data'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      // Create the store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      // Clean up old store from v1 schema
      if (db.objectStoreNames.contains('runs')) {
        db.deleteObjectStore('runs')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function put(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

async function get(key: string): Promise<unknown | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => {
        db.close()
        resolve(req.result ?? null)
      }
      req.onerror = () => {
        db.close()
        reject(req.error)
      }
    })
  }
  catch {
    return null
  }
}

// ---- Run data (JSON serialized to strip Vue Proxies) ----

export async function saveRuns(runs: unknown[]): Promise<void> {
  await put('runs', JSON.stringify(runs))
}

export async function loadRuns(): Promise<unknown[]> {
  const raw = (await get('runs')) as string | null
  if (!raw)
    return []
  try {
    return JSON.parse(raw) as unknown[]
  }
  catch {
    return []
  }
}

// ---- Directory handle ----

export async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await put('dirHandle', handle)
}

export async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  return (await get('dirHandle')) as FileSystemDirectoryHandle | null
}

// ---- Player info (cached Steam API responses) ----

interface PlayerCacheEntry {
  steamId: string
  playerSummary: any
  timestamp: number
}

export async function savePlayerInfo(steamId: string | number, playerSummary: any): Promise<void> {
  const idStr = String(steamId)
  const entry: PlayerCacheEntry = {
    steamId: idStr,
    playerSummary,
    timestamp: Date.now()
  }

  // Store per-player info
  await put(`player:${idStr}`, entry)

  // Also maintain a list of known player IDs
  const knownIds = (await get('knownPlayerIds')) as string[] || []
  if (!knownIds.includes(idStr)) {
    knownIds.push(idStr)
    await put('knownPlayerIds', knownIds)
  }
}

export async function loadPlayerInfo(steamId: string | number): Promise<PlayerCacheEntry | null> {
  const idStr = String(steamId)
  const entry = (await get(`player:${idStr}`)) as PlayerCacheEntry | null
  if (!entry) {
    return null
  }

  // Check if cache entry is still valid (24h TTL)
  if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) {
    return null
  }

  return entry
}

export async function loadAllPlayerInfo(): Promise<PlayerCacheEntry[]> {
  const knownIds = (await get('knownPlayerIds')) as string[] || []
  const entries: PlayerCacheEntry[] = []

  for (const id of knownIds) {
    const entry = await loadPlayerInfo(id)
    if (entry) {
      entries.push(entry)
    }
  }

  return entries
}

export async function clearPlayerCache(): Promise<void> {
  const knownIds = (await get('knownPlayerIds')) as string[] || []

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')

    // Remove per-player entries
    for (const id of knownIds) {
      tx.objectStore(STORE_NAME).delete(`player:${id}`)
    }

    // Remove known IDs list
    tx.objectStore(STORE_NAME).delete('knownPlayerIds')

    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function clearAll(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}
