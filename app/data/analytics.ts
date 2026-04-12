// =============================================================================
// Slay the Spire 2 — Analysis Engine
// =============================================================================

import type {
  CharacterId,
  FloorPlayerStats,
  MapPoint,
  RunFile,
} from './types'

// ---- Flattened floor (act + floor index merged into a single global floor) ----

export interface FlatFloor {
  globalFloor: number // 1-based global floor number
  actIndex: number // 0-based act index
  localFloor: number // 0-based floor index within the act
  mapPoint: MapPoint
  playerStats: FloorPlayerStats[] // all players' stats
}

// ---- Timeline data points ----

export interface HpPoint {
  floor: number
  hp: number
  maxHp: number
  damageTaken: number
  hpHealed: number
  playerIndex: number
}

export interface GoldPoint {
  floor: number
  gold: number
  gained: number
  spent: number
  lost: number
  stolen: number
  playerIndex: number
}

export interface DeckChange {
  floor: number
  cardAdded: string[]
  cardRemoved: string[]
  deckSize: number
  playerIndex: number
}

export interface EncounterRecord {
  floor: number
  encounter: string
  monsters: string[]
  roomType: string
  turns: number
  damageTaken: number
  playerIndex: number
}

// ---- Summary types ----

export interface RunSummary {
  character: CharacterId
  seed: string
  ascension: number
  win: boolean
  abandoned: boolean
  totalFloors: number
  runTime: number // seconds
  startTime: number // unix timestamp
  buildId: string
  deathCause: string // encounter ID or 'NONE.NONE'
  deathEvent: string
  finalHp: number
  finalMaxHp: number
  finalGold: number
  deckSize: number
  relicCount: number
  acts: string[]
  playerCount: number
  players: {
    playerId: string | number
    character: CharacterId
    finalHp: number
    finalMaxHp: number
    deckSize: number
    relicCount: number
  }[]
}

export interface CharacterWinRate {
  character: CharacterId
  wins: number
  losses: number
  total: number
  winRate: number
}

export interface CardPickStat {
  cardId: string
  picked: number
  skipped: number
  total: number
  pickRate: number
}

export interface DeathCauseStat {
  encounter: string
  count: number
}

export interface RelicPickStat {
  relicId: string
  picked: number
  skipped: number
  total: number
  pickRate: number
}

export interface AscensionStat {
  ascension: number
  wins: number
  losses: number
  total: number
}

// ---- Simulated deck card (per-floor reconstruction) ----

export interface SimDeckCard {
  id: string
  floorAdded: number
  upgradeLevel: number
}

// ---- Helper: flatten map_point_history ----

function flattenFloors(run: RunFile): FlatFloor[] {
  const result: FlatFloor[] = []
  let globalFloor = 1

  for (let actIdx = 0; actIdx < run.map_point_history.length; actIdx++) {
    const act = run.map_point_history[actIdx]!
    for (let floorIdx = 0; floorIdx < act.length; floorIdx++) {
      const point = act[floorIdx]!
      if (point.player_stats && point.player_stats.length > 0) {
        result.push({
          globalFloor,
          actIndex: actIdx,
          localFloor: floorIdx,
          mapPoint: point,
          playerStats: point.player_stats,
        })
      }
      globalFloor++
    }
  }

  return result
}

// ---- Single-run analysis ----

export function getHpTimeline(run: RunFile, playerIndex: number = 0): HpPoint[] {
  return flattenFloors(run).map((f) => {
    const stats = f.playerStats[playerIndex]
    if (!stats)
      return null
    return {
      floor: f.globalFloor,
      hp: stats.current_hp,
      maxHp: stats.max_hp,
      damageTaken: stats.damage_taken,
      hpHealed: stats.hp_healed,
      playerIndex,
    }
  }).filter(p => p !== null) as HpPoint[]
}

export function getGoldTimeline(run: RunFile, playerIndex: number = 0): GoldPoint[] {
  return flattenFloors(run).map((f) => {
    const stats = f.playerStats[playerIndex]
    if (!stats)
      return null
    return {
      floor: f.globalFloor,
      gold: stats.current_gold,
      gained: stats.gold_gained,
      spent: stats.gold_spent,
      lost: stats.gold_lost,
      stolen: stats.gold_stolen,
      playerIndex,
    }
  }).filter(p => p !== null) as GoldPoint[]
}

