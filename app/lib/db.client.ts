import { drizzle } from "drizzle-orm/sqlite-proxy";
import initSqlJs from "sql.js";
import * as schema from "~/db/schema";
import { loadSqliteDB, saveSqliteDB } from "~/lib/storage.client";

// Types
type QueryResult = { rows: unknown[] };
type BatchQuery = {
	sql: string;
	params: unknown[];
	method: "all" | "run" | "get" | "values";
};
type BatchResult = QueryResult[];

// SQL.js singleton promise
let sqlDbPromise: Promise<unknown | null> | null = null;

// Drizzle ORM instance (proxy wrapper around sql.js)
let dbInstance: DrizzleDB | null = null;

// Infer the proper Drizzle DB type from the schema
const _typedDb = drizzle(
	async () => ({}) as QueryResult,
	async () => [] as BatchResult,
	{ schema },
);
export type DrizzleDB = typeof _typedDb;

// Debounced save timer
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// Auto-discover migration SQL files via Vite glob (sorted by filename for order)
const migrationModules = import.meta.glob<{ default: string }>(
	"../db/migrations/*.sql",
	{ query: "?raw", eager: true },
);
const migrations = Object.entries(migrationModules)
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([, mod]) => mod.default);

// Initialize SQL.js WASM
export async function initDB(): Promise<DrizzleDB> {
	if (dbInstance) return dbInstance;

	if (!sqlDbPromise) {
		sqlDbPromise = (async () => {
			try {
				const SQL = await initSqlJs({
					locateFile: () => "/sql-wasm.wasm",
				});

				// Try to load persisted database from IndexedDB
				const savedBuffer = await loadSqliteDB();
				if (savedBuffer) {
					return new SQL.Database(savedBuffer);
				}
				return new SQL.Database();
			} catch (error) {
				console.error("Failed to initialize SQL.js:", error);
				return null;
			}
		})();
	}

	const sqlDb = (await sqlDbPromise) as {
		exec: (sql: string, params?: unknown[]) => { values: unknown[][] }[];
		run: (sql: string, params?: unknown[]) => void;
	} | null;
	if (!sqlDb) {
		throw new Error("Failed to initialize SQL.js");
	}

	// Run pending migrations
	const versionResult = sqlDb.exec("PRAGMA user_version");
	const userVersion =
		versionResult.length > 0 && versionResult[0].values.length > 0
			? (versionResult[0].values[0][0] as number)
			: 0;

	for (let i = userVersion; i < migrations.length; i++) {
		runMigration(sqlDb, migrations[i] as string);
	}
	sqlDb.run(`PRAGMA user_version = ${migrations.length}`);

	// Seed initial version and card pools if not already present
	await seedInitialData(sqlDb);

	// Create drizzle instance with proxy callbacks
	// Drizzle's sqlite-proxy accesses rows by column INDEX (row[0], row[1]),
	// so we must return sql.js values (arrays) directly, not objects.
	const db = drizzle(
		async (
			sqlQuery: string,
			params: unknown[],
			method: string,
		): Promise<QueryResult> => {
			try {
				if (method === "run") {
					sqlDb.run(sqlQuery, params);
					return { rows: [] };
				}
				const result = sqlDb.exec(sqlQuery, params);
				if (!result.length) return { rows: [] };
				return { rows: result[0].values };
			} catch (error) {
				console.error("SQL error:", error, "SQL:", sqlQuery, "Params:", params);
				throw error;
			}
		},
		async (queries: BatchQuery[]): Promise<BatchResult> => {
			const results = [];
			for (const { sql, params, method } of queries) {
				const result = await (async () => {
					if (method === "run") {
						sqlDb.run(sql, params);
						return { rows: [] };
					}
					const result = sqlDb.exec(sql, params);
					if (!result.length) return { rows: [] };
					return { rows: result[0].values };
				})();
				results.push(result);
			}
			return results;
		},
		{ schema },
	);

	dbInstance = db as DrizzleDB;
	return db;
}

// Get current DB instance
export function getDB(): DrizzleDB {
	if (!dbInstance) {
		throw new Error("Database not initialized. Call initDB() first.");
	}
	return dbInstance;
}

