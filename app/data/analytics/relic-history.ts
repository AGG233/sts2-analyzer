import type { FloorPlayerStats, Relic, RunFile } from "../types";
import {
	ensurePerPlayerCache,
	flattenFloors,
	getPlayerStatsForFloor,
} from "./floors";

// ---- Simulated relic ----

export interface SimRelic {
	id: string;
	floorAdded: number;
}

// ---- Cache ----

const relicHistoryCache = new WeakMap<
	RunFile,
	Map<number, Map<number, SimRelic[]>>
>();

// ---- Internal helpers ----

function cloneRelics(relics: SimRelic[]): SimRelic[] {
	return relics.map((relic) => ({ ...relic }));
}

function getRelicGainIds(stats: FloorPlayerStats): string[] {
	return [
		...(stats.relic_choices ?? [])
			.filter((choice) => choice.was_picked)
			.map((choice) => choice.choice),
		...(stats.bought_relics ?? []),
	];
}

function buildRelicFloorLookup(
	run: RunFile,
	player: { relics: Relic[] },
	floors: ReturnType<typeof flattenFloors>,
	playerIndex: number,
): Map<string, number> {
	const lookup = new Map<string, number>();

	for (const relic of player.relics) {
		lookup.set(relic.id, relic.floor_added_to_deck ?? 1);
	}

	for (const f of floors) {
		const stats = getPlayerStatsForFloor(run, f, playerIndex);
		if (!stats) continue;
		for (const relicId of getRelicGainIds(stats)) {
			if (!lookup.has(relicId)) lookup.set(relicId, f.globalFloor);
		}
	}

	return lookup;
}

function findRelicIndex(
	relics: SimRelic[],
	id: string,
	floorAdded?: number,
): number {
	if (floorAdded != null) {
		const exactIndex = relics.findIndex(
			(relic) => relic.id === id && relic.floorAdded === floorAdded,
		);
		if (exactIndex !== -1) return exactIndex;
	}

	return relics.findIndex((relic) => relic.id === id);
}

// ---- Public API ----

function reverseReconstructRelics(
	reversedRelics: SimRelic[],
	floors: ReturnType<typeof flattenFloors>,
	run: RunFile,
	playerIndex: number,
	floorLookup: Map<string, number>,
): void {
	for (let i = floors.length - 1; i >= 0; i--) {
		const f = floors[i];
		if (!f) continue;
		const stats = getPlayerStatsForFloor(run, f, playerIndex);
		if (!stats) continue;

		for (const relicId of stats.relics_removed ?? []) {
			reversedRelics.push({
				id: relicId,
				floorAdded: floorLookup.get(relicId) ?? 1,
			});
		}

		for (const relicId of getRelicGainIds(stats)) {
			const idx = findRelicIndex(reversedRelics, relicId, f.globalFloor);
			if (idx !== -1) reversedRelics.splice(idx, 1);
		}
	}
}

function forwardReconstructRelics(
	relics: SimRelic[],
	floors: ReturnType<typeof flattenFloors>,
	run: RunFile,
	playerIndex: number,
	floorLookup: Map<string, number>,
	result: Map<number, SimRelic[]>,
): void {
	for (const f of floors) {
		const stats = getPlayerStatsForFloor(run, f, playerIndex);
		if (!stats) {
			result.set(f.globalFloor, cloneRelics(relics));
			continue;
		}

		for (const relicId of getRelicGainIds(stats)) {
			relics.push({
				id: relicId,
				floorAdded: floorLookup.get(relicId) ?? f.globalFloor,
			});
		}
		for (const relicId of stats.relics_removed ?? []) {
			const idx = findRelicIndex(relics, relicId);
			if (idx !== -1) relics.splice(idx, 1);
		}

		result.set(f.globalFloor, cloneRelics(relics));
	}
}

function getRelicHistory(
	run: RunFile,
	playerIndex = 0,
): Map<number, SimRelic[]> {
	const playerMap = ensurePerPlayerCache(relicHistoryCache, run);
	const cached = playerMap.get(playerIndex);
	if (cached) return cached;

	const player = run.players[playerIndex];
	if (!player) {
		const empty = new Map<number, SimRelic[]>();
		playerMap.set(playerIndex, empty);
		return empty;
	}

	const floors = flattenFloors(run);
	const floorLookup = buildRelicFloorLookup(run, player, floors, playerIndex);
	const reversedRelics: SimRelic[] = player.relics.map((relic) => ({
		id: relic.id,
		floorAdded: relic.floor_added_to_deck ?? floorLookup.get(relic.id) ?? 1,
	}));

	reverseReconstructRelics(
		reversedRelics,
		floors,
		run,
		playerIndex,
		floorLookup,
	);

	const result = new Map<number, SimRelic[]>();
	const relics = cloneRelics(reversedRelics);
	result.set(0, cloneRelics(relics));

	forwardReconstructRelics(
		relics,
		floors,
		run,
		playerIndex,
		floorLookup,
		result,
	);

	playerMap.set(playerIndex, result);
	return result;
}

export function getRelicsAtFloor(
	run: RunFile,
	floor: number,
	playerIndex: number = 0,
): { id: string; floor_added_to_deck: number }[] {
	return (getRelicHistory(run, playerIndex).get(floor) ?? []).map((relic) => ({
		id: relic.id,
		floor_added_to_deck: relic.floorAdded,
	}));
}
