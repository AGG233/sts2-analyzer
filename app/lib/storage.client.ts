// lib/storage.client.ts
import type { RunFile } from "~/data/types";

const DB_NAME = "Sts2Analyzer";
const STORE_NAME = "runs";
const DIR_HANDLE_KEY = "dirHandle";
const SQLITE_DB_KEY = "sqliteDb";
const DB_VERSION = 2;

// Open IndexedDB for metadata storage
const openDB = (): Promise<IDBDatabase> => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});
};

// Base storage operations
const dbGet = async (key: string): Promise<unknown> => {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const store = tx.objectStore(STORE_NAME);
		const request = store.get(key);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
};

const dbPut = async (key: string, value: unknown): Promise<void> => {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		const request = store.put(value, key);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
};

// Directory handle storage (for file system access)
export const saveDirHandle = async (
	dirHandle: FileSystemDirectoryHandle,
): Promise<void> => {
	await dbPut(DIR_HANDLE_KEY, dirHandle);
};

export const loadDirHandle =
	async (): Promise<FileSystemDirectoryHandle | null> => {
		const handle = await dbGet(DIR_HANDLE_KEY);
		return (handle as FileSystemDirectoryHandle | null) ?? null;
	};

// SQLite DB storage
export const saveSqliteDB = async (dbBuffer: Uint8Array): Promise<void> => {
	await dbPut(SQLITE_DB_KEY, dbBuffer);
};

export const loadSqliteDB = async (): Promise<Uint8Array | null> => {
	const buffer = await dbGet(SQLITE_DB_KEY);
	return buffer as Uint8Array | null;
};

// Load runs from SQLite
export const loadRuns = async (): Promise<RunFile[]> => {
	// For now, still use IndexedDB for compatibility
	const raw = await dbGet("runs");
	if (!raw || typeof raw !== "string") return [];
	return JSON.parse(raw) as RunFile[];
};

// Save runs (backward compatibility)
export const saveRuns = async (runs: RunFile[]): Promise<void> => {
	await dbPut("runs", JSON.stringify(runs));
};

// Clear all data
export const clearAll = async (): Promise<void> => {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		const request = store.clear();
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
};
