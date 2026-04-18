import { drizzle } from "drizzle-orm/sqlite-proxy";
import initSqlJs from "sql.js";
import * as schema from "~/db/schema";

// Types
type QueryResult = { rows: any[] };
type BatchQuery = {
	sql: string;
	params: any[];
	method: "all" | "run" | "get" | "values";
};
type BatchResult = QueryResult[];

// SQL.js singleton promise
let sqlDbPromise: Promise<initSqlJs.SqlJsDatabase | null> | null = null;

// Drizzle ORM instance (proxy wrapper around sql.js)
let dbInstance: any = null;

// Initialize SQL.js WASM
export async function initDB(): Promise<any> {
	if (dbInstance) return dbInstance;

	if (!sqlDbPromise) {
		sqlDbPromise = (async () => {
			try {
				const SQL = await initSqlJs({
					locateFile: () => "/sql-wasm.wasm",
				});
				return new SQL.Database();
			} catch (error) {
				console.error("Failed to initialize SQL.js:", error);
				return null;
			}
		})();
	}

	const sqlDb = await sqlDbPromise;
	if (!sqlDb) {
		throw new Error("Failed to initialize SQL.js");
	}

	// Initialize schema
	const migrationSql = await import(
		"~/db/migrations/0000_swift_ultimatum.sql?raw"
	).then((m) => m.default);
	sqlDb.exec(migrationSql);

	// Seed initial version and card pools if not already present
	await seedInitialData(sqlDb);

	// Create drizzle instance with proxy callbacks
	const db = drizzle(
		async (
			sqlQuery: string,
			params: any[],
			method: string,
		): Promise<QueryResult> => {
			try {
				if (method === "run") {
					sqlDb.run(sqlQuery, params as any);
					return { rows: [] };
				}
				const result = sqlDb.exec(sqlQuery, params as any);
				if (!result.length) return { rows: [] };
				const cols = result[0].columns;
				const vals = result[0].values;
				return {
					rows: vals.map((row) =>
						cols.reduce((obj, col, idx) => ({ ...obj, [col]: row[idx] }), {}),
					),
				};
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
						sqlDb.run(sql, params as any);
						return { rows: [] };
					}
					const result = sqlDb.exec(sql, params as any);
					if (!result.length) return { rows: [] };
					const cols = result[0].columns;
					const vals = result[0].values;
					return {
						rows: vals.map((row) =>
							cols.reduce((obj, col, idx) => ({ ...obj, [col]: row[idx] }), {}),
						),
					};
				})();
				results.push(result);
			}
			return results;
		},
		{ schema },
	);

	dbInstance = db;
	return db;
}

// Get current DB instance
export function getDB(): any {
	if (!dbInstance) {
		throw new Error("Database not initialized. Call initDB() first.");
	}
	return dbInstance;
}

// Save database
export function saveDB(): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		try {
			if (!sqlDbPromise) {
				return reject(new Error("DB not initialized"));
			}
			sqlDbPromise
				.then((sqlDb) => {
					if (!sqlDb) return reject(new Error("DB not initialized"));
					resolve(sqlDb.export());
				})
				.catch((err) => reject(err));
		} catch (error) {
			reject(error);
		}
	});
}

// Close database
export function closeDB(): void {
	dbInstance = null;
	sqlDbPromise = null;
}

// Seed initial data
async function seedInitialData(sqlDb: any): Promise<void> {
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