export function getDeckEvolution(run: RunFile, playerIndex: number = 0): DeckChange[] {
  let deckSize = 0
  // Count starter deck size from player data
  const player = run.players[playerIndex]
  if (!player)
    return []

  // Build initial deck (floor 1 cards)
  const initialDeck = player.deck.filter(c => (c.floor_added_to_deck ?? 1) <= 1)
  deckSize = initialDeck.length

  const floors = flattenFloors(run)
  return floors.map((f) => {
    const stats = f.playerStats[playerIndex]
    if (!stats)
      return null
    const added = (stats.cards_gained ?? []).map(c => c.id)
    // cards_transformed counts as removal + addition
    const transformed = stats.cards_transformed ?? []
    const removedByTransform = transformed.map(t => t.original_card.id)
    const addedFromTransform = transformed.map(t => t.final_card.id)
    const removedByPlayer = (stats.cards_removed ?? []).map(c => c.id)

    const allRemoved = [...removedByTransform, ...removedByPlayer]
    deckSize += added.length + addedFromTransform.length - allRemoved.length

    return {
      floor: f.globalFloor,
      cardAdded: [...added, ...addedFromTransform],
      cardRemoved: allRemoved,
      deckSize,
      playerIndex,
    }
  }).filter(d => d !== null) as DeckChange[]
}

export function getEncounterStats(run: RunFile, playerIndex: number = 0): EncounterRecord[] {
  const floors = flattenFloors(run)
  const encounters: EncounterRecord[] = []

  for (const f of floors) {
    const room = f.mapPoint.rooms[0]
    if (room && room.model_id) {
      const stats = f.playerStats[playerIndex]
      encounters.push({
        floor: f.globalFloor,
        encounter: room.model_id,
        monsters: room.monster_ids ?? [],
        roomType: room.room_type,
        turns: room.turns_taken,
        damageTaken: stats?.damage_taken ?? 0,
        playerIndex,
      })
    }
  }

  return encounters
}

export function getRunSummary(run: RunFile): RunSummary {
  const player = run.players[0]
  const floors = flattenFloors(run)
  const lastFloor = floors[floors.length - 1]
  const lastStats = lastFloor?.playerStats[0]

  // Collect all players' data - use real Steam ID from first floor stats if available
  const players = run.players.map((p, index) => {
    const lastPlayerStats = lastFloor?.playerStats[index]
    let steamId: string | number = index // default to index if no stats available

    // Try to get real Steam ID from first floor stats
    if (floors.length > 0) {
      const firstFloorStats = floors[0]!.playerStats[index]
      if (firstFloorStats && firstFloorStats.player_id && firstFloorStats.player_id !== index) {
        steamId = firstFloorStats.player_id
      }
    }

    return {
      playerId: steamId,
      character: p.character ?? 'UNKNOWN',
      finalHp: lastPlayerStats?.current_hp ?? 0,
      finalMaxHp: lastPlayerStats?.max_hp ?? 0,
      deckSize: p.deck.length ?? 0,
      relicCount: p.relics.length ?? 0,
    }
  })

  return {
    character: player?.character ?? 'UNKNOWN',
    seed: run.seed,
    ascension: run.ascension,
    win: run.win,
    abandoned: run.was_abandoned,
    totalFloors: floors.length,
    runTime: run.run_time,
    startTime: run.start_time,
    buildId: run.build_id,
    deathCause: run.killed_by_encounter,
    deathEvent: run.killed_by_event,
    finalHp: lastStats?.current_hp ?? 0,
    finalMaxHp: lastStats?.max_hp ?? 0,
    finalGold: lastStats?.current_gold ?? 0,
    deckSize: player?.deck.length ?? 0,
    relicCount: player?.relics.length ?? 0,
    acts: run.acts,
    playerCount: run.players.length,
    players,
  }
}

export function getFloorTimeline(run: RunFile): FlatFloor[] {
  return flattenFloors(run)
}

/**
 * Get the player's deck cards at a specific floor (inclusive).
 *  Uses forward simulation from derived initial deck.
 */
export function getDeckAtFloor(run: RunFile, floor: number, playerIndex: number = 0): SimDeckCard[] {
  const history = getDeckHistory(run, playerIndex)
  return history.get(floor) ?? []
}

/**
 * Reconstruct the full deck at every floor via reverse + forward simulation.
 *
 * Algorithm:
 * 1. Start from the final deck, walk backwards through all floors,
 *    "undoing" each floor's card changes to derive the initial deck.
 * 2. Walk forward from floor 1..N, applying changes and snapshotting.
 *
 * Returns Map<globalFloor, SimDeckCard[]>
 */
