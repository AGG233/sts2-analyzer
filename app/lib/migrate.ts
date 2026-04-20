import type { RunFile } from "~/data/types";
import * as schema from "~/db/schema";
import { getDB } from "~/lib/db.client";
import { loadRuns } from "~/lib/storage.client";
import {
	type PersistedRunInput,
	upsertRunsInRepository,
} from "~/repositories/runRepository";

async function loadLegacyRuns(): Promise<RunFile[]> {
	return loadRuns();
}

export async function needsMigration(): Promise<boolean> {
	try {
		const indexedDbRuns = await loadLegacyRuns();
		if (indexedDbRuns.length === 0) {
			return false;
		}

		const db = getDB();
		const sqliteRuns = await db.select().from(schema.runs);

		return sqliteRuns.length === 0;
	} catch {
		return false;
	}
}

export async function migrateRunsFromIndexedDB(): Promise<number> {
	try {
		const runs = await loadLegacyRuns();
		if (runs.length === 0) {
			return 0;
		}

		const importedAt = new Date().toISOString();
		const payload: PersistedRunInput[] = runs.map((run) => ({
			run,
			importedAt,
		}));

		await upsertRunsInRepository(payload, {
			saveStrategy: "immediate",
		});

		return runs.length;
	} catch (error) {
		console.error("Migration failed:", error);
		throw error;
	}
}

export async function checkAndMigrate(): Promise<number> {
	if (!import.meta.client) {
		return 0;
	}

	const migrationRequired = await needsMigration();
	if (!migrationRequired) {
		return 0;
	}

	console.log("Migrating data from IndexedDB to SQLite...");
	const count = await migrateRunsFromIndexedDB();
	console.log(`Migrated ${count} runs successfully`);
	return count;
}
