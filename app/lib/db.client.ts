import initSqlJs from "sql.js";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { SQLiteBindParams } from "sql.js";
import * as schema from "~/db/schema";

// Types
type QueryResult = { rows: any[] };
type BatchQuery = { sql: string; params: any[]; method: 'all' | 'run' | 'get' | 'values' };
type BatchResult = QueryResult[];

// SQL.js singleton promise
let sqlDbPromise: Promise<initSqlJs.Database | null> | null = null;

// Drizzle ORM instance (proxy wrapper around sql.js)
let dbInstance: any = null;

// Initialize SQL.js WASM
export async function initDB(): Promise<any> {
  if (dbInstance) return dbInstance;

  if (!sqlDbPromise) {
    sqlDbPromise = (async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: () => "/_nuxt/sql-wasm.wasm",
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
  const migrationSql = await import("~/db/migrations/0000_swift_ultimatum.sql?raw").then(m => m.default);
  sqlDb.exec(migrationSql);

  // Seed initial version and card pools if not already present
  await seedInitialData(sqlDb);

  // Create drizzle instance with proxy callbacks
  const db = drizzle(
    async (sqlQuery: string, params: any[], method: string): Promise<QueryResult> => {
      try {
        if (method === "run") {
          sqlDb.run(sqlQuery, params as SQLiteBindParams);
          return { rows: [] };
        }
        const result = sqlDb.exec(sqlQuery, params as SQLiteBindParams);
        if (!result.length) return { rows: [] };
        const cols = result[0].columns;
        const vals = result[0].values;
        return {
          rows: vals.map(row =>
            cols.reduce((obj, col, idx) => ({ ...obj, [col]: row[idx] }), {})
          )
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
            sqlDb.run(sql, params as SQLiteBindParams);
            return { rows: [] };
          }
          const result = sqlDb.exec(sql, params as SQLiteBindParams);
          if (!result.length) return { rows: [] };
          const cols = result[0].columns;
          const vals = result[0].values;
          return {
            rows: vals.map(row =>
              cols.reduce((obj, col, idx) => ({ ...obj, [col]: row[idx] }), {})
            )
          };
        })();
        results.push(result);
      }
      return results;
    },
    { schema }
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
        .then(sqlDb => {
          if (!sqlDb) return reject(new Error("DB not initialized"));
          resolve(sqlDb.export());
        })
        .catch(err => reject(err));
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
async function seedInitialData(sqlDb: initSqlJs.Database): Promise<void> {
  // Check if game_versions table exists and has data
  const gameVersionsResult = sqlDb.exec("SELECT COUNT(*) as count FROM game_versions;");
  if (gameVersionsResult.length > 0 && gameVersionsResult[0].values[0][0] === 0) {
    // Seed initial game version
    sqlDb.run("INSERT INTO game_versions (version, display_name, notes) VALUES (?, ?, ?)",
      ["0.15", "Early Access 0.15", "Initial EA release"]);
  }

  // Check if card_pools is empty
  const cardPoolsResult = sqlDb.exec("SELECT COUNT(*) as count FROM card_pools;");
  if (cardPoolsResult.length > 0 && cardPoolsResult[0].values[0][0] === 0) {
    // Import card pools from data/card-pools-v0.15.json
    try {
      const cardPools = await import("~/data/card-pools-v0.15.json").then(m => m.default);
      for (const pool of cardPools.card_pools) {
        sqlDb.run(
          "INSERT INTO card_pools (card_id, character_id, is_starter, game_version) VALUES (?, ?, ?, ?)",
          [pool.card_id, pool.character_id, pool.is_starter ? 1 : 0, pool.game_version]
        );
      }
    } catch (error) {
      console.warn("Failed to seed initial card pools:", error);
    }
  }
}
