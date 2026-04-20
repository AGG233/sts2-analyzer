// =============================================================================
// Slay the Spire 2 — Save File Parser
// =============================================================================

import type { PrefsFile, ProgressFile, RunFile, SettingsFile } from "./types";

export interface RunSourceFile {
	file: File;
	path: string;
	lastModified: number;
}

export interface ParsedRunFile {
	data: RunFile;
	source: RunSourceFile;
}

// ---- Supported schema versions ----

const SUPPORTED_RUN_SCHEMA_VERSIONS = new Set([8, 9]);
const SUPPORTED_PROGRESS_SCHEMA_VERSIONS = new Set([2]);

// ---- Generic validation helpers ----

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasString(obj: Record<string, unknown>, key: string): boolean {
	return typeof obj[key] === "string";
}

function hasNumber(obj: Record<string, unknown>, key: string): boolean {
	return typeof obj[key] === "number";
}

function hasBoolean(obj: Record<string, unknown>, key: string): boolean {
	return typeof obj[key] === "boolean";
}

function hasArray(obj: Record<string, unknown>, key: string): boolean {
	return Array.isArray(obj[key]);
}

// ---- Run file parser ----

export function parseRunFile(json: unknown): RunFile {
	if (!isObject(json)) {
		throw new ParseError("Run file root must be a JSON object");
	}

	const obj = json;

	// Validate required fields
	const requiredStrings = [
		"build_id",
		"game_mode",
		"killed_by_encounter",
		"killed_by_event",
		"platform_type",
		"seed",
	];
	for (const key of requiredStrings) {
		if (!hasString(obj, key)) {
			throw new ParseError(`Missing or invalid field: ${key}`);
		}
	}

	const requiredNumbers = [
		"ascension",
		"run_time",
		"schema_version",
		"start_time",
	];
	for (const key of requiredNumbers) {
		if (!hasNumber(obj, key)) {
			throw new ParseError(`Missing or invalid field: ${key}`);
		}
	}

	if (!hasBoolean(obj, "win") || !hasBoolean(obj, "was_abandoned")) {
		throw new ParseError("Missing or invalid field: win / was_abandoned");
	}

	if (
		!hasArray(obj, "acts") ||
		!hasArray(obj, "map_point_history") ||
		!hasArray(obj, "players")
	) {
		throw new ParseError(
			"Missing or invalid array field: acts / map_point_history / players",
		);
	}

	const schemaVersion = obj.schema_version as number;
	if (!SUPPORTED_RUN_SCHEMA_VERSIONS.has(schemaVersion)) {
		console.warn(
			`[STS2 Parser] Unsupported run schema version: ${schemaVersion}. Parsing may be inaccurate.`,
		);
	}

	return obj as unknown as RunFile;
}

// ---- Progress file parser ----

export function parseProgressFile(json: unknown): ProgressFile {
	if (!isObject(json)) {
		throw new ParseError("Progress file root must be a JSON object");
	}

	const obj = json;

	if (!hasNumber(obj, "schema_version")) {
		throw new ParseError("Missing schema_version");
	}

	const schemaVersion = obj.schema_version as number;
	if (!SUPPORTED_PROGRESS_SCHEMA_VERSIONS.has(schemaVersion)) {
		console.warn(
			`[STS2 Parser] Unsupported progress schema version: ${schemaVersion}`,
		);
	}

	// ancient_stats is optional but should be an array if present
	if (obj.ancient_stats !== undefined && !hasArray(obj, "ancient_stats")) {
		throw new ParseError("ancient_stats must be an array");
	}

	return obj as unknown as ProgressFile;
}

// ---- Prefs file parser ----

export function parsePrefsFile(json: unknown): PrefsFile {
	if (!isObject(json)) {
		throw new ParseError("Prefs file root must be a JSON object");
	}
	return json as unknown as PrefsFile;
}

// ---- Settings file parser ----

export function parseSettingsFile(json: unknown): SettingsFile {
	if (!isObject(json)) {
		throw new ParseError("Settings file root must be a JSON object");
	}
	return json as unknown as SettingsFile;
}

// ---- Batch parsing ----

export async function batchParseRunFiles(
	files: RunSourceFile[],
): Promise<ParsedRunFile[]> {
	const results: ParsedRunFile[] = [];
	const errors: { file: string; error: string }[] = [];

	for (const source of files) {
		try {
			const text = await source.file.text();
			const json = JSON.parse(text);
			const data = parseRunFile(json);
			results.push({ data, source });
		} catch (e) {
			errors.push({
				file: source.path,
				error: e instanceof Error ? e.message : String(e),
			});
		}
	}

	if (errors.length > 0) {
		console.warn("[STS2 Parser] Errors during batch parse:", errors);
	}

	return results;
}

// ---- Directory scanning (File System Access API) ----

export async function scanDirectoryHandle(
	dirHandle: FileSystemDirectoryHandle,
	currentPath = "",
): Promise<RunSourceFile[]> {
	const runFiles: RunSourceFile[] = [];
	for await (const entry of dirHandle.values()) {
		const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

		if (entry.kind === "file" && entry.name.endsWith(".run")) {
			const file = await entry.getFile();
			runFiles.push({
				file,
				path: entryPath,
				lastModified: file.lastModified,
			});
		} else if (entry.kind === "directory") {
			const subFiles = await scanDirectoryHandle(entry, entryPath);
			runFiles.push(...subFiles);
		}
	}
	return runFiles;
}

export function filterRunFiles(files: File[]): RunSourceFile[] {
	return files
		.filter((file) => file.name.endsWith(".run"))
		.map((file) => ({
			file,
			path: file.webkitRelativePath || file.name,
			lastModified: file.lastModified,
		}));
}

// ---- Error class ----

export class ParseError extends Error {
	constructor(message: string) {
		super(`[STS2 Parse Error] ${message}`);
		this.name = "ParseError";
	}
}
