import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockExport = vi.fn(() => new Uint8Array([1, 2, 3]));
const mockRun = vi.fn();
const mockExec = vi.fn(() => []);
const mockPrepare = vi.fn(() => ({
	run: vi.fn(),
	free: vi.fn(),
}));

class MockDatabase {
	export = mockExport;
	run = mockRun;
	exec = mockExec;
	prepare = mockPrepare;
}

const mockInitSqlJs = vi.fn(() => Promise.resolve({ Database: MockDatabase }));

vi.mock("sql.js", () => ({
	default: (...args: unknown[]) => mockInitSqlJs(...args),
}));

vi.mock("~/lib/storage.client", () => ({
	loadSqliteDB: vi.fn(() => Promise.resolve(null)),
	saveSqliteDB: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock("~/db/schema", () => ({}));

// 清除模块缓存，使每次 import 获得新的模块实例
beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

async function importDB() {
	return import("~/lib/db.client");
}

describe("db.client", () => {
	describe("initDB", () => {
		it("初始化 sql.js 并返回 Drizzle 实例", async () => {
			const db = await importDB();
			const instance = await db.initDB();

			expect(instance).toBeDefined();
			expect(mockInitSqlJs).toHaveBeenCalledWith({
				locateFile: expect.any(Function),
			});
		});

		it("复用已初始化的实例（单例）", async () => {
			const db = await importDB();
			const first = await db.initDB();
			const second = await db.initDB();

			expect(first).toBe(second);
			expect(mockInitSqlJs).toHaveBeenCalledOnce();
		});

		it("从 IndexedDB 恢复已有数据库", async () => {
			const { loadSqliteDB } = await import("~/lib/storage.client");
			const savedBuffer = new Uint8Array([4, 5, 6]);
			vi.mocked(loadSqliteDB).mockResolvedValue(savedBuffer);

			const db = await importDB();
			await db.initDB();

			expect(loadSqliteDB).toHaveBeenCalledOnce();
		});

		it("初始化失败时抛出错误", async () => {
			const db = await importDB();
			mockInitSqlJs.mockRejectedValueOnce(new Error("WASM 加载失败"));

			await expect(db.initDB()).rejects.toThrow("Failed to initialize SQL.js");
		});
	});

	describe("getDB", () => {
		it("未初始化时抛出错误", async () => {
			const db = await importDB();

			expect(() => db.getDB()).toThrow(
				"Database not initialized. Call initDB() first.",
			);
		});

		it("初始化后返回实例", async () => {
			const db = await importDB();
			await db.initDB();

			expect(db.getDB()).toBeDefined();
		});

		it("Drizzle run 查询触发 sql.js run 路径", async () => {
			const db = await importDB();
			await db.initDB();
			const drizzleDb = db.getDB() as unknown as {
				run: (query: string) => Promise<unknown>;
			};

			await drizzleDb.run("SELECT 1");

			expect(mockRun).toHaveBeenCalled();
		});

		it("Drizzle all 查询触发 exec 和 getExecRows", async () => {
			const db = await importDB();
			await db.initDB();
			const drizzleDb = db.getDB() as unknown as {
				all: (query: string) => Promise<unknown[]>;
			};

			mockExec.mockReturnValueOnce([{ values: [[1]] }]);
			const result = await drizzleDb.all("SELECT 1");

			expect(mockExec).toHaveBeenCalled();
			expect(result).toEqual([[1]]);
		});

		it("Drizzle 查询错误被捕获并记录到控制台", async () => {
			const db = await importDB();
			await db.initDB();
			const drizzleDb = db.getDB() as unknown as {
				run: (query: string) => Promise<unknown>;
			};

			mockRun.mockImplementationOnce(() => {
				throw new Error("SQL syntax error");
			});
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			await expect(drizzleDb.run("INVALID")).rejects.toThrow();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("SQL error"),
				expect.any(Error),
				expect.stringContaining("SQL:"),
				expect.anything(),
				expect.stringContaining("Params:"),
				expect.anything(),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("saveDB", () => {
		it("导出数据库并持久化", async () => {
			const db = await importDB();
			await db.initDB();

			const buffer = await db.saveDB();

			expect(mockExport).toHaveBeenCalledOnce();
			expect(buffer).toBeInstanceOf(Uint8Array);
		});

		it("未初始化时抛出错误", async () => {
			const db = await importDB();

			await expect(db.saveDB()).rejects.toThrow("DB not initialized");
		});
	});

	describe("scheduleSave", () => {
		it("延迟保存，避免频繁序列化", async () => {
			const db = await importDB();
			await db.initDB();

			db.scheduleSave(5000);

			// 立即调用 saveDB 应该还未执行
			expect(mockExport).not.toHaveBeenCalled();

			vi.advanceTimersByTime(5000);

			await vi.runAllTimersAsync();

			expect(mockExport).toHaveBeenCalledOnce();
		});

		it("多次调用只保留最后一次定时器", async () => {
			const db = await importDB();
			await db.initDB();

			db.scheduleSave(2000);
			db.scheduleSave(2000);
			db.scheduleSave(2000);

			vi.advanceTimersByTime(2000);
			await vi.runAllTimersAsync();

			expect(mockExport).toHaveBeenCalledOnce();
		});
	});

	describe("flushScheduledSave", () => {
		it("清除定时器并立即保存", async () => {
			const db = await importDB();
			await db.initDB();

			db.scheduleSave(10000);
			await db.flushScheduledSave();

			expect(mockExport).toHaveBeenCalledOnce();
		});

		it("无定时器时也执行保存", async () => {
			const db = await importDB();
			await db.initDB();

			await db.flushScheduledSave();

			expect(mockExport).toHaveBeenCalledOnce();
		});
	});

	describe("closeDB", () => {
		it("清除所有状态，允许重新初始化", async () => {
			const db = await importDB();
			await db.initDB();
			db.closeDB();

			expect(() => db.getDB()).toThrow("Database not initialized");

			// 重新初始化应创建新实例
			await db.initDB();
			expect(db.getDB()).toBeDefined();
		});

		it("清除未执行的定时保存", async () => {
			const db = await importDB();
			await db.initDB();

			db.scheduleSave(5000);
			db.closeDB();

			vi.advanceTimersByTime(10000);
			await vi.runAllTimersAsync();

			expect(mockExport).not.toHaveBeenCalled();
		});
	});

	describe("seedInitialData", () => {
		it("从 JSON 文件 seed 初始数据", async () => {
			const db = await importDB();

			// Mock exec to return empty tables for counts and user_version 0
			mockExec.mockImplementation((sql: string) => {
				if (sql.includes("PRAGMA user_version")) {
					return [{ values: [[0]] }];
				}
				if (sql.includes("COUNT(*)")) {
					return [{ values: [[0]] }];
				}
				return [];
			});

			// Mock fetch responses
			const originalFetch = globalThis.fetch;
			globalThis.fetch = vi.fn().mockImplementation((url: string) => {
				if (url.includes("card-pools")) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								version: "0.15",
								display_name: "EA 0.15",
								card_pools: [
									{
										card_id: "bash",
										character_id: "ironclad",
										is_starter: true,
										game_version: "0.15",
									},
								],
							}),
					});
				}
				if (url.includes("card-metadata")) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								version: "0.15",
								cards: {
									bash: {
										cost: 2,
										type: "Attack",
										rarity: "Basic",
										target: "enemy",
										tags: ["strike"],
									},
								},
							}),
					});
				}
				if (url.includes("card-vars")) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								version: "0.15",
								cards: {
									bash: {
										vars: [{ name: "Damage", type: "int", base_value: 8 }],
										upgrades: {},
									},
								},
								relics: {},
							}),
					});
				}
				return Promise.resolve({ ok: false, status: 404 });
			}) as unknown as typeof fetch;

			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			try {
				await db.initDB();
				expect(mockRun).toHaveBeenCalled();
				expect(mockPrepare).toHaveBeenCalled();
			} finally {
				globalThis.fetch = originalFetch;
				consoleSpy.mockRestore();
			}
		});

		it("seed 失败时回退到插入最小版本记录", async () => {
			const db = await importDB();

			mockExec.mockImplementation((sql: string) => {
				if (sql.includes("PRAGMA user_version")) {
					return [{ values: [[0]] }];
				}
				if (sql.includes("COUNT(*)")) {
					return [{ values: [[0]] }];
				}
				return [];
			});

			// Make fetch fail
			const originalFetch = globalThis.fetch;
			globalThis.fetch = vi
				.fn()
				.mockRejectedValue(
					new Error("Network error"),
				) as unknown as typeof fetch;

			try {
				await db.initDB();
				// Should have inserted fallback version
				expect(mockRun).toHaveBeenCalledWith(
					expect.stringContaining("INSERT INTO game_versions"),
					expect.arrayContaining(["0.15"]),
				);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it("所有表已有数据时跳过 seed", async () => {
			const db = await importDB();
			const fetchSpy = vi.fn();
			const originalFetch = globalThis.fetch;
			globalThis.fetch = fetchSpy as unknown as typeof fetch;

			mockExec.mockImplementation((sql: string) => {
				if (sql.includes("PRAGMA user_version")) {
					return [{ values: [[0]] }];
				}
				if (sql.includes("COUNT(*)")) {
					return [{ values: [[1]] }];
				}
				return [];
			});

			try {
				await db.initDB();
				expect(fetchSpy).not.toHaveBeenCalled();
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it("seed 包含遗物变量数据", async () => {
			const db = await importDB();

			mockExec.mockImplementation((sql: string) => {
				if (sql.includes("PRAGMA user_version")) {
					return [{ values: [[0]] }];
				}
				if (sql.includes("COUNT(*)")) {
					return [{ values: [[0]] }];
				}
				return [];
			});

			const originalFetch = globalThis.fetch;
			globalThis.fetch = vi.fn().mockImplementation((url: string) => {
				if (url.includes("card-pools")) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								version: "0.15",
								display_name: "EA 0.15",
								card_pools: [],
							}),
					});
				}
				if (url.includes("card-metadata")) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ version: "0.15", cards: {} }),
					});
				}
				if (url.includes("card-vars")) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								version: "0.15",
								cards: {},
								relics: {
									burning_blood: {
										vars: [
											{
												name: "Heal",
												type: "int",
												base_value: 6,
											},
										],
										upgrades: {},
									},
								},
							}),
					});
				}
				return Promise.resolve({ ok: false, status: 404 });
			}) as unknown as typeof fetch;

			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			try {
				await db.initDB();
				expect(mockPrepare).toHaveBeenCalled();
				// The relic should have been inserted
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("relic vars"),
				);
			} finally {
				globalThis.fetch = originalFetch;
				consoleSpy.mockRestore();
			}
		});
	});

	describe("runMigration", () => {
		it("跳过已存在的列/表迁移错误", async () => {
			const db = await importDB();

			// First exec call for user_version succeeds, migration fails with CREATE TABLE error
			let callCount = 0;
			mockExec.mockImplementation((sql: string) => {
				callCount++;
				if (sql.includes("PRAGMA user_version")) {
					return [{ values: [[0]] }];
				}
				if (sql.toUpperCase().includes("CREATE TABLE")) {
					throw new Error("table already exists");
				}
				return [];
			});

			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			try {
				await db.initDB();
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("Migration step skipped"),
					expect.any(String),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});

		it("非幂等迁移错误仍然抛出", async () => {
			const db = await importDB();

			mockExec.mockImplementation((sql: string) => {
				if (sql.includes("PRAGMA user_version")) {
					return [{ values: [[0]] }];
				}
				throw new Error("syntax error");
			});

			await expect(db.initDB()).rejects.toThrow("syntax error");
		});
	});

	describe("scheduleSave error handling", () => {
		it("保存失败时记录错误到控制台", async () => {
			const db = await importDB();

			// Reset exec to default success behavior
			mockExec.mockImplementation((sql: string) => {
				if (sql.includes("PRAGMA user_version")) {
					return [{ values: [[0]] }];
				}
				return [];
			});

			await db.initDB();

			mockExport.mockImplementationOnce(() => {
				throw new Error("Export failed");
			});

			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			db.scheduleSave(100);
			vi.advanceTimersByTime(100);
			await vi.runAllTimersAsync();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Failed to save DB"),
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("flush handler error", () => {
		it("页面退出时 flush 失败记录错误", async () => {
			const db = await importDB();

			// Reset exec to default success behavior
			mockExec.mockImplementation((sql: string) => {
				if (sql.includes("PRAGMA user_version")) {
					return [{ values: [[0]] }];
				}
				return [];
			});

			await db.initDB();

			mockExport.mockImplementationOnce(() => {
				throw new Error("Flush failed");
			});

			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			window.dispatchEvent(new Event("beforeunload"));
			await vi.runAllTimersAsync();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Failed to flush DB before page exit"),
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});
});
