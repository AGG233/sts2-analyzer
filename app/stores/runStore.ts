// stores/runStore.ts
import { defineStore } from "pinia";
import { getRunSummary } from "~/data/analytics";
import { batchParseRunFiles, scanDirectoryHandle } from "~/data/parser";
import type { RunFile } from "~/data/types";
import {
	clearAll,
	loadDirHandle,
	loadRuns,
	saveDirHandle,
	saveRuns,
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
	const addRuns = (newRuns: RunFile[]) => {
		runs.value = [...runs.value, ...newRuns];
		for (const r of newRuns) {
			runsBySeed.value.set(r.seed, r);
		}
		if (import.meta.client) {
			saveRuns(runs.value);
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
				await saveRuns(runs.value);
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

	const clear = () => {
		runs.value = [];
		runsBySeed.value = new Map();
		dirHandle.value = null;
		if (import.meta.client) {
			clearAll();
		}
	};

	// Initialize (client only)
	const init = async () => {
		if (!import.meta.client) return;

		try {
			// Load runs from IndexedDB
			const savedRuns = await loadRuns();
			if (savedRuns.length > 0) {
				runs.value = savedRuns;
				runsBySeed.value = new Map(runs.value.map((r) => [r.seed, r]));
			}

			// Load directory handle
			const savedDirHandle = await loadDirHandle();
			if (savedDirHandle) {
				dirHandle.value = savedDirHandle;
			}
		} catch (error) {
			console.error("Failed to load from storage:", error);
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
