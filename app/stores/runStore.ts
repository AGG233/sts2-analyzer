// stores/runStore.ts

import { defineStore } from "pinia";
import { getTotalFloorCount } from "~/data/analytics/floors";
import { batchParseRunFiles, scanDirectoryHandle } from "~/data/parser";
import type { RunFile } from "~/data/types";
import * as schema from "~/db/schema";
import { getDB, initDB, saveDB, scheduleSave } from "~/lib/db.client";
import {
	clearAll,
	loadDirHandle,
	loadRuns,
	saveDirHandle,
} from "~/lib/storage.client";

function notify(
	severity: "success" | "info" | "warn" | "error",
	summary: string,
	detail?: string,
	life = 3000,
) {
	if (import.meta.client) {
		const event = new CustomEvent("notification", {
			detail: { severity, summary, detail, life },
		});
		globalThis.dispatchEvent(event);
	}
}

// 防止 init 并发调用
let initPromise: Promise<void> | null = null;

export const useRunStore = defineStore("runs", () => {
	// State
	const runs = ref<RunFile[]>([]);
	const loading = ref(false);
	const dirHandle = ref<FileSystemDirectoryHandle | null>(null);
	const runsBySeed = ref<Map<string, RunFile>>(new Map());
	const dbInitialized = ref(false);

	// Computed — 只取 UI 需要的字段，避免冷缓存时全量计算
	const summaries = computed(() =>
		runs.value.map((r) => ({
			seed: r.seed,
			win: r.win,
			character: r.players[0]?.character ?? "UNKNOWN",
			ascension: r.ascension,
		})),
	);

	const wins = computed(() => summaries.value.filter((s) => s.win).length);

	const losses = computed(() => summaries.value.filter((s) => !s.win).length);

	const syncMap = () => {
		runsBySeed.value = new Map(runs.value.map((r) => [r.seed, r]));
	};

	// Actions
	const addRuns = async (newRuns: RunFile[]) => {
		const existingSeeds = new Set(runs.value.map((r) => r.seed));
		const unique = newRuns.filter((r) => !existingSeeds.has(r.seed));
		runs.value = [...runs.value, ...unique];
		for (const r of unique) {
			runsBySeed.value.set(r.seed, r);
		}
		if (import.meta.client) {
			try {
				await insertRunsToDB(unique);
				scheduleSave();
			} catch (error) {
				console.error("Failed to save runs to SQLite:", error);
			}
		}
	};

	const getRunBySeed = (seed: string) => {
		return (
			runsBySeed.value.get(seed) ?? runs.value.find((r) => r.seed === seed)
		);
	};

	const setDirHandle = async (handle: FileSystemDirectoryHandle) => {
		dirHandle.value = handle;
		if (import.meta.client) {
			await saveDirHandle(handle);
		}
	};

	const rescan = async () => {
		if (!dirHandle.value || loading.value) return 0;

		loading.value = true;
		try {
			const files = await scanDirectoryHandle(dirHandle.value);
			const parsed = await batchParseRunFiles(files);
			const newRuns = parsed.map((p) => p.data);

			// 合并已有数据，不覆盖历史存档
			const merged = new Map(runs.value.map((r) => [r.seed, r]));
			for (const r of newRuns) merged.set(r.seed, r);
			runs.value = Array.from(merged.values());
			syncMap();

			if (import.meta.client) {
				try {
					await insertRunsToDB(newRuns);
					scheduleSave();
				} catch (error) {
					console.error("Failed to save runs to SQLite:", error);
				}
			}
			return newRuns.length;
		} finally {
			loading.value = false;
		}
	};

	const clear = async () => {
		runs.value = [];
		runsBySeed.value = new Map();
		dirHandle.value = null;
		if (import.meta.client) {
			try {
				const db = await getDB();
				await db.delete(schema.runs);
				await saveDB();
			} catch (error) {
				console.error("Failed to clear runs from SQLite:", error);
			}
			clearAll();
		}
	};

	// Initialize (client only) — initPromise 锁防止并发重入
	const init = async () => {
		if (!import.meta.client) return;
		if (initPromise) return initPromise;

		initPromise = (async () => {
			try {
				await initDB();
				const db = await getDB();
				const dbRuns = (await db.select().from(schema.runs)) as {
					rawJson: string;
				}[];
				if (dbRuns.length > 0) {
					runs.value = dbRuns.map((r) => JSON.parse(r.rawJson) as RunFile);
					syncMap();
				} else {
					const savedRuns = await loadRuns();
					if (savedRuns.length > 0) {
						runs.value = savedRuns;
						syncMap();
						await addRuns(savedRuns);
					}
				}

				const savedDirHandle = await loadDirHandle();
				if (savedDirHandle) {
					dirHandle.value = savedDirHandle;
				}
				dbInitialized.value = true;
			} catch (error) {
				initPromise = null; // 失败后允许重试
				console.error("Failed to initialize store:", error);
			}
		})();

		return initPromise;
	};

	return {
		// State
		runs,
		loading,
		dirHandle,

		// Computed
		summaries,
		wins,
		losses,

		// Actions
		addRuns,
		getRunBySeed,
		setDirHandle,
		rescan,
		clear,
		init,
	};
});

