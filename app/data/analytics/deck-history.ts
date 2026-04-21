import type { FloorPlayerStats, RunFile } from "../types";
import {
	ensurePerPlayerCache,
	flattenFloors,
	getPlayerStatsForFloor,
} from "./floors";

// ---- Simulated deck card (per-floor reconstruction) ----

export interface SimDeckCard {
	id: string;
	floorAdded: number;
	upgradeLevel: number;
}

// ---- Deck change record ----

export interface DeckChange {
	floor: number;
	cardAdded: string[];
	cardRemoved: string[];
	deckSize: number;
	playerIndex: number;
}

// ---- Caches ----

const deckHistoryCache = new WeakMap<
	RunFile,
	Map<number, Map<number, SimDeckCard[]>>
>();
const deckEvolutionCache = new WeakMap<RunFile, Map<number, DeckChange[]>>();
const upgradeDeltaCache = new WeakMap<
	RunFile,
	Map<number, Map<string, number[]>>
>();

// ---- Internal helpers ----

function ensurePlayerMap(
	run: RunFile,
): Map<number, Map<number, SimDeckCard[]>> {
	return ensurePerPlayerCache(deckHistoryCache, run);
}

function cloneDeck(deck: SimDeckCard[]): SimDeckCard[] {
	return deck.map((card) => ({ ...card }));
}

function getDeckIdentityKey(card: SimDeckCard): string {
	return `${card.id}|${card.floorAdded}`;
}

function diffDeckIds(
	previous: SimDeckCard[],
	current: SimDeckCard[],
): {
	added: string[];
	removed: string[];
} {
	const previousCounts = new Map<string, number>();
	const currentCounts = new Map<string, number>();

	for (const card of previous) {
		const key = getDeckIdentityKey(card);
		previousCounts.set(key, (previousCounts.get(key) ?? 0) + 1);
	}
	for (const card of current) {
		const key = getDeckIdentityKey(card);
		currentCounts.set(key, (currentCounts.get(key) ?? 0) + 1);
	}

	const added: string[] = [];
	const removed: string[] = [];
	const keys = new Set([...previousCounts.keys(), ...currentCounts.keys()]);

	for (const key of keys) {
		const prevCount = previousCounts.get(key) ?? 0;
		const currCount = currentCounts.get(key) ?? 0;
		const [id] = key.split("|");

		if (currCount > prevCount) {
			for (let i = 0; i < currCount - prevCount; i++) added.push(id ?? key);
		} else if (prevCount > currCount) {
			for (let i = 0; i < prevCount - currCount; i++) removed.push(id ?? key);
		}
	}

	return { added, removed };
}

function getUpgradeDeltaPrefix(
	run: RunFile,
	playerIndex: number,
): Map<string, number[]> {
	const playerMap = ensurePerPlayerCache(upgradeDeltaCache, run);
	const cached = playerMap.get(playerIndex);
	if (cached) return cached;

	const floors = flattenFloors(run);
	const prefix = new Map<string, number[]>();
	const maxFloor = Math.max(0, ...floors.map((floor) => floor.globalFloor));

	for (const f of floors) {
		const stats = getPlayerStatsForFloor(run, f, playerIndex);
		if (!stats) continue;

		for (const id of stats.upgraded_cards ?? []) {
			const values = prefix.get(id) ?? [];
			values[f.globalFloor] = (values[f.globalFloor] ?? 0) + 1;
			prefix.set(id, values);
		}
		for (const id of stats.downgraded_cards ?? []) {
			const values = prefix.get(id) ?? [];
			values[f.globalFloor] = (values[f.globalFloor] ?? 0) - 1;
			prefix.set(id, values);
		}
	}

	for (const [id, values] of prefix.entries()) {
		for (let floor = 1; floor <= maxFloor; floor++) {
			values[floor] = (values[floor] ?? 0) + (values[floor - 1] ?? 0);
		}
		prefix.set(id, values);
	}

	playerMap.set(playerIndex, prefix);
	return prefix;
}

function findBestMatchIndex(
	deck: SimDeckCard[],
	id: string,
	preferHighestUpgrade: boolean,
): number {
	let bestIndex = -1;
	for (let i = 0; i < deck.length; i++) {
		const card = deck[i];
		if (card?.id !== id) continue;
		if (bestIndex === -1) {
			bestIndex = i;
			continue;
		}
		const best = deck[bestIndex];
		if (!best) continue;
		if (preferHighestUpgrade) {
			if (card.upgradeLevel > best.upgradeLevel) bestIndex = i;
		} else if (card.upgradeLevel < best.upgradeLevel) {
			bestIndex = i;
		}
	}
	return bestIndex;
}

function findCardIndex(
	deck: SimDeckCard[],
	id: string,
	floorAdded?: number,
	preferHighestUpgrade = false,
): number {
	if (floorAdded != null) {
		const exactIndex = deck.findIndex(
			(card) => card.id === id && card.floorAdded === floorAdded,
		);
		if (exactIndex !== -1) return exactIndex;
	}
	return findBestMatchIndex(deck, id, preferHighestUpgrade);
}

function removeCardById(deck: SimDeckCard[], id: string, floor?: number): void {
	const idx = findCardIndex(deck, id, floor);
	if (idx !== -1) deck.splice(idx, 1);
}

function replaceCardInDeck(
	deck: SimDeckCard[],
	oldId: string,
	newId: string,
	floor: number,
): void {
	const idx = findCardIndex(deck, oldId, floor);
	if (idx !== -1) {
		const current = deck[idx];
		if (!current) return;
		deck[idx] = {
			id: newId,
			floorAdded: floor ?? current.floorAdded,
			upgradeLevel: current.upgradeLevel,
		};
	}
}

