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
});
