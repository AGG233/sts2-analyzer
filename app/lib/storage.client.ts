// lib/storage.client.ts
import type { RunFile } from "~/data/types";

const DB_NAME = "Sts2Analyzer";
const STORE_NAME = "runs";
const DIR_HANDLE_KEY = "dirHandle";
const DB_VERSION = 1;

// Open database
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

// Run data storage
export const saveRuns = async (runs: RunFile[]): Promise<void> => {
	await dbPut("runs", JSON.stringify(runs));
};

export const loadRuns = async (): Promise<RunFile[]> => {
	const raw = await dbGet("runs");
	if (!raw || typeof raw !== "string") return [];
	return JSON.parse(raw) as RunFile[];
};

// Directory handle storage
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