// Save database to IndexedDB
export async function saveDB(): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		try {
			if (!sqlDbPromise) {
				return reject(new Error("DB not initialized"));
			}
			sqlDbPromise
				.then(async (sqlDb) => {
					if (!sqlDb) return reject(new Error("DB not initialized"));
					const buffer = sqlDb.export();
					await saveSqliteDB(buffer);
					resolve(buffer);
				})
				.catch((err) => reject(err));
		} catch (error) {
			reject(error);
		}
	});
}

// Debounced save — avoids serializing on every row insert during batch ops
export function scheduleSave(delayMs = 2000): void {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(async () => {
		try {
			await saveDB();
		} catch (e) {
			console.error("Failed to save DB:", e);
		}
		saveTimer = null;
	}, delayMs);
}

// Close database
export function closeDB(): void {
	dbInstance = null;
	sqlDbPromise = null;
}

// Split SQL by statement breakpoints and execute each, tolerating
// idempotent operations on columns/tables that already exist
function runMigration(
	sqlDb: {
		exec: (sql: string, params?: unknown[]) => { values: unknown[][] }[];
		run: (sql: string, params?: unknown[]) => void;
	},
	sql: string,
): void {
	const statements = sql.split("--> statement-breakpoint");
	for (const stmt of statements) {
		const trimmed = stmt.trim();
		if (!trimmed) continue;
		try {
			sqlDb.exec(trimmed);
		} catch (_e) {
			const upper = trimmed.toUpperCase();
			if (upper.includes("ADD COLUMN") || upper.includes("CREATE TABLE")) {
				console.warn(
					"Migration step skipped (already exists):",
					trimmed.split("\n")[0],
				);
			} else {
				throw _e;
			}
		}
	}
}

// Seed initial data
async function seedInitialData(sqlDb: {
	exec: (sql: string, params?: unknown[]) => { values: unknown[][] }[];
	run: (sql: string, params?: unknown[]) => void;
	prepare: (sql: string) => {
		run: (params: unknown[]) => void;
		free: () => void;
	};
}): Promise<void> {
	// Check if game_versions table exists and has data
	const gameVersionsResult = sqlDb.exec(
		"SELECT COUNT(*) as count FROM game_versions;",
	);
	const hasGameVersions =
		gameVersionsResult.length > 0 && gameVersionsResult[0].values[0][0] > 0;

	// Check if card_pools has data
	const cardPoolsResult = sqlDb.exec(
		"SELECT COUNT(*) as count FROM card_pools;",
	);
	const hasCardPools =
		cardPoolsResult.length > 0 && cardPoolsResult[0].values[0][0] > 0;

	// If we already have data, skip seeding
	if (hasGameVersions && hasCardPools) {
		return;
	}

	// Try to load and seed card pool data
	try {
		// In client context, try to fetch from public folder
		if (typeof window !== "undefined") {
			const response = await fetch("/card-pools-v0.15.json");
			if (response.ok) {
				const data = await response.json();

				// Insert game version if needed
				if (!hasGameVersions) {
					sqlDb.run(
						"INSERT INTO game_versions (version, display_name, notes) VALUES (?, ?, ?)",
						[data.version, data.display_name, "Initial EA release"],
					);
				}

				// Insert card pools if needed
				if (!hasCardPools && data.card_pools) {
					const insertStmt = sqlDb.prepare(
						"INSERT INTO card_pools (card_id, character_id, is_starter, game_version) VALUES (?, ?, ?, ?)",
					);
					for (const card of data.card_pools) {
						insertStmt.run([
							card.card_id,
							card.character_id,
							card.is_starter ? 1 : 0,
							card.game_version,
						]);
					}
					insertStmt.free();
					console.log(`Seeded ${data.card_pools.length} card pool entries`);
				}
				return;
			}
		}
	} catch (error) {
		console.warn("Failed to seed card pool data from fetch:", error);
	}

	// Fallback: insert minimal data if fetch failed
	if (!hasGameVersions) {
		sqlDb.run(
			"INSERT INTO game_versions (version, display_name, notes) VALUES (?, ?, ?)",
			["0.15", "Early Access 0.15", "Initial EA release"],
		);
	}

	if (!hasCardPools) {
		console.warn("Card pool data not seeded - using empty database");
	}
}
