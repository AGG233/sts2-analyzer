import { defineStore } from "pinia";
import { getRunSummary } from "~/data/analytics";
import type { RunFile } from "~/data/types";
import { notifyApp } from "~/lib/notifications";
import {
	clearImportedRuns,
	importDirectory,
	importFallbackFiles,
	initializeRunImportService,
	rescanDirectory,
} from "~/services/runImportService.client";

let initPromise: Promise<void> | null = null;

export const useRunStore = defineStore("runs", () => {
	const runs = ref<RunFile[]>([]);
	const loading = ref(false);
	const dirHandle = ref<FileSystemDirectoryHandle | null>(null);
	const dbInitialized = ref(false);
	const runsBySeed = ref<Map<string, RunFile>>(new Map());

	const summaries = computed(() => runs.value.map((run) => getRunSummary(run)));

	const wins = computed(
		() => summaries.value.filter((summary) => summary.win).length,
	);
	const losses = computed(
		() => summaries.value.filter((summary) => !summary.win).length,
	);

	function syncRuns(nextRuns: RunFile[]) {
		runs.value = nextRuns;
		runsBySeed.value = new Map(nextRuns.map((run) => [run.seed, run]));
	}

	function getRunBySeed(seed: string) {
		return runsBySeed.value.get(seed) ?? null;
	}

	async function init() {
		if (!import.meta.client) {
			return;
		}
		if (initPromise) {
			return initPromise;
		}

		initPromise = (async () => {
			loading.value = true;
			try {
				const { runs: persistedRuns, dirHandle: persistedDirHandle } =
					await initializeRunImportService();
				syncRuns(persistedRuns);
				dirHandle.value = persistedDirHandle;
				dbInitialized.value = true;
			} catch (error) {
				initPromise = null;
				console.error("Failed to initialize run store:", error);
				notifyApp({
					severity: "error",
					summary: "初始化失败",
					detail: error instanceof Error ? error.message : String(error),
				});
			} finally {
				loading.value = false;
			}
		})();

		return initPromise;
	}

	async function selectDirectory(handle: FileSystemDirectoryHandle) {
		loading.value = true;
		try {
			const result = await importDirectory(handle);
			dirHandle.value = handle;
			syncRuns(result.runs);
			return result;
		} finally {
			loading.value = false;
		}
	}

	async function importFiles(files: File[]) {
		loading.value = true;
		try {
			const result = await importFallbackFiles(files);
			syncRuns(result.runs);
			return result;
		} finally {
			loading.value = false;
		}
	}

	async function rescan() {
		if (!dirHandle.value || loading.value) {
			return {
				runs: runs.value,
				importedCount: 0,
				scannedCount: 0,
			};
		}

		loading.value = true;
		try {
			const result = await rescanDirectory(dirHandle.value);
			syncRuns(result.runs);
			return result;
		} finally {
			loading.value = false;
		}
	}

	async function clear() {
		loading.value = true;
		try {
			await clearImportedRuns();
			syncRuns([]);
			dirHandle.value = null;
		} finally {
			loading.value = false;
		}
	}

	return {
		runs,
		loading,
		dirHandle,
		dbInitialized,
		summaries,
		wins,
		losses,
		init,
		selectDirectory,
		importFiles,
		rescan,
		clear,
		getRunBySeed,
	};
});
