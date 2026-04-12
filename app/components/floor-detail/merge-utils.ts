import type { FloorPlayerStats } from '~/data/types'
import type { SimDeckCard } from '~/data/analytics'

export interface MergedCard {
  id: string
  name: string
  status: 'choice-picked' | 'choice-skipped' | 'gained' | 'transformed-from' | 'transformed-to' | 'upgraded' | 'removed'
}

export function buildMergedCards(
  stats: FloorPlayerStats,
  cardNameFn: (id: string) => string
): MergedCard[] {
  const result: MergedCard[] = []

  // Card choices
  for (const choice of stats.card_choices ?? []) {
    result.push({
      id: choice.card.id,
      name: cardNameFn(choice.card.id),
      status: choice.was_picked ? 'choice-picked' : 'choice-skipped',
    })
  }

  // Gained cards (excluding already picked)
  const pickedIds = new Set(
    (stats.card_choices ?? [])
      .filter(c => c.was_picked)
      .map(c => c.card.id)
  )
  for (const card of stats.cards_gained ?? []) {
    if (!pickedIds.has(card.id)) {
      result.push({
        id: card.id,
        name: cardNameFn(card.id),
        status: 'gained',
      })
    }
  }

  // Transformed cards
  for (const ct of stats.cards_transformed ?? []) {
    result.push({
      id: ct.original_card.id,
      name: cardNameFn(ct.original_card.id),
      status: 'transformed-from',
    })
    result.push({
      id: ct.final_card.id,
      name: cardNameFn(ct.final_card.id),
      status: 'transformed-to',
    })
  }

  // Upgraded cards
  for (const cardId of stats.upgraded_cards ?? []) {
    result.push({
      id: cardId,
      name: cardNameFn(cardId),
      status: 'upgraded',
    })
  }

  // Removed cards
  for (const card of stats.cards_removed ?? []) {
    result.push({
      id: card.id,
      name: cardNameFn(card.id),
      status: 'removed',
    })
  }

  return result
}

export interface MergedRelic {
  id: string
  name: string
  status: 'choice-picked' | 'choice-skipped' | 'gained' | 'removed'
}

export function buildMergedRelics(
  stats: FloorPlayerStats,
  relicNameFn: (id: string) => string
): MergedRelic[] {
  const result: MergedRelic[] = []

  for (const choice of stats.relic_choices ?? []) {
    result.push({
      id: choice.choice,
      name: relicNameFn(choice.choice),
      status: choice.was_picked ? 'choice-picked' : 'choice-skipped',
    })
  }

  for (const relicId of stats.bought_relics ?? []) {
    result.push({
      id: relicId,
      name: relicNameFn(relicId),
      status: 'gained',
    })
  }

  for (const relicId of stats.relics_removed ?? []) {
    result.push({
      id: relicId,
      name: relicNameFn(relicId),
      status: 'removed',
    })
  }

  return result
}

export interface MergedPotion {
  id: string
  name: string
  status: 'choice-picked' | 'choice-skipped' | 'used'
}

export function buildMergedPotions(
  stats: FloorPlayerStats,
  potionNameFn: (id: string) => string
): MergedPotion[] {
  const result: MergedPotion[] = []

  for (const choice of stats.potion_choices ?? []) {
    result.push({
      id: choice.choice,
      name: potionNameFn(choice.choice),
      status: choice.was_picked ? 'choice-picked' : 'choice-skipped',
    })
  }

  const pickedIds = new Set(
    (stats.potion_choices ?? [])
      .filter(c => c.was_picked)
      .map(c => c.choice)
  )

  for (const potion of stats.potion_used ?? []) {
    if (!pickedIds.has(potion)) {
      result.push({
        id: potion,
        name: potionNameFn(potion),
        status: 'used',
      })
    }
  }

  return result
}

export interface GroupedDeckItem {
  name: string
  upgraded: number
  count: number
  floorAdded: number
}

export function groupDeck(
  deck: SimDeckCard[],
  cardNameFn: (id: string) => string
): GroupedDeckItem[] {
  const map = new Map<string, GroupedDeckItem>()

  for (const card of deck) {
    const key = `${card.id}|${card.upgradeLevel}`
    if (!map.has(key)) {
      map.set(key, {
        name: cardNameFn(card.id),
        upgraded: card.upgradeLevel,
        count: 1,
        floorAdded: card.floorAdded,
      })
    } else {
      map.get(key)!.count++
    }
  }

  return Array.from(map.values())
}