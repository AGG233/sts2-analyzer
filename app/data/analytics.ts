// =============================================================================
// Slay the Spire 2 — Analysis Engine
// =============================================================================

import type { CharacterId, FloorPlayerStats, MapPoint, RunFile } from "./types";

// ---- Flattened floor (act + floor index merged into a single global floor) ----

export interface FlatFloor {
	globalFloor: number; // 1-based global floor number
	actIndex: number; // 0-based act index
	localFloor: number; // 0-based floor index within the act
	mapPoint: MapPoint;
	playerStats: FloorPlayerStats[]; // all players' stats
}

// ---- Timeline data points ----

export interface HpPoint {
	floor: number;
	hp: number;
	maxHp: number;
	damageTaken: number;
	hpHealed: number;
	playerIndex: number;
}

export interface GoldPoint {
	floor: number;
	gold: number;
	gained: number;
	spent: number;
	lost: number;
	stolen: number;
	playerIndex: number;
}

export interface DeckChange {
	floor: number;
	cardAdded: string[];
	cardRemoved: string[];
	deckSize: number;
	playerIndex: number;
}

export interface EncounterRecord {
	floor: number;
	encounter: string;
	monsters: string[];
	roomType: string;
	turns: number;
	damageTaken: number;
	playerIndex: number;
}

// ---- Summary types ----

export interface RunSummary {
	character: CharacterId;
	seed: string;
	ascension: number;
	win: boolean;
	abandoned: boolean;
	totalFloors: number;
	runTime: number; // seconds
	startTime: number; // unix timestamp
	buildId: string;
	deathCause: string; // encounter ID or 'NONE.NONE'
	deathEvent: string;
	finalHp: number;
	finalMaxHp: number;
	finalGold: number;
	deckSize: number;
	relicCount: number;
	acts: string[];
	playerCount: number;
	players: {
		playerId: string | number;
		character: CharacterId;
		finalHp: number;
		finalMaxHp: number;
		deckSize: number;
		relicCount: number;
	}[];
}

export interface CharacterWinRate {
	character: CharacterId;
	wins: number;
	losses: number;
	total: number;
	winRate: number;
}

export interface CardPickStat {
	cardId: string;
	picked: number;
	skipped: number;
	total: number;
	pickRate: number;
}

export interface CardPickRateOptions {
	deduplicate?: boolean;
	floorMin?: number;
	floorMax?: number;
}

export interface DeathCauseStat {
	encounter: string;
	count: number;
}

export interface RelicPickStat {
	relicId: string;
	picked: number;
	skipped: number;
	total: number;
	pickRate: number;
}

export interface AscensionStat {
	ascension: number;
	wins: number;
	losses: number;
	total: number;
}

// ---- Simulated deck card (per-floor reconstruction) ----

export interface SimDeckCard {
	id: string;
	floorAdded: number;
	upgradeLevel: number;
}

// ---- Caches ----

const floorsCache = new WeakMap<RunFile, FlatFloor[]>();
const deckHistoryCache = new WeakMap<
	RunFile,
	Map<number, Map<number, SimDeckCard[]>>
>();

// ---- Helper: flatten map_point_history ----

function flattenFloors(run: RunFile): FlatFloor[] {
	const cached = floorsCache.get(run);
	if (cached) return cached;

	const result: FlatFloor[] = [];
	let globalFloor = 1;

	for (let actIdx = 0; actIdx < run.map_point_history.length; actIdx++) {
		const act = run.map_point_history[actIdx];
		if (!act) continue;
		for (let floorIdx = 0; floorIdx < act.length; floorIdx++) {
			const point = act[floorIdx];
			if (!point) continue;
			if (point.player_stats && point.player_stats.length > 0) {
				result.push({
					globalFloor,
					actIndex: actIdx,
					localFloor: floorIdx,
					mapPoint: point,
					playerStats: point.player_stats,
				});
			}
			globalFloor++;
		}
	}

	floorsCache.set(run, result);
	return result;
}

// ---- Single-run analysis ----

export function getHpTimeline(
	run: RunFile,
	playerIndex: number = 0,
): HpPoint[] {
	return flattenFloors(run)
		.map((f) => {
			const stats = f.playerStats[playerIndex];
			if (!stats) return null;
			return {
				floor: f.globalFloor,
				hp: stats.current_hp,
				maxHp: stats.max_hp,
				damageTaken: stats.damage_taken,
				hpHealed: stats.hp_healed,
				playerIndex,
			};
		})
		.filter((p) => p !== null) as HpPoint[];
}

export function getGoldTimeline(
	run: RunFile,
	playerIndex: number = 0,
): GoldPoint[] {
	return flattenFloors(run)
		.map((f) => {
			const stats = f.playerStats[playerIndex];
			if (!stats) return null;
			return {
				floor: f.globalFloor,
				gold: stats.current_gold,
				gained: stats.gold_gained,
				spent: stats.gold_spent,
				lost: stats.gold_lost,
				stolen: stats.gold_stolen,
				playerIndex,
			};
		})
		.filter((p) => p !== null) as GoldPoint[];
}

