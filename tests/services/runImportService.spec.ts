import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRunFile, RunSourceFile } from "~/data/parser";
import type { RunFile } from "~/data/types";

vi.mock("~/data/parser", () => ({
	batchParseRunFiles: vi.fn(),
	filterRunFiles: vi.fn(),
	scanDirectoryHandle: vi.fn(),
}));

vi.mock("~/repositories/runRepository", () => ({
	clearRunsInRepository: vi.fn(),
	getRunImportMetadataMap: vi.fn(),
	loadAllRunsFromRepository: vi.fn(),
	upsertRunsInRepository: vi.fn(),
}));

vi.mock("~/repositories/storageRepository.client", () => ({
	clearPersistedStorage: vi.fn(),
	initializeStorageRepository: vi.fn(),
	loadPersistedDirectoryHandle: vi.fn(),
	persistDirectoryHandle: vi.fn(),
}));

const {
	clearImportedRuns,
	importDirectory,
	importFallbackFiles,
	initializeRunImportService,
	rescanDirectory,
} = await import("~/services/runImportService.client");
const parser = await import("~/data/parser");
const runRepository = await import("~/repositories/runRepository");
const storageRepository = await import(
	"~/repositories/storageRepository.client"
);

function createRun(seed: string): RunFile {
	return {
		seed,
		players: [
			{
				id: 0,
				character: "CHARACTER.IRONCLAD",
				deck: [],
				relics: [],
				potions: [],
				max_potion_slot_count: 3,
			},
		],
		acts: ["ACT.OVERGROWTH"],
		ascension: 0,
		build_id: "test-build-0.15",
		game_mode: "standard",
		killed_by_encounter: "NONE.NONE",
		killed_by_event: "",
		map_point_history: [],
		modifiers: [],
		platform_type: "steam",
		run_time: 60,
		schema_version: 9,
		start_time: 1000,
		was_abandoned: false,
		win: false,
	};
}

function createSource(path: string, lastModified: number): RunSourceFile {
	return {
		file: new File(["{}"], path),
		path,
		lastModified,
	};
}

function createParsedRun(seed: string, source: RunSourceFile): ParsedRunFile {
	return {
		data: createRun(seed),
		source,
	};
}

describe("runImportService", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(runRepository.loadAllRunsFromRepository).mockResolvedValue([]);
		vi.mocked(storageRepository.loadPersistedDirectoryHandle).mockResolvedValue(
			null,
		);
		vi.mocked(runRepository.getRunImportMetadataMap).mockResolvedValue(
			new Map(),
		);
		vi.mocked(parser.scanDirectoryHandle).mockResolvedValue([]);
		vi.mocked(parser.filterRunFiles).mockReturnValue([]);
		vi.mocked(parser.batchParseRunFiles).mockResolvedValue([]);
		vi.mocked(runRepository.upsertRunsInRepository).mockResolvedValue(
			undefined,
		);
		vi.mocked(runRepository.clearRunsInRepository).mockResolvedValue(undefined);
		vi.mocked(storageRepository.clearPersistedStorage).mockResolvedValue(
			undefined,
		);
		vi.mocked(storageRepository.persistDirectoryHandle).mockResolvedValue(
			undefined,
		);
		vi.mocked(storageRepository.initializeStorageRepository).mockResolvedValue(
			undefined,
		);
	});

	it("initializes storage and returns persisted runs and directory handle", async () => {
		const dirHandle = {} as FileSystemDirectoryHandle;
		const runs = [createRun("seed-a")];
		vi.mocked(runRepository.loadAllRunsFromRepository).mockResolvedValue(runs);
		vi.mocked(storageRepository.loadPersistedDirectoryHandle).mockResolvedValue(
			dirHandle,
		);

		const result = await initializeRunImportService();

		expect(
			storageRepository.initializeStorageRepository,
		).toHaveBeenCalledOnce();
		expect(result).toEqual({
			runs,
			dirHandle,
		});
	});

	it("persists selected directory and imports parsed runs", async () => {
		const dirHandle = {} as FileSystemDirectoryHandle;
		const source = createSource("history/seed-a.run", 123);
		const parsedRuns = [createParsedRun("seed-a", source)];
		const storedRuns = [createRun("seed-a")];

		vi.mocked(parser.scanDirectoryHandle).mockResolvedValue([source]);
		vi.mocked(parser.batchParseRunFiles).mockResolvedValue(parsedRuns);
		vi.mocked(runRepository.loadAllRunsFromRepository).mockResolvedValue(
			storedRuns,
		);

		const result = await importDirectory(dirHandle);

		expect(storageRepository.persistDirectoryHandle).toHaveBeenCalledWith(
			dirHandle,
		);
		expect(runRepository.upsertRunsInRepository).toHaveBeenCalledWith([
			expect.objectContaining({
				run: expect.objectContaining({ seed: "seed-a" }),
				sourcePath: "history/seed-a.run",
				fileTimestamp: 123,
			}),
		]);
		expect(result).toEqual({
			runs: storedRuns,
			importedCount: 1,
			scannedCount: 1,
		});
	});

	it("rescans only changed files based on persisted source metadata", async () => {
		const changedSource = createSource("history/changed.run", 200);
		const unchangedSource = createSource("history/unchanged.run", 100);
		const parsedRuns = [createParsedRun("seed-changed", changedSource)];

		vi.mocked(parser.scanDirectoryHandle).mockResolvedValue([
			changedSource,
			unchangedSource,
		]);
		vi.mocked(runRepository.getRunImportMetadataMap).mockResolvedValue(
			new Map([
				[
					"history/unchanged.run",
					{
						seed: "seed-unchanged",
						sourcePath: "history/unchanged.run",
						fileTimestamp: 100,
					},
				],
				[
					"history/changed.run",
					{
						seed: "seed-changed",
						sourcePath: "history/changed.run",
						fileTimestamp: 150,
					},
				],
			]),
		);
		vi.mocked(parser.batchParseRunFiles).mockResolvedValue(parsedRuns);

		const result = await rescanDirectory({} as FileSystemDirectoryHandle);

		expect(parser.batchParseRunFiles).toHaveBeenCalledWith([changedSource]);
		expect(result.importedCount).toBe(1);
		expect(result.scannedCount).toBe(2);
	});

	it("imports fallback files after filtering run files", async () => {
		const fallbackSource = createSource("fallback/seed-a.run", 321);
		const parsedRuns = [createParsedRun("seed-a", fallbackSource)];
		const inputFile = new File(["{}"], "seed-a.run");

		vi.mocked(parser.filterRunFiles).mockReturnValue([fallbackSource]);
		vi.mocked(parser.batchParseRunFiles).mockResolvedValue(parsedRuns);

		await importFallbackFiles([inputFile]);

		expect(parser.filterRunFiles).toHaveBeenCalledWith([inputFile]);
		expect(parser.batchParseRunFiles).toHaveBeenCalledWith([fallbackSource]);
	});

	it("clears repository data and persisted storage together", async () => {
		await clearImportedRuns();

		expect(runRepository.clearRunsInRepository).toHaveBeenCalledOnce();
		expect(storageRepository.clearPersistedStorage).toHaveBeenCalledOnce();
	});
});
