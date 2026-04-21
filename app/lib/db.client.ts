import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { Database, Statement } from "sql.js";
import initSqlJs from "sql.js";
import * as schema from "~/db/schema";
import { loadSqliteDB, saveSqliteDB } from "~/lib/storage.client";

// Types
type QueryResult = { rows: unknown[] };
type SqlJsQueryResult = { values: unknown[][] };
type SqlJsParams = Parameters<SqlJsDatabase["exec"]>[1];
type BatchQuery = {
	sql: string;
	params: SqlJsParams;
	method: "all" | "run" | "get" | "values";
};
type BatchResult = QueryResult[];
type SqlJsDatabase = Database;

// SQL.js singleton promise
let sqlDbPromise: Promise<SqlJsDatabase | null> | null = null;

// 整体初始化 Promise（防止并发重复执行迁移和种子数据）
let initPromise: Promise<DrizzleDB> | null = null;

// Drizzle ORM instance (proxy wrapper around sql.js)
let dbInstance: DrizzleDB | null = null;
let flushHandlersRegistered = false;

// Infer the proper Drizzle DB type from the schema
export const drizzleTypeTemplate = drizzle(
	async () => ({}) as QueryResult,
	async () => [] as BatchResult,
	{ schema },
);
export type DrizzleDB = typeof drizzleTypeTemplate;

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

	if (!initPromise) {
		initPromise = (async () => {
			if (!sqlDbPromise) {
				sqlDbPromise = (async () => {
					try {
						const SQL = await initSqlJs({
							locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
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

			const sqlDb = await sqlDbPromise;
			if (!sqlDb) {
				initPromise = null;
				throw new Error("Failed to initialize SQL.js");
			}

			// Run pending migrations
			const versionResult = sqlDb.exec("PRAGMA user_version");
			const userVersion = getNumericCell(versionResult);

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
					params: SqlJsParams,
					method: string,
				): Promise<QueryResult> => {
					try {
						if (method === "run") {
							sqlDb.run(sqlQuery, params);
							return { rows: [] };
						}
						const result = sqlDb.exec(sqlQuery, params);
						return { rows: getExecRows(result) };
					} catch (error) {
						console.error(
							"SQL error:",
							error,
							"SQL:",
							sqlQuery,
							"Params:",
							params,
						);
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
							return { rows: getExecRows(result) };
						})();
						results.push(result);
					}
					return results;
				},
				{ schema },
			);

			dbInstance = db as DrizzleDB;
			registerFlushHandlers();
			return dbInstance as DrizzleDB;
		})();
	}

	return initPromise;
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

export async function flushScheduledSave(): Promise<void> {
	if (saveTimer) {
		clearTimeout(saveTimer);
		saveTimer = null;
	}
	await saveDB();
}

// Close database
export function closeDB(): void {
	if (saveTimer) {
		clearTimeout(saveTimer);
		saveTimer = null;
	}
	dbInstance = null;
	sqlDbPromise = null;
	initPromise = null;
}

function registerFlushHandlers(): void {
	if (flushHandlersRegistered || typeof window === "undefined") {
		return;
	}

	const flush = () => {
		void flushScheduledSave().catch((error) => {
			console.error("Failed to flush DB before page exit:", error);
		});
	};

	window.addEventListener("beforeunload", flush);
	window.addEventListener("pagehide", flush);
	flushHandlersRegistered = true;
}

// Split SQL by statement breakpoints and execute each, tolerating
// idempotent operations on columns/tables that already exist
function runMigration(sqlDb: SqlJsDatabase, sql: string): void {
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
	exec: (sql: string, params?: SqlJsParams) => SqlJsQueryResult[];
	run: (sql: string, params?: SqlJsParams) => Database;
	prepare: (sql: string) => Statement;
}): Promise<void> {
	let hasGameVersions = false;
	let hasCardPools = false;
	let hasCardMetadata = false;
	let hasCardVars = false;

	try {
		// Check which tables already have data
		const gameVersionsResult = sqlDb.exec(
			"SELECT COUNT(*) as count FROM game_versions;",
		);
		hasGameVersions = getNumericCell(gameVersionsResult) > 0;

		const cardPoolsResult = sqlDb.exec(
			"SELECT COUNT(*) as count FROM card_pools;",
		);
		hasCardPools = getNumericCell(cardPoolsResult) > 0;

		const cardMetadataResult = sqlDb.exec(
			"SELECT COUNT(*) as count FROM card_metadata;",
		);
		hasCardMetadata = getNumericCell(cardMetadataResult) > 0;

		const cardVarsResult = sqlDb.exec(
			"SELECT COUNT(*) as count FROM card_vars;",
		);
		hasCardVars = getNumericCell(cardVarsResult) > 0;

		if (hasGameVersions && hasCardPools && hasCardMetadata && hasCardVars) {
			return;
		}

		if (typeof globalThis.window !== "undefined") {
			const baseURL = import.meta.env.BASE_URL;

			if (!hasGameVersions || !hasCardPools) {
				const poolResponse = await fetch(`${baseURL}card-pools-v0.15.json`);
				if (poolResponse.ok) {
					const poolData = (await poolResponse.json()) as {
						version: string;
						display_name: string;
						card_pools?: Array<{
							card_id: string;
							character_id: string;
							is_starter: boolean;
							game_version: string;
						}>;
					};

					if (!hasGameVersions) {
						sqlDb.run(
							"INSERT INTO game_versions (version, display_name, notes) VALUES (?, ?, ?)",
							[poolData.version, poolData.display_name, "Initial EA release"],
						);
					}

					if (!hasCardPools && poolData.card_pools) {
						const insertStmt = sqlDb.prepare(
							"INSERT INTO card_pools (card_id, character_id, is_starter, game_version) VALUES (?, ?, ?, ?)",
						);
						for (const card of poolData.card_pools) {
							insertStmt.run([
								card.card_id,
								card.character_id,
								card.is_starter ? 1 : 0,
								card.game_version,
							]);
						}
						insertStmt.free();
						console.log(
							`Seeded ${poolData.card_pools.length} card pool entries`,
						);
					}
				}
			}

			if (!hasCardMetadata) {
				const metaResponse = await fetch(`${baseURL}card-metadata-v0.15.json`);
				if (metaResponse.ok) {
					const metaData = (await metaResponse.json()) as {
						version: string;
						cards: Record<
							string,
							{
								cost: number;
								type: string;
								rarity: string;
								target: string;
								tags: string[];
								character_id?: string;
								is_starter?: boolean;
							}
						>;
					};

					const insertStmt = sqlDb.prepare(
						"INSERT INTO card_metadata (card_id, game_version, cost, type, rarity, target, tags_json, character_id, is_starter) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
					);
					for (const [cardId, meta] of Object.entries(metaData.cards)) {
						insertStmt.run([
							cardId,
							metaData.version,
							meta.cost,
							meta.type,
							meta.rarity,
							meta.target,
							JSON.stringify(meta.tags),
							meta.character_id ?? "",
							meta.is_starter ? 1 : 0,
						]);
					}
					insertStmt.free();
					console.log(
						`Seeded ${Object.keys(metaData.cards).length} card metadata entries`,
					);
				}
			}

			if (!hasCardVars) {
				const varsResponse = await fetch(`${baseURL}card-vars-v0.15.json`);
				if (varsResponse.ok) {
					const varsData = (await varsResponse.json()) as {
						version: string;
						cards: Record<
							string,
							{
								vars: Array<{
									name: string;
									type: string;
									base_value: number;
								}>;
								upgrades: Record<string, number>;
								energy_upgrade?: number;
							}
						>;
						relics: Record<
							string,
							{
								vars: Array<{
									name: string;
									type: string;
									base_value: number;
								}>;
								upgrades: Record<string, number>;
							}
						>;
					};

					const insertStmt = sqlDb.prepare(
						"INSERT INTO card_vars (entity_id, entity_type, game_version, data_json) VALUES (?, ?, ?, ?)",
					);

					for (const [cardId, entry] of Object.entries(varsData.cards)) {
						insertStmt.run([
							cardId,
							"card",
							varsData.version,
							JSON.stringify(entry),
						]);
					}
					for (const [relicId, entry] of Object.entries(varsData.relics)) {
						insertStmt.run([
							relicId,
							"relic",
							varsData.version,
							JSON.stringify(entry),
						]);
					}

					insertStmt.free();
					console.log(
						`Seeded ${Object.keys(varsData.cards).length} card vars + ${Object.keys(varsData.relics).length} relic vars entries`,
					);
				}
			}

			return;
		}
	} catch (seedError) {
		console.warn("seedInitialData failed:", seedError);
	}

	// 回退：如果没有从 JSON 成功 seed，插入最小版本记录
	if (!hasGameVersions) {
		sqlDb.run(
			"INSERT INTO game_versions (version, display_name, notes) VALUES (?, ?, ?)",
			["0.15", "Early Access 0.15", "Initial EA release"],
		);
	}
}

function getExecRows(results: SqlJsQueryResult[]): unknown[] {
	return results[0]?.values ?? [];
}

function getNumericCell(results: SqlJsQueryResult[]): number {
	const value = results[0]?.values[0]?.[0];
	return typeof value === "number" ? value : 0;
}
