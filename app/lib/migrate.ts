// lib/migrate.ts
// IndexedDB → SQLite migration utilities

import { getTotalFloorCount } from "~/data/analytics/floors";
import * as schema from "~/db/schema";
import { getDB, saveDB } from "~/lib/db.client";
import { loadRuns } from "~/lib/storage.client";

/**
 * Check if migration from IndexedDB is needed
 * Returns true if IndexedDB has data and SQLite is empty
 */
export async function needsMigration(): Promise<boolean> {
	try {
		const indexedDbRuns = await loadRuns();
		if (indexedDbRuns.length === 0) {
			return false;
		}

		const db = await getDB();
		const sqliteRuns = await db.select().from(schema.runs);

		return sqliteRuns.length === 0;
	} catch {
		return false;
	}
}

/**
 * Migrate runs from IndexedDB to SQLite
 * Returns the number of migrated runs
 */
export async function migrateRunsFromIndexedDB(): Promise<number> {
	try {
		const runs = await loadRuns();
		if (runs.length === 0) {
			return 0;
		}

		const db = await getDB();

		// Insert all runs into SQLite
		for (const run of runs) {
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
				totalFloors: getTotalFloorCount(run),
				rawJson: JSON.stringify(run),
			};

			await db.insert(schema.runs).values(runData).onConflictDoNothing(); // Skip if already exists
		}

		await saveDB();
		return runs.length;
	} catch (error) {
		console.error("Migration failed:", error);
		throw error;
	}
}

/**
 * Check and perform migration if needed
 */
export async function checkAndMigrate(): Promise<number> {
	if (!import.meta.client) {
		return 0;
	}

	const needed = await needsMigration();
	if (!needed) {
		return 0;
	}

	console.log("Migrating data from IndexedDB to SQLite...");
	const count = await migrateRunsFromIndexedDB();
	console.log(`Migrated ${count} runs successfully`);
	return count;
}