export function getDeckEvolution(
	run: RunFile,
	playerIndex: number = 0,
): DeckChange[] {
	let deckSize = 0;
	// Count starter deck size from player data
	const player = run.players[playerIndex];
	if (!player) return [];

	// Build initial deck (floor 1 cards)
	const initialDeck = player.deck.filter(
		(c) => (c.floor_added_to_deck ?? 1) <= 1,
	);
	deckSize = initialDeck.length;

	const floors = flattenFloors(run);
	return floors
		.map((f) => {
			const stats = f.playerStats[playerIndex];
			if (!stats) return null;
			const added = (stats.cards_gained ?? []).map((c) => c.id);
			// cards_transformed counts as removal + addition
			const transformed = stats.cards_transformed ?? [];
			const removedByTransform = transformed.map((t) => t.original_card.id);
			const addedFromTransform = transformed.map((t) => t.final_card.id);
			const removedByPlayer = (stats.cards_removed ?? []).map((c) => c.id);

			const allRemoved = [...removedByTransform, ...removedByPlayer];
			deckSize += added.length + addedFromTransform.length - allRemoved.length;

			return {
				floor: f.globalFloor,
				cardAdded: [...added, ...addedFromTransform],
				cardRemoved: allRemoved,
				deckSize,
				playerIndex,
			};
		})
		.filter((d) => d !== null) as DeckChange[];
}

export function getEncounterStats(
	run: RunFile,
	playerIndex: number = 0,
): EncounterRecord[] {
	const floors = flattenFloors(run);
	const encounters: EncounterRecord[] = [];

	for (const f of floors) {
		const room = f.mapPoint.rooms[0];
		if (room?.model_id) {
			const stats = f.playerStats[playerIndex];
			encounters.push({
				floor: f.globalFloor,
				encounter: room.model_id,
				monsters: room.monster_ids ?? [],
				roomType: room.room_type,
				turns: room.turns_taken,
				damageTaken: stats?.damage_taken ?? 0,
				playerIndex,
			});
		}
	}

	return encounters;
}

export function getRunSummary(run: RunFile): RunSummary {
	const player = run.players[0];
	const floors = flattenFloors(run);
	const lastFloor = floors.at(-1);
	const lastStats = lastFloor?.playerStats[0];

	// Collect all players' data - use real Steam ID from first floor stats if available
	const players = run.players.map((p, index) => {
		const lastPlayerStats = lastFloor?.playerStats[index];
		let steamId: string | number = index; // default to index if no stats available

		// Try to get real Steam ID from first floor stats
		if (floors.length > 0) {
			const firstFloorStats = floors[0]?.playerStats[index];
			if (firstFloorStats?.player_id && firstFloorStats.player_id !== index) {
				steamId = firstFloorStats.player_id;
			}
		}

		return {
			playerId: steamId,
			character: p.character ?? "UNKNOWN",
			finalHp: lastPlayerStats?.current_hp ?? 0,
			finalMaxHp: lastPlayerStats?.max_hp ?? 0,
			deckSize: p.deck.length ?? 0,
			relicCount: p.relics.length ?? 0,
		};
	});

	return {
		character: player?.character ?? "UNKNOWN",
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
	};
}

export function getFloorTimeline(run: RunFile): FlatFloor[] {
	return flattenFloors(run);
}

/**
 * Get the player's deck cards at a specific floor (inclusive).
 *  Uses forward simulation from derived initial deck.
 */
export function getDeckAtFloor(
	run: RunFile,
	floor: number,
	playerIndex: number = 0,
): SimDeckCard[] {
	const history = getDeckHistory(run, playerIndex);
	return history.get(floor) ?? [];
}

function ensurePlayerMap(
	run: RunFile,
): Map<number, Map<number, SimDeckCard[]>> {
	let playerMap = deckHistoryCache.get(run);
	if (!playerMap) {
		playerMap = new Map();
		deckHistoryCache.set(run, playerMap);
	}
	return playerMap;
}

function removeCardById(deck: SimDeckCard[], id: string, floor: number): void {
	const idx = deck.findIndex(
		(c) => c.id === id && c.floorAdded === (floor || 1),
	);
	if (idx !== -1) deck.splice(idx, 1);
}

function replaceCardInDeck(
	deck: SimDeckCard[],
	oldId: string,
	newId: string,
	floor: number,
): void {
	const idx = deck.findIndex(
		(c) => c.id === oldId && c.floorAdded === (floor || 1),
	);
	if (idx !== -1) {
		deck[idx] = { id: newId, floorAdded: floor || 1, upgradeLevel: 0 };
	}
}

