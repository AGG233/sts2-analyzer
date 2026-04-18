import type { CharacterId, RunFile } from "../types";
import {
	flattenFloors,
	getPlayerStatsForFloor,
	getStablePlayerIds,
	getTotalFloorCount,
	iterateRunFloors,
} from "./floors";

// ---- Summary types ----

export interface RunSummary {
	character: CharacterId;
	seed: string;
	ascension: number;
	win: boolean;
	abandoned: boolean;
	totalFloors: number;
	runTime: number;
	startTime: number;
	buildId: string;
	deathCause: string;
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

// ---- Caches ----

const cardChoiceCache = new WeakMap<
	RunFile,
	{ id: string; wasPicked: boolean; floor: number }[]
>();
const relicChoiceCache = new WeakMap<
	RunFile,
	{ id: string; wasPicked: boolean }[]
>();
const floorTypeDistributionCache = new WeakMap<RunFile, Map<string, number>>();

// ---- Internal helpers ----

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

function isFloorInRange(floor: number, options?: CardPickRateOptions): boolean {
	if (options?.floorMin != null && floor < options.floorMin) return false;
	if (options?.floorMax != null && floor > options.floorMax) return false;
	return true;
}

function getAllCardChoices(
	run: RunFile,
): { id: string; wasPicked: boolean; floor: number }[] {
	const cached = cardChoiceCache.get(run);
	if (cached) return cached;

	const result: { id: string; wasPicked: boolean; floor: number }[] = [];
	iterateRunFloors(run, (floor, globalFloor) => {
		for (const ps of floor.player_stats) {
			for (const choice of ps.card_choices ?? []) {
				result.push({
					id: choice.card.id,
					wasPicked: choice.was_picked,
					floor: globalFloor,
				});
			}
		}
	});

	cardChoiceCache.set(run, result);
	return result;
}

function collectCardChoices(
	run: RunFile,
	options?: CardPickRateOptions,
): { id: string; wasPicked: boolean; floor: number }[] {
	return getAllCardChoices(run).filter((choice) =>
		isFloorInRange(choice.floor, options),
	);
}

function tallyCardChoicesForRun(
	run: RunFile,
	map: Map<string, { picked: number; skipped: number }>,
	options?: CardPickRateOptions,
): void {
	if (!options?.deduplicate) {
		for (const c of collectCardChoices(run, options))
			tallyChoice(map, c.id, c.wasPicked);
		return;
	}
	const seen = new Set<string>();
	for (const c of collectCardChoices(run, options)) {
		if (seen.has(c.id)) continue;
		seen.add(c.id);
		tallyChoice(map, c.id, c.wasPicked);
	}
}

function isRelevantDeath(run: RunFile): boolean {
	return !run.win && run.killed_by_encounter !== "NONE.NONE";
}

function collectRelicChoicesFromPlayerStats(
	playerStats: { relic_choices?: { choice: string; was_picked: boolean }[] }[],
): { id: string; wasPicked: boolean }[] {
	return playerStats.flatMap((ps) =>
		(ps.relic_choices ?? []).map((c) => ({
			id: c.choice,
			wasPicked: c.was_picked,
		})),
	);
}

function collectRelicChoices(
	run: RunFile,
): { id: string; wasPicked: boolean }[] {
	const cached = relicChoiceCache.get(run);
	if (cached) return cached;

	const result: { id: string; wasPicked: boolean }[] = [];
	iterateRunFloors(run, (floor) => {
		result.push(...collectRelicChoicesFromPlayerStats(floor.player_stats));
	});

	relicChoiceCache.set(run, result);
	return result;
}

function tallyRelicChoicesForRun(
	run: RunFile,
	map: Map<string, { picked: number; skipped: number }>,
): void {
	for (const c of collectRelicChoices(run)) tallyChoice(map, c.id, c.wasPicked);
}

// ---- 角色专属卡牌分析 ----

const CHARACTER_CARD_SUFFIXES: Record<string, string> = {
	"CHARACTER.IRONCLAD": "IRONCLAD",
	"CHARACTER.SILENT": "SILENT",
	"CHARACTER.REGENT": "REGENT",
	"CHARACTER.NECROBINDER": "NECROBINDER",
	"CHARACTER.DEFECT": "DEFECT",
};

function isOtherCharacterCard(
	cardId: string,
	currentCharacterId: string,
): boolean {
	const currentSuffix = CHARACTER_CARD_SUFFIXES[currentCharacterId];
	if (!currentSuffix) return false;

	return Object.entries(CHARACTER_CARD_SUFFIXES)
		.filter(([charId]) => charId !== currentCharacterId)
		.some(([, suffix]) => cardId.endsWith(`_${suffix}`));
}

// ---- Public API ----

export function getRunSummary(run: RunFile): RunSummary {
	const player = run.players[0];
	const floors = flattenFloors(run);
	const lastFloor = floors.at(-1);
	const lastStats = lastFloor
		? getPlayerStatsForFloor(run, lastFloor, 0)
		: undefined;
	const stablePlayerIds = getStablePlayerIds(run);

	const players = run.players.map((p, index) => {
		const lastPlayerStats = lastFloor
			? getPlayerStatsForFloor(run, lastFloor, index)
			: undefined;

		return {
			playerId: stablePlayerIds[index] ?? index,
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
		totalFloors: getTotalFloorCount(run),
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

export function getCardPickRateByCharacter(
	runs: RunFile[],
	characterId: string,
): CardPickStat[] {
	const map = new Map<string, { picked: number; skipped: number }>();

	for (const run of runs) {
		if (run.players[0]?.character !== characterId) continue;
		for (const c of collectCardChoices(run)) {
			if (isOtherCharacterCard(c.id, characterId)) continue;
			tallyChoice(map, c.id, c.wasPicked);
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
		let distribution = floorTypeDistributionCache.get(run);
		if (!distribution) {
			distribution = new Map<string, number>();
			iterateRunFloors(run, (floor) => {
				distribution?.set(
					floor.map_point_type,
					(distribution.get(floor.map_point_type) ?? 0) + 1,
				);
			});
			floorTypeDistributionCache.set(run, distribution);
		}

		for (const [type, count] of distribution.entries()) {
			map.set(type, (map.get(type) ?? 0) + count);
		}
	}

	return Array.from(map.entries())
		.map(([type, count]) => ({ type, count }))
		.sort((a, b) => b.count - a.count);
}
