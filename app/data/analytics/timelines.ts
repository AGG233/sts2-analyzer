import type { RunFile } from "../types";
import {
	ensurePerPlayerCache,
	flattenFloors,
	getPlayerStatsForFloor,
} from "./floors";

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

export interface EncounterRecord {
	floor: number;
	encounter: string;
	monsters: string[];
	roomType: string;
	turns: number;
	damageTaken: number;
	playerIndex: number;
}

// ---- Caches ----

const hpTimelineCache = new WeakMap<RunFile, Map<number, HpPoint[]>>();
const goldTimelineCache = new WeakMap<RunFile, Map<number, GoldPoint[]>>();

// ---- Public API ----

export function getHpTimeline(
	run: RunFile,
	playerIndex: number = 0,
): HpPoint[] {
	const playerMap = ensurePerPlayerCache(hpTimelineCache, run);
	const cached = playerMap.get(playerIndex);
	if (cached) return cached;

	const timeline = flattenFloors(run)
		.map((f) => {
			const stats = getPlayerStatsForFloor(run, f, playerIndex);
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

	playerMap.set(playerIndex, timeline);
	return timeline;
}

export function getGoldTimeline(
	run: RunFile,
	playerIndex: number = 0,
): GoldPoint[] {
	const playerMap = ensurePerPlayerCache(goldTimelineCache, run);
	const cached = playerMap.get(playerIndex);
	if (cached) return cached;

	const timeline = flattenFloors(run)
		.map((f) => {
			const stats = getPlayerStatsForFloor(run, f, playerIndex);
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

	playerMap.set(playerIndex, timeline);
	return timeline;
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
			const stats = getPlayerStatsForFloor(run, f, playerIndex);
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