type DB = Awaited<ReturnType<typeof getDB>>;

// Build all prepared queries for a single run (upsert: INSERT ON CONFLICT DO UPDATE)
function buildRunQueries(db: DB, run: RunFile) {
	const queries = [];

	const runData = {
		seed: run.seed,
		gameVersion: deriveGameVersion(run),
		playerCount: run.players.length,
		characterId: run.players[0]?.character ?? "UNKNOWN",
		ascension: run.ascension,
		win: run.win ? 1 : 0,
		wasAbandoned: run.was_abandoned ? 1 : 0,
		buildId: run.build_id,
		gameMode: run.game_mode,
		platformType: run.platform_type ?? "",
		killedByEncounter: run.killed_by_encounter,
		killedByEvent: run.killed_by_event,
		startTime: run.start_time,
		runTime: run.run_time,
		totalFloors: getTotalFloorCount(run),
		gameSchemaVersion: run.schema_version,
		rawJson: JSON.stringify(run),
	};

	// Upsert run
	queries.push(
		db.insert(schema.runs).values(runData).onConflictDoUpdate({
			target: schema.runs.seed,
			set: runData,
		}),
	);

	// Upsert players
	for (let i = 0; i < run.players.length; i++) {
		const player = run.players[i];
		if (!player) continue;
		queries.push(
			db
				.insert(schema.runPlayers)
				.values({
					runSeed: run.seed,
					playerIndex: i,
					playerId: player.id,
					characterId: player.character,
					deckJson: JSON.stringify(player.deck),
					relicsJson: JSON.stringify(player.relics),
					potionsJson: JSON.stringify(player.potions),
					maxPotionSlotCount: player.max_potion_slot_count,
				})
				.onConflictDoUpdate({
					target: [schema.runPlayers.runSeed, schema.runPlayers.playerIndex],
					set: {
						playerId: player.id,
						characterId: player.character,
						deckJson: JSON.stringify(player.deck),
						relicsJson: JSON.stringify(player.relics),
						potionsJson: JSON.stringify(player.potions),
						maxPotionSlotCount: player.max_potion_slot_count,
					},
				}),
		);
	}

	// Upsert floors
	let globalFloor = 1;
	for (let actIdx = 0; actIdx < run.map_point_history.length; actIdx++) {
		const act = run.map_point_history[actIdx];
		if (!act) continue;
		for (let floorIdx = 0; floorIdx < act.length; floorIdx++) {
			const point = act[floorIdx];
			if (!point) continue;
			queries.push(
				db
					.insert(schema.runFloors)
					.values({
						runSeed: run.seed,
						globalFloor,
						actIndex: actIdx,
						localFloor: floorIdx,
						mapPointType: point.map_point_type,
						playerStatsJson: JSON.stringify(point.player_stats),
						roomsJson: JSON.stringify(point.rooms),
					})
					.onConflictDoUpdate({
						target: [schema.runFloors.runSeed, schema.runFloors.globalFloor],
						set: {
							mapPointType: point.map_point_type,
							playerStatsJson: JSON.stringify(point.player_stats),
							roomsJson: JSON.stringify(point.rooms),
						},
					}),
			);
			globalFloor++;
		}
	}

	return queries;
}

// Insert runs using db.transaction — 一个 run 作为一个事务，确保持久化原子性
async function insertRunsToDB(runs: RunFile[]): Promise<void> {
	const db = await getDB();
	for (const run of runs) {
		try {
			await db.transaction(async (tx) => {
				const queries = buildRunQueries(tx as unknown as DB, run);
				for (const query of queries) {
					await query;
				}
			});
			// 每个 run 处理完后让出主线程，保持 UI 响应
			await new Promise<void>((r) => setTimeout(r, 0));
		} catch (e) {
			console.error(`Failed to insert run ${run.seed}:`, e);
		}
	}
}

function deriveGameVersion(run: RunFile): string {
	if (!run.build_id) return "unknown";
	// 支持 X.XX 或 X.XX.XX 格式
	const match = run.build_id.match(/\d+\.\d+(?:\.\d+)?/);
	return match ? match[0] : run.build_id;
}