function adjustUpgradeLevel(
	deck: SimDeckCard[],
	cardId: string,
	delta: number,
): void {
	const match = deck.find((c) => c.id === cardId);
	if (match) match.upgradeLevel = Math.max(0, match.upgradeLevel + delta);
}

function undoFloorChanges(
	deck: SimDeckCard[],
	stats: FloorPlayerStats,
	globalFloor: number,
): void {
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
			upgradeLevel: 0,
		});
	for (const uc of stats.upgraded_cards ?? []) adjustUpgradeLevel(deck, uc, -1);
	for (const dc of stats.downgraded_cards ?? [])
		adjustUpgradeLevel(deck, dc, 1);
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
	if (floors.length === 0) {
		const empty = new Map<number, SimDeckCard[]>();
		playerMap.set(playerIndex, empty);
		return empty;
	}

	// --- Phase 1: Reverse simulation from final deck to initial deck ---
	const reversedDeck: SimDeckCard[] = player.deck.map((c) => ({
		id: c.id,
		floorAdded: c.floor_added_to_deck ?? 1,
		upgradeLevel: c.current_upgrade_level ?? 0,
	}));

	for (let i = floors.length - 1; i >= 0; i--) {
		const f = floors[i];
		if (!f) continue;
		const stats = f.playerStats[playerIndex];
		if (!stats) continue;
		undoFloorChanges(reversedDeck, stats, f.globalFloor);
	}

	// --- Phase 2: Forward simulation from initial deck ---
	const result = new Map<number, SimDeckCard[]>();
	const deck: SimDeckCard[] = reversedDeck.map((c) => ({ ...c }));
	result.set(
		0,
		deck.map((c) => ({ ...c })),
	);

	for (const f of floors) {
		const stats = f.playerStats[playerIndex];
		if (!stats) {
			result.set(
				f.globalFloor,
				deck.map((c) => ({ ...c })),
			);
			continue;
		}
		applyFloorChanges(deck, stats, f.globalFloor);
		result.set(
			f.globalFloor,
			deck.map((c) => ({ ...c })),
		);
	}

	playerMap.set(playerIndex, result);
	return result;
}

/** Calculate the player's relics at a specific floor (inclusive) */
export function getRelicsAtFloor(
	run: RunFile,
	floor: number,
	playerIndex: number = 0,
): { id: string; floor_added_to_deck: number }[] {
	const player = run.players[playerIndex];
	if (!player) return [];

	const relics: { id: string; floor_added_to_deck: number }[] = [];
	for (const relic of player.relics) {
		if ((relic.floor_added_to_deck ?? 1) <= floor) {
			relics.push({
				id: relic.id,
				floor_added_to_deck: relic.floor_added_to_deck ?? 1,
			});
		}
	}
	return relics;
}

// ---- Multi-run analysis ----

export function getWinRateByCharacter(runs: RunFile[]): CharacterWinRate[] {
	const map = new Map<CharacterId, { wins: number; losses: number }>();

	for (const run of runs) {
		const char = run.players[0]?.character ?? "UNKNOWN";
		const entry = map.get(char) ?? { wins: 0, losses: 0 };
		if (run.win) {
			entry.wins++;
		} else {
			entry.losses++;
		}
		map.set(char, entry);
	}

	return Array.from(map.entries()).map(([character, { wins, losses }]) => ({
		character,
		wins,
		losses,
		total: wins + losses,
		winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
	}));
}

function tallyChoice(
	map: Map<string, { picked: number; skipped: number }>,
	id: string,
	wasPicked: boolean,
): void {
	const entry = map.get(id) ?? { picked: 0, skipped: 0 };
	if (wasPicked) {
		entry.picked++;
	} else {
		entry.skipped++;
	}
	map.set(id, entry);
}

function tallyCardChoicesForRun(
	run: RunFile,
	map: Map<string, { picked: number; skipped: number }>,
	options?: CardPickRateOptions,
): void {
	const seenCards = new Set<string>();
	let globalFloor = 1;

	for (const act of run.map_point_history) {
		for (const floor of act) {
			const choices = floor.player_stats.flatMap((ps) => ps.card_choices ?? []);
			for (const choice of choices) {
				const id = choice.card.id;

				if (options?.floorMin != null && globalFloor < options.floorMin)
					continue;
				if (options?.floorMax != null && globalFloor > options.floorMax)
					continue;

				if (options?.deduplicate && seenCards.has(id)) continue;
				if (options?.deduplicate) seenCards.add(id);

				tallyChoice(map, id, choice.was_picked);
			}
			globalFloor++;
		}
	}
}

