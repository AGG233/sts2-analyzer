import type { PlayerSummary } from '../lib/steamApi'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getPlayerSummaries, getGamePlaytime } from '../lib/steamApi'
import { savePlayerInfo, loadAllPlayerInfo } from '../lib/storage'

export const usePlayerStore = defineStore('players', () => {
  // State
  const playerInfoCache = ref<Map<string, PlayerSummary>>(new Map())
  const loading = ref<Set<string>>(new Set())

  // Load cached players from IndexedDB on initialization
  async function loadCachedPlayers() {
    const cachedEntries = await loadAllPlayerInfo()
    cachedEntries.forEach(entry => {
      playerInfoCache.value.set(entry.steamId, entry.playerSummary)
    })
  }
  loadCachedPlayers()

  // Actions
  async function getPlayerSummary(steamId: string | number): Promise<PlayerSummary> {
    const idStr = String(steamId)

    // Return from cache if available
    if (playerInfoCache.value.has(idStr)) {
      return playerInfoCache.value.get(idStr)!
    }

    // Check if we're already loading this player
    if (loading.value.has(idStr)) {
      // Wait for the existing promise
      let attempts = 0
      while (loading.value.has(idStr) && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        attempts++
      }
      if (playerInfoCache.value.has(idStr)) {
        return playerInfoCache.value.get(idStr)!
      }
    }

    // Mark as loading
    loading.value.add(idStr)

    try {
      // Fetch from Steam API
      const players = await getPlayerSummaries([idStr])
      if (players.length > 0) {
        const summary = players[0]
        playerInfoCache.value.set(idStr, summary)

        // Save to IndexedDB
        await savePlayerInfo(idStr, summary)

        return summary
      }

      // Fallback if API fails
      const fallbackSummary: PlayerSummary = {
        steamid: idStr,
        personaname: `Player ${idStr}`,
        avatar: '',
        avatarmedium: '',
        avatarfull: '',
        profileurl: ''
      }
      playerInfoCache.value.set(idStr, fallbackSummary)
      return fallbackSummary

    } catch (error) {
      console.warn(`Failed to load player info for ${idStr}:`, error)
      const fallbackSummary: PlayerSummary = {
        steamid: idStr,
        personaname: `Player ${idStr}`,
        avatar: '',
        avatarmedium: '',
        avatarfull: '',
        profileurl: ''
      }
      playerInfoCache.value.set(idStr, fallbackSummary)
      return fallbackSummary

    } finally {
      // Remove loading indicator
      loading.value.delete(idStr)
    }
  }

  async function getPlayerDisplayName(steamId: string | number): Promise<string> {
    const summary = await getPlayerSummary(steamId)
    return summary.personaname
  }

  async function getPlaytime(steamId: string | number): Promise<number> {
    try {
      const playtime = await getGamePlaytime(steamId)
      return playtime
    } catch (error) {
      console.warn(`Failed to load playtime for ${steamId}:`, error)
      return 0
    }
  }

  // Get all known players
  const knownPlayers = computed(() => {
    return Array.from(playerInfoCache.value.values())
  })

  return {
    // State
    playerInfoCache,
    loading,

    // Actions
    getPlayerSummary,
    getPlayerDisplayName,
    getPlaytime,

    // Getters
    knownPlayers,
  }
})
