import type { FloorPlayerStats, MapPoint, RunFile } from "../types";

// ---- Flattened floor (act + floor index merged into a single global floor) ----

export interface FlatFloor {
	globalFloor: number;
	actIndex: number;
	localFloor: number;
	mapPoint: MapPoint;
	playerStats: FloorPlayerStats[];
}

// ---- Caches ----

export const floorsCache = new WeakMap<RunFile, FlatFloor[]>();
const totalFloorsCache = new WeakMap<RunFile, number>();
const playerIdCache = new WeakMap<RunFile, number[]>();

// ---- Public helpers ----

export function flattenFloors(run: RunFile): FlatFloor[] {
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

export function getTotalFloorCount(run: RunFile): number {
	const cached = totalFloorsCache.get(run);
	if (cached !== undefined) return cached;

	const total = run.map_point_history.reduce((sum, act) => sum + act.length, 0);
	totalFloorsCache.set(run, total);
	return total;
}

export function getStablePlayerIds(run: RunFile): number[] {
	const cached = playerIdCache.get(run);
	if (cached) return cached;

	const stableIds = run.players.map((player, index) => player.id ?? index);
	const floors = flattenFloors(run);

	for (let playerIndex = 0; playerIndex < stableIds.length; playerIndex++) {
		if (stableIds[playerIndex] !== playerIndex) continue;

		for (const floor of floors) {
			const stats = floor.playerStats[playerIndex];
			if (stats?.player_id != null) {
				stableIds[playerIndex] = stats.player_id;
				break;
			}
		}
	}

	playerIdCache.set(run, stableIds);
	return stableIds;
}

export function getPlayerStatsForFloor(
	run: RunFile,
	floor: FlatFloor,
	playerIndex: number,
): FloorPlayerStats | undefined {
	const stablePlayerId = getStablePlayerIds(run)[playerIndex];
	if (stablePlayerId != null) {
		const byId = floor.playerStats.find(
			(stats) => stats.player_id === stablePlayerId,
		);
		if (byId) return byId;
	}

	return floor.playerStats[playerIndex];
}

export function getFloorTimeline(run: RunFile): FlatFloor[] {
	return flattenFloors(run);
}

export function iterateRunFloors(
	run: RunFile,
	callback: (floor: MapPoint, globalFloor: number) => void,
): void {
	let globalFloor = 1;
	for (const act of run.map_point_history) {
		for (const floor of act) {
			callback(floor, globalFloor);
			globalFloor++;
		}
	}
}

export function ensurePerPlayerCache<T>(
	cache: WeakMap<RunFile, Map<number, T>>,
	run: RunFile,
): Map<number, T> {
	let playerMap = cache.get(run);
	if (!playerMap) {
		playerMap = new Map();
		cache.set(run, playerMap);
	}
	return playerMap;
}