export function getCardPickRate(
	runs: RunFile[],
	options?: CardPickRateOptions,
): CardPickStat[] {
	const map = new Map<string, { picked: number; skipped: number }>();

	for (const run of runs) {
		tallyCardChoicesForRun(run, map, options);
	}

	return Array.from(map.entries())
		.map(([cardId, { picked, skipped }]) => ({
			cardId,
			picked,
			skipped,
			total: picked + skipped,
			pickRate: picked + skipped > 0 ? picked / (picked + skipped) : 0,
		}))
		.sort((a, b) => b.total - a.total);
}

function isRelevantDeath(run: RunFile): boolean {
	return !run.win && run.killed_by_encounter !== "NONE.NONE";
}

export function getDeathCauseStats(runs: RunFile[]): DeathCauseStat[] {
	const map = new Map<string, number>();

	for (const run of runs) {
		if (isRelevantDeath(run)) {
			const count = map.get(run.killed_by_encounter) ?? 0;
			map.set(run.killed_by_encounter, count + 1);
		}
	}

	return Array.from(map.entries())
		.map(([encounter, count]) => ({ encounter, count }))
		.sort((a, b) => b.count - a.count);
}

function tallyRelicChoicesForRun(
	run: RunFile,
	map: Map<string, { picked: number; skipped: number }>,
): void {
	for (const act of run.map_point_history) {
		for (const floor of act) {
			const choices = floor.player_stats.flatMap(
				(ps) => ps.relic_choices ?? [],
			);
			for (const choice of choices) {
				tallyChoice(map, choice.choice, choice.was_picked);
			}
		}
	}
}

export function getRelicPickRate(runs: RunFile[]): RelicPickStat[] {
	const map = new Map<string, { picked: number; skipped: number }>();

	for (const run of runs) {
		tallyRelicChoicesForRun(run, map);
	}

	return Array.from(map.entries())
		.map(([relicId, { picked, skipped }]) => ({
			relicId,
			picked,
			skipped,
			total: picked + skipped,
			pickRate: picked + skipped > 0 ? picked / (picked + skipped) : 0,
		}))
		.sort((a, b) => b.total - a.total);
}

export function getAscensionStats(runs: RunFile[]): AscensionStat[] {
	const map = new Map<number, { wins: number; losses: number }>();

	for (const run of runs) {
		const entry = map.get(run.ascension) ?? { wins: 0, losses: 0 };
		if (run.win) {
			entry.wins++;
		} else {
			entry.losses++;
		}
		map.set(run.ascension, entry);
	}

	return Array.from(map.entries())
		.map(([ascension, { wins, losses }]) => ({
			ascension,
			wins,
			losses,
			total: wins + losses,
		}))
		.sort((a, b) => a.ascension - b.ascension);
}

export function getFloorTypeDistribution(
	runs: RunFile[],
): { type: string; count: number }[] {
	const map = new Map<string, number>();

	for (const run of runs) {
		for (const act of run.map_point_history) {
			for (const floor of act) {
				const count = map.get(floor.map_point_type) ?? 0;
				map.set(floor.map_point_type, count + 1);
			}
		}
	}

	return Array.from(map.entries())
		.map(([type, count]) => ({ type, count }))
		.sort((a, b) => b.count - a.count);
}

// ---- 角色专属卡牌分析 ----

// 角色专属卡牌ID后缀映射
const CHARACTER_CARD_SUFFIXES: Record<string, string> = {
	"CHARACTER.IRONCLAD": "IRONCLAD",
	"CHARACTER.SILENT": "SILENT",
	"CHARACTER.REGENT": "REGENT",
	"CHARACTER.NECROBINDER": "NECROBINDER",
	"CHARACTER.DEFECT": "DEFECT",
};

// 检查卡牌是否是其他角色的专属卡牌
function isOtherCharacterCard(
	cardId: string,
	currentCharacterId: string,
): boolean {
	const currentSuffix = CHARACTER_CARD_SUFFIXES[currentCharacterId];
	if (!currentSuffix) return false;

	// 检查卡牌是否包含其他角色的后缀
	return Object.entries(CHARACTER_CARD_SUFFIXES)
		.filter(([charId]) => charId !== currentCharacterId)
		.some(([_, suffix]) => cardId.endsWith(`_${suffix}`));
}

// 计算特定角色的卡牌选取率（排除其他角色的专属卡牌）
export function getCardPickRateByCharacter(
	runs: RunFile[],
	characterId: string,
): CardPickStat[] {
	const map = new Map<string, { picked: number; skipped: number }>();

	for (const run of runs) {
		if (run.players[0]?.character !== characterId) continue;

		for (const act of run.map_point_history) {
			for (const floor of act) {
				const choices = floor.player_stats.flatMap(
					(ps) => ps.card_choices ?? [],
				);
				for (const choice of choices) {
					if (isOtherCharacterCard(choice.card.id, characterId)) continue;
					tallyChoice(map, choice.card.id, choice.was_picked);
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
		.sort((a, b) => b.total - a.total);
}
