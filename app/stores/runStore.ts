// stores/runStore.ts

import { eq } from "drizzle-orm";
import { defineStore } from "pinia";
import { getRunSummary } from "~/data/analytics";
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

export const useRunStore = defineStore("runs", () => {
	// State
	const runs = ref<RunFile[]>([]);
	const loading = ref(false);
	const dirHandle = ref<FileSystemDirectoryHandle | null>(null);
	const runsBySeed = ref<Map<string, RunFile>>(new Map());
	const dbInitialized = ref(false);

	// Computed
	const summaries = computed(() => runs.value.map(getRunSummary));

	const wins = computed(() => summaries.value.filter((s) => s.win).length);

	const losses = computed(() => summaries.value.filter((s) => !s.win).length);

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
				const db = await getDB();
				for (const run of unique) {
					await insertRunToDB(db, run);
				}
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
		if (!dirHandle.value) return 0;

		loading.value = true;
		try {
			const files = await scanDirectoryHandle(dirHandle.value);
			const parsed = await batchParseRunFiles(files);
			runs.value = parsed.map((p) => p.data);
			runsBySeed.value = new Map(runs.value.map((r) => [r.seed, r]));
			if (import.meta.client) {
				try {
					const db = await getDB();
					for (const run of runs.value) {
						await insertRunToDB(db, run);
					}
					scheduleSave();
				} catch (error) {
					console.error("Failed to save runs to SQLite:", error);
				}
			}
			return runs.value.length;
		} catch (error) {
			console.error("Rescan failed:", error);
			return 0;
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

	// Initialize (client only)
	const init = async () => {
		if (!import.meta.client) return;

		try {
			// Initialize database (now loads from IndexedDB if available)
			await initDB();
			dbInitialized.value = true;

			// Load runs from SQLite
			const db = await getDB();
			const dbRuns = (await db.select().from(schema.runs)) as {
				rawJson: string;
			}[];
			if (dbRuns.length > 0) {
				runs.value = dbRuns.map((r) => JSON.parse(r.rawJson) as RunFile);
				runsBySeed.value = new Map(runs.value.map((r) => [r.seed, r]));
			} else {
				// Fallback: migrate from legacy IndexedDB JSON format
				const savedRuns = await loadRuns();
				if (savedRuns.length > 0) {
					runs.value = savedRuns;
					runsBySeed.value = new Map(runs.value.map((r) => [r.seed, r]));
					await addRuns(savedRuns);
				}
			}

			// Load directory handle
			const savedDirHandle = await loadDirHandle();
			if (savedDirHandle) {
				dirHandle.value = savedDirHandle;
			}
		} catch (error) {
			console.error("Failed to initialize store:", error);
		}
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

// Shared helper to insert/upsert a run into SQLite
async function insertRunToDB(
	db: Awaited<ReturnType<typeof getDB>>,
	run: RunFile,
): Promise<void> {
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

	const existing = await db.query.runs.findFirst({
		where: eq(schema.runs.seed, run.seed),
	});

	if (existing) {
		await db
			.update(schema.runs)
			.set(runData)
			.where(eq(schema.runs.seed, run.seed));
	} else {
		await db.insert(schema.runs).values(runData);
	}

	// Insert players
	for (let i = 0; i < run.players.length; i++) {
		const player = run.players[i];
		if (!player) continue;
		await db
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
			});
	}

	// Insert floors
	let globalFloor = 1;
	for (const act of run.map_point_history) {
		for (let floorIdx = 0; floorIdx < act.length; floorIdx++) {
			const point = act[floorIdx];
			if (!point) continue;
			await db
				.insert(schema.runFloors)
				.values({
					runSeed: run.seed,
					globalFloor,
					actIndex: run.map_point_history.indexOf(act),
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
				});
			globalFloor++;
		}
	}
}

function deriveGameVersion(run: RunFile): string {
	if (run.build_id.includes("0.15")) return "0.15";
	if (run.build_id.includes("0.16")) return "0.16";
	return run.build_id || "unknown";
}
