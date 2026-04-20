import {
	batchParseRunFiles,
	filterRunFiles,
	type ParsedRunFile,
	type RunSourceFile,
	scanDirectoryHandle,
} from "~/data/parser";
import type { RunFile } from "~/data/types";
import {
	clearRunsInRepository,
	getRunImportMetadataMap,
	loadAllRunsFromRepository,
	upsertRunsInRepository,
} from "~/repositories/runRepository";
import {
	clearPersistedStorage,
	initializeStorageRepository,
	loadPersistedDirectoryHandle,
	persistDirectoryHandle,
} from "~/repositories/storageRepository.client";

export interface RunImportInitialization {
	runs: RunFile[];
	dirHandle: FileSystemDirectoryHandle | null;
}

export interface RunImportResult {
	runs: RunFile[];
	importedCount: number;
	scannedCount: number;
}

export async function initializeRunImportService(): Promise<RunImportInitialization> {
	await initializeStorageRepository();

	const [runs, dirHandle] = await Promise.all([
		loadAllRunsFromRepository(),
		loadPersistedDirectoryHandle(),
	]);

	return { runs, dirHandle };
}

export async function importDirectory(
	handle: FileSystemDirectoryHandle,
): Promise<RunImportResult> {
	const sources = await scanDirectoryHandle(handle);
	await persistDirectoryHandle(handle);
	return importRunSources(sources);
}

export async function rescanDirectory(
	handle: FileSystemDirectoryHandle,
): Promise<RunImportResult> {
	const sources = await scanDirectoryHandle(handle);
	const metadataMap = await getRunImportMetadataMap();
	const changedSources = sources.filter((source) => {
		const existing = metadataMap.get(source.path);
		return !existing || existing.fileTimestamp !== source.lastModified;
	});

	return importRunSources(changedSources, { scannedCount: sources.length });
}

export async function importFallbackFiles(
	files: File[],
): Promise<RunImportResult> {
	return importRunSources(filterRunFiles(files));
}

export async function clearImportedRuns(): Promise<void> {
	await clearRunsInRepository();
	await clearPersistedStorage();
}

async function importRunSources(
	sources: RunSourceFile[],
	options?: { scannedCount?: number },
): Promise<RunImportResult> {
	const parsedRuns = await batchParseRunFiles(sources);
	await persistParsedRuns(parsedRuns);

	return {
		runs: await loadAllRunsFromRepository(),
		importedCount: parsedRuns.length,
		scannedCount: options?.scannedCount ?? sources.length,
	};
}

async function persistParsedRuns(parsedRuns: ParsedRunFile[]): Promise<void> {
	await upsertRunsInRepository(
		parsedRuns.map((parsed) => ({
			run: parsed.data,
			fileTimestamp: parsed.source.lastModified,
			sourcePath: parsed.source.path,
		})),
	);
}