function adjustUpgradeLevel(
	deck: SimDeckCard[],
	cardId: string,
	delta: number,
): void {
	let best: SimDeckCard | undefined;
	for (const c of deck) {
		if (c.id !== cardId) continue;
		if (
			!best ||
			(delta > 0
				? c.upgradeLevel < best.upgradeLevel
				: c.upgradeLevel > best.upgradeLevel)
		) {
			best = c;
		}
	}
	if (best) best.upgradeLevel = Math.max(0, best.upgradeLevel + delta);
}

function countNetUpgrades(
	cardId: string,
	fromFloor: number,
	toFloor: number,
	upgradePrefix: Map<string, number[]>,
): number {
	const values = upgradePrefix.get(cardId);
	if (!values) return 0;
	return Math.max(0, (values[toFloor] ?? 0) - (values[fromFloor - 1] ?? 0));
}

function undoFloorChanges(
	deck: SimDeckCard[],
	stats: FloorPlayerStats,
	globalFloor: number,
	upgradePrefix: Map<string, number[]>,
): void {
	for (const dc of stats.downgraded_cards ?? [])
		adjustUpgradeLevel(deck, dc, 1);
	for (const uc of stats.upgraded_cards ?? []) adjustUpgradeLevel(deck, uc, -1);
	for (const cg of stats.cards_gained ?? [])
		removeCardById(deck, cg.id, cg.floor_added_to_deck ?? globalFloor);
	for (const ct of stats.cards_transformed ?? [])
		replaceCardInDeck(
			deck,
			ct.final_card.id,
			ct.original_card.id,
			ct.final_card.floor_added_to_deck ?? globalFloor,
		);
	for (const cr of stats.cards_removed ?? [])
		deck.push({
			id: cr.id,
			floorAdded: cr.floor_added_to_deck ?? globalFloor,
			upgradeLevel: countNetUpgrades(
				cr.id,
				cr.floor_added_to_deck ?? 1,
				globalFloor,
				upgradePrefix,
			),
		});
}

function applyFloorChanges(
	deck: SimDeckCard[],
	stats: FloorPlayerStats,
	globalFloor: number,
): void {
	for (const cr of stats.cards_removed ?? [])
		removeCardById(deck, cr.id, cr.floor_added_to_deck ?? globalFloor);
	for (const ct of stats.cards_transformed ?? [])
		replaceCardInDeck(
			deck,
			ct.original_card.id,
			ct.final_card.id,
			ct.original_card.floor_added_to_deck ?? globalFloor,
		);
	for (const cg of stats.cards_gained ?? [])
		deck.push({
			id: cg.id,
			floorAdded: cg.floor_added_to_deck ?? globalFloor,
			upgradeLevel: cg.current_upgrade_level ?? 0,
		});
	for (const uc of stats.upgraded_cards ?? []) adjustUpgradeLevel(deck, uc, 1);
	for (const dc of stats.downgraded_cards ?? [])
		adjustUpgradeLevel(deck, dc, -1);
}

// ---- Public API ----

export function getDeckAtFloor(
	run: RunFile,
	floor: number,
	playerIndex: number = 0,
): SimDeckCard[] {
	const history = getDeckHistory(run, playerIndex);
	return history.get(floor) ?? [];
}

export function getDeckHistory(
	run: RunFile,
	playerIndex: number = 0,
): Map<number, SimDeckCard[]> {
	const playerMap = ensurePlayerMap(run);
	const cached = playerMap.get(playerIndex);
	if (cached !== undefined) return cached;

	const player = run.players[playerIndex];
	if (!player) {
		const empty = new Map<number, SimDeckCard[]>();
		playerMap.set(playerIndex, empty);
		return empty;
	}

	const floors = flattenFloors(run);

	const reversedDeck: SimDeckCard[] = player.deck.map((c) => ({
		id: c.id,
		floorAdded: c.floor_added_to_deck ?? 1,
		upgradeLevel: c.current_upgrade_level ?? 0,
	}));
	const upgradePrefix = getUpgradeDeltaPrefix(run, playerIndex);

	for (let i = floors.length - 1; i >= 0; i--) {
		const f = floors[i];
		if (!f) continue;
		const stats = getPlayerStatsForFloor(run, f, playerIndex);
		if (!stats) continue;
		undoFloorChanges(reversedDeck, stats, f.globalFloor, upgradePrefix);
	}

	const result = new Map<number, SimDeckCard[]>();
	const deck: SimDeckCard[] = cloneDeck(reversedDeck);
	result.set(0, cloneDeck(deck));

	for (const f of floors) {
		const stats = getPlayerStatsForFloor(run, f, playerIndex);
		if (!stats) {
			result.set(f.globalFloor, cloneDeck(deck));
			continue;
		}
		applyFloorChanges(deck, stats, f.globalFloor);
		result.set(f.globalFloor, cloneDeck(deck));
	}

	playerMap.set(playerIndex, result);
	return result;
}

export function getDeckEvolution(
	run: RunFile,
	playerIndex: number = 0,
): DeckChange[] {
	const playerMap = ensurePerPlayerCache(deckEvolutionCache, run);
	const cached = playerMap.get(playerIndex);
	if (cached) return cached;

	const history = getDeckHistory(run, playerIndex);
	const evolution = flattenFloors(run).map((f) => {
		const previous = history.get(f.globalFloor - 1) ?? [];
		const current = history.get(f.globalFloor) ?? previous;
		const { added, removed } = diffDeckIds(previous, current);

		return {
			floor: f.globalFloor,
			cardAdded: added,
			cardRemoved: removed,
			deckSize: current.length,
			playerIndex,
		};
	});

	playerMap.set(playerIndex, evolution);
	return evolution;
}