export function getDeckHistory(run: RunFile, playerIndex: number = 0): Map<number, SimDeckCard[]> {
  const player = run.players[playerIndex]
  if (!player)
    return new Map()

  const floors = flattenFloors(run)
  if (floors.length === 0)
    return new Map()

  // --- Phase 1: Reverse simulation from final deck to initial deck ---

  // Build mutable deck from final state
  const reversedDeck: SimDeckCard[] = player.deck.map(c => ({
    id: c.id,
    floorAdded: c.floor_added_to_deck ?? 1,
    upgradeLevel: c.current_upgrade_level ?? 0,
  }))

  // Walk floors in reverse, undoing changes
  for (let i = floors.length - 1; i >= 0; i--) {
    const f = floors[i]!
    if (!f)
      continue
    const stats = f.playerStats[playerIndex]
    if (!stats)
      continue

    // Undo cards_gained: remove cards added on this floor
    if (stats.cards_gained) {
      for (const cg of stats.cards_gained) {
        const fa = cg.floor_added_to_deck ?? f.globalFloor
        const idx = reversedDeck.findIndex(c => c.id === cg.id && c.floorAdded === fa)
        if (idx !== -1)
          reversedDeck.splice(idx, 1)
      }
    }

    // Undo cards_transformed: replace final_card back with original_card
    if (stats.cards_transformed) {
      for (const ct of stats.cards_transformed) {
        const finalFa = ct.final_card.floor_added_to_deck ?? f.globalFloor
        const idx = reversedDeck.findIndex(c => c.id === ct.final_card.id && c.floorAdded === finalFa)
        if (idx !== -1) {
          reversedDeck[idx] = {
            id: ct.original_card.id,
            floorAdded: ct.original_card.floor_added_to_deck ?? f.globalFloor,
            upgradeLevel: 0,
          }
        }
      }
    }

    // Undo cards_removed: add them back
    if (stats.cards_removed) {
      for (const cr of stats.cards_removed) {
        reversedDeck.push({
          id: cr.id,
          floorAdded: cr.floor_added_to_deck ?? f.globalFloor,
          upgradeLevel: 0,
        })
      }
    }

    // Undo upgraded_cards: downgrade
    if (stats.upgraded_cards) {
      for (const uc of stats.upgraded_cards) {
        const match = reversedDeck.find(c => c.id === uc)
        if (match)
          match.upgradeLevel = Math.max(0, match.upgradeLevel - 1)
      }
    }

    // Undo downgraded_cards: re-upgrade
    if (stats.downgraded_cards) {
      for (const dc of stats.downgraded_cards) {
        const match = reversedDeck.find(c => c.id === dc)
        if (match)
          match.upgradeLevel++
      }
    }
  }

  // --- Phase 2: Forward simulation from initial deck ---

  const result = new Map<number, SimDeckCard[]>()

  // Snapshot at floor 0 (initial deck before any changes)
  const deck: SimDeckCard[] = reversedDeck.map(c => ({ ...c }))
  result.set(0, deck.map(c => ({ ...c })))

  for (const f of floors) {
    const stats = f.playerStats[playerIndex]
    if (!stats) {
      result.set(f.globalFloor, deck.map(c => ({ ...c })))
      continue
    }

    // Apply cards_removed
    if (stats.cards_removed) {
      for (const cr of stats.cards_removed) {
        const fa = cr.floor_added_to_deck ?? f.globalFloor
        const idx = deck.findIndex(c => c.id === cr.id && c.floorAdded === fa)
        if (idx !== -1)
          deck.splice(idx, 1)
      }
    }

    // Apply cards_transformed: replace original → final
    if (stats.cards_transformed) {
      for (const ct of stats.cards_transformed) {
        const origFa = ct.original_card.floor_added_to_deck ?? f.globalFloor
        const idx = deck.findIndex(c => c.id === ct.original_card.id && c.floorAdded === origFa)
        if (idx !== -1) {
          deck[idx] = {
            id: ct.final_card.id,
            floorAdded: ct.final_card.floor_added_to_deck ?? f.globalFloor,
            upgradeLevel: 0,
          }
        }
      }
    }

    // Apply cards_gained
    if (stats.cards_gained) {
      for (const cg of stats.cards_gained) {
        deck.push({
          id: cg.id,
          floorAdded: cg.floor_added_to_deck ?? f.globalFloor,
          upgradeLevel: cg.current_upgrade_level ?? 0,
        })
      }
    }

    // Apply upgraded_cards
    if (stats.upgraded_cards) {
      for (const uc of stats.upgraded_cards) {
        const match = deck.find(c => c.id === uc)
        if (match)
          match.upgradeLevel++
      }
    }

    // Apply downgraded_cards
    if (stats.downgraded_cards) {
      for (const dc of stats.downgraded_cards) {
        const match = deck.find(c => c.id === dc)
        if (match)
          match.upgradeLevel = Math.max(0, match.upgradeLevel - 1)
      }
    }

    // Snapshot after this floor
    result.set(f.globalFloor, deck.map(c => ({ ...c })))
  }

  return result
}

/** Calculate the player's relics at a specific floor (inclusive) */
export function getRelicsAtFloor(run: RunFile, floor: number, playerIndex: number = 0): { id: string, floor_added_to_deck: number }[] {
  const player = run.players[playerIndex]
  if (!player)
    return []

  const relics: { id: string, floor_added_to_deck: number }[] = []
  for (const relic of player.relics) {
    if ((relic.floor_added_to_deck ?? 1) <= floor) {
      relics.push({ id: relic.id, floor_added_to_deck: relic.floor_added_to_deck ?? 1 })
    }
  }
  return relics
}

// ---- Multi-run analysis ----

export function getWinRateByCharacter(runs: RunFile[]): CharacterWinRate[] {
  const map = new Map<CharacterId, { wins: number, losses: number }>()

  for (const run of runs) {
    const char = run.players[0]?.character ?? 'UNKNOWN'
    const entry = map.get(char) ?? { wins: 0, losses: 0 }
    if (run.win) {
      entry.wins++
    } else {
      entry.losses++
    }
    map.set(char, entry)
  }

  return Array.from(map.entries()).map(([character, { wins, losses }]) => ({
    character,
    wins,
    losses,
    total: wins + losses,
    winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
  }))
}

export function getCardPickRate(runs: RunFile[]): CardPickStat[] {
  const map = new Map<string, { picked: number, skipped: number }>()

  for (const run of runs) {
    for (const act of run.map_point_history) {
      for (const floor of act) {
        for (const ps of floor.player_stats) {
          for (const choice of ps.card_choices ?? []) {
            const id = choice.card.id
            const entry = map.get(id) ?? { picked: 0, skipped: 0 }
            if (choice.was_picked) {
              entry.picked++
            } else {
              entry.skipped++
            }
            map.set(id, entry)
          }
        }
      }
    }
  }

  return Array.from(map.entries())
    .map(([cardId, { picked, skipped }]) => ({
      cardId,
      picked,
      skipped,
      total: picked + skipped,
      pickRate: picked + skipped > 0 ? picked / (picked + skipped) : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

export function getDeathCauseStats(runs: RunFile[]): DeathCauseStat[] {
  const map = new Map<string, number>()

  for (const run of runs) {
    if (!run.win && run.killed_by_encounter !== 'NONE.NONE') {
      const count = map.get(run.killed_by_encounter) ?? 0
      map.set(run.killed_by_encounter, count + 1)
    }
  }

  return Array.from(map.entries())
    .map(([encounter, count]) => ({ encounter, count }))
    .sort((a, b) => b.count - a.count)
}

export function getRelicPickRate(runs: RunFile[]): RelicPickStat[] {
  const map = new Map<string, { picked: number, skipped: number }>()

  for (const run of runs) {
    for (const act of run.map_point_history) {
      for (const floor of act) {
        for (const ps of floor.player_stats) {
          for (const choice of ps.relic_choices ?? []) {
            const id = choice.choice
            const entry = map.get(id) ?? { picked: 0, skipped: 0 }
            if (choice.was_picked) {
              entry.picked++
            } else {
              entry.skipped++
            }
            map.set(id, entry)
          }
        }
      }
    }
  }

  return Array.from(map.entries())
    .map(([relicId, { picked, skipped }]) => ({
      relicId,
      picked,
      skipped,
      total: picked + skipped,
      pickRate: picked + skipped > 0 ? picked / (picked + skipped) : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

export function getAscensionStats(runs: RunFile[]): AscensionStat[] {
  const map = new Map<number, { wins: number, losses: number }>()

  for (const run of runs) {
    const entry = map.get(run.ascension) ?? { wins: 0, losses: 0 }
    if (run.win) {
      entry.wins++
    } else {
      entry.losses++
    }
    map.set(run.ascension, entry)
  }

  return Array.from(map.entries())
    .map(([ascension, { wins, losses }]) => ({
      ascension,
      wins,
      losses,
      total: wins + losses,
    }))
    .sort((a, b) => a.ascension - b.ascension)
}

export function getFloorTypeDistribution(runs: RunFile[]): { type: string, count: number }[] {
  const map = new Map<string, number>()

  for (const run of runs) {
    for (const act of run.map_point_history) {
      for (const floor of act) {
        const count = map.get(floor.map_point_type) ?? 0
        map.set(floor.map_point_type, count + 1)
      }
    }
  }

  return Array.from(map.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}
