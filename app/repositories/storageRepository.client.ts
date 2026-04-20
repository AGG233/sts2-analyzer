import { initDB } from "~/lib/db.client";
import { checkAndMigrate } from "~/lib/migrate";
import { clearAll, loadDirHandle, saveDirHandle } from "~/lib/storage.client";

export async function initializeStorageRepository(): Promise<void> {
	await initDB();
	await checkAndMigrate();
}

export async function loadPersistedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
	return loadDirHandle();
}

export async function persistDirectoryHandle(
	handle: FileSystemDirectoryHandle,
): Promise<void> {
	await saveDirHandle(handle);
}

export async function clearPersistedStorage(): Promise<void> {
	await clearAll();
}
