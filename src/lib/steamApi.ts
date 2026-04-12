// Steam Web API integration for STS2 Analyzer

const STEAM_API_BASE = 'https://api.steampowered.com'
const STEAM_APP_ID = '2868840'

// API key from environment variable
const STEAM_API_KEY = import.meta.env.VITE_STEAM_API_KEY as string | undefined

export interface PlayerSummary {
  steamid: string
  personaname: string
  avatar: string
  avatarmedium: string
  avatarfull: string
  profileurl: string
  realname?: string
  loccountrycode?: string
  lastlogoff?: number
  timecreated?: number
  _cachedAt?: number
}

interface PlayerSummariesResponse {
  response: {
    players: PlayerSummary[]
  }
}

interface OwnedGamesResponse {
  response: {
    game_count?: number
    games?: { appid: number, playtime_forever: number }[]
  }
}

// ---- Cache ----

const playerCache = new Map<string, PlayerSummary>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function isCacheValid(player: PlayerSummary): boolean {
  if (!player._cachedAt)
    return false
  return Date.now() - player._cachedAt < CACHE_TTL
}

function cachePlayer(player: PlayerSummary): PlayerSummary {
  player._cachedAt = Date.now()
  playerCache.set(player.steamid, player)
  return player
}

// ---- API calls ----

function hasApiKey(): boolean {
  return !!STEAM_API_KEY && STEAM_API_KEY.length > 0
}

function makeDefaultPlayer(id: string): PlayerSummary {
  return {
    steamid: id,
    personaname: `Player ${id}`,
    avatar: '',
    avatarmedium: '',
    avatarfull: '',
    profileurl: '',
    _cachedAt: Date.now(),
  }
}

/**
 * Get player summaries by Steam IDs
 */
export async function getPlayerSummaries(steamIds: (string | number)[]): Promise<PlayerSummary[]> {
  const uniqueIds = [...new Set(steamIds.map(id => String(id)))]
  const results: PlayerSummary[] = []

  // Resolve from cache
  const uncached: string[] = []
  for (const id of uniqueIds) {
    const cached = playerCache.get(id)
    if (cached && isCacheValid(cached)) {
      results.push(cached)
    }
    else {
      uncached.push(id)
    }
  }

  if (uncached.length === 0)
    return results

  // Without API key, return defaults
  if (!hasApiKey()) {
    for (const id of uncached) {
      results.push(cachePlayer(makeDefaultPlayer(id)))
    }
    return results
  }

  try {
    const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${uncached.join(',')}`
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`Steam API error: ${response.status}`)
      for (const id of uncached)
        results.push(cachePlayer(makeDefaultPlayer(id)))
      return results
    }

    const data: PlayerSummariesResponse = await response.json()
    const returnedIds = new Set<string>()

    if (data.response?.players) {
      for (const player of data.response.players) {
        returnedIds.add(player.steamid)
        results.push(cachePlayer(player))
      }
    }

    // Fallback for IDs not returned (private profiles, etc.)
    for (const id of uncached) {
      if (!returnedIds.has(id))
        results.push(cachePlayer(makeDefaultPlayer(id)))
    }
  }
  catch (error) {
    console.warn('Steam API request failed:', error)
    for (const id of uncached)
      results.push(cachePlayer(makeDefaultPlayer(id)))
  }

  return results
}

/**
 * Get player display name by Steam ID
 */
export async function getPlayerName(steamId: string | number): Promise<string> {
  const summaries = await getPlayerSummaries([String(steamId)])
  return summaries[0]?.personaname ?? `Player ${steamId}`
}

/**
 * Get total playtime (in minutes) for Slay the Spire 2
 */
export async function getGamePlaytime(steamId: string | number, appId = STEAM_APP_ID): Promise<number> {
  const idStr = String(steamId)

  if (!hasApiKey())
    return 0

  try {
    const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${idStr}&include_played_free_games=1&appids_filter=${appId}`
    const response = await fetch(url)

    if (!response.ok)
      return 0

    const data: OwnedGamesResponse = await response.json()
    const game = data.response?.games?.find(g => g.appid === Number(appId))
    return game?.playtime_forever ?? 0
  }
  catch {
    return 0
  }
}

/**
 * Clear all in-memory cache
 */
export function clearPlayerCache(): void {
  playerCache.clear()
}
