// stores/runStore.ts
import { defineStore } from "pinia";
import { getRunSummary } from "~/data/analytics";
import { batchParseRunFiles, scanDirectoryHandle } from "~/data/parser";
import type { RunFile } from "~/data/types";
import {
	clearAll,
	loadDirHandle,
	saveDirHandle,
} from "~/lib/storage.client";
import { initDB, getDB, saveDB } from "~/lib/db.client";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";

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

	// Action: Notification emitter (local reference for use within store)
	const _notifyEmitter:
		| ((
				severity: "success" | "info" | "warn" | "error",
				summary: string,
				detail?: string,
				life?: number,
		  ) => void)
		| null = null;

	// Actions
	const addRuns = async (newRuns: RunFile[]) => {
		runs.value = [...runs.value, ...newRuns];
		for (const r of newRuns) {
			runsBySeed.value.set(r.seed, r);
		}
		if (import.meta.client) {
			// Save to SQLite
			try {
				const db = await getDB();
				for (const run of newRuns) {
					// Insert or replace run data
					const existing = await db.query.runs.findFirst({
						where: eq(schema.runs.seed, run.seed),
					});

					const runData = {
						seed: run.seed,
						gameVersion: "0.15", // Default version
						characterId: run.players[0]?.character ?? "UNKNOWN",
						ascension: run.ascension,
						win: run.win ? 1 : 0,
						wasAbandoned: run.was_abandoned ? 1 : 0,
						buildId: run.build_id,
						killedByEncounter: run.killed_by_encounter,
						killedByEvent: run.killed_by_event,
						startTime: run.start_time,
						runTime: run.run_time,
						totalFloors: run.floors.length,
						rawJson: JSON.stringify(run),
					};

					if (existing) {
						await db.update(schema.runs)
							.set(runData)
							.where(eq(schema.runs.seed, run.seed));
					} else {
						await db.insert(schema.runs)
							.values(runData);
					}
				}

				// Save the database
				await saveDB();
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
		if (!dirHandle.value) return;

		loading.value = true;
		try {
			const files = await scanDirectoryHandle(dirHandle.value);
			const parsed = await batchParseRunFiles(files);
			runs.value = parsed.map((p) => p.data);
			runsBySeed.value = new Map(runs.value.map((r) => [r.seed, r]));
			if (import.meta.client) {
				// Save to SQLite
				try {
					const db = await getDB();
					for (const run of runs.value) {
						const runData = {
							seed: run.seed,
							gameVersion: "0.15",
							characterId: run.players[0]?.character ?? "UNKNOWN",
							ascension: run.ascension,
							win: run.win ? 1 : 0,
							wasAbandoned: run.was_abandoned ? 1 : 0,
							buildId: run.build_id,
							killedByEncounter: run.killed_by_encounter,
							killedByEvent: run.killed_by_event,
							startTime: run.start_time,
							runTime: run.run_time,
							totalFloors: run.floors.length,
							rawJson: JSON.stringify(run),
						};

						const existing = await db.query.runs.findFirst({
							where: eq(schema.runs.seed, run.seed),
						});

						if (existing) {
							await db.update(schema.runs)
								.set(runData)
								.where(eq(schema.runs.seed, run.seed));
						} else {
							await db.insert(schema.runs)
								.values(runData);
						}
					}
					await saveDB();
				} catch (error) {
					console.error("Failed to save runs to SQLite:", error);
				}
			}
			// 触发扫描完成通知
			notify(
				"success",
				"扫描完成",
				`找到 ${runs.value.length} 个存档文件`,
				3000,
			);
		} catch (error) {
			console.error("Rescan failed:", error);
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
			// Initialize database
			await initDB();
			dbInitialized.value = true;

			// Load runs from SQLite
			const db = await getDB();
			const dbRuns = await db.select().from(schema.runs);
			if (dbRuns.length > 0) {
				runs.value = dbRuns.map(r => JSON.parse(r.rawJson) as RunFile);
				runsBySeed.value = new Map(runs.value.map((r) => [r.seed, r]));
			} else {
				// Fallback to IndexedDB if SQLite has no data
				const savedRuns = await loadRuns();
				if (savedRuns.length > 0) {
					runs.value = savedRuns;
					runsBySeed.value = new Map(runs.value.map((r) => [r.seed, r]));
					// Save to SQLite for future use
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
