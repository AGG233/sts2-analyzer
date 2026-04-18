import { describe, expect, it, vi } from "vitest";

function createMockRun(seed: string, character = "CHARACTER.IRONCLAD") {
	return {
		seed,
		players: [
			{
				id: 0,
				character,
				deck: [],
				relics: [],
				potions: [],
				max_potion_slot_count: 3,
			},
		],
		ascension: 0,
		win: false,
		was_abandoned: false,
		build_id: "test",
		killed_by_encounter: "NONE.NONE",
		killed_by_event: "",
		start_time: 1000,
		run_time: 60,
		map_point_history: [],
		acts: ["act1"],
	} as any;
}

// Top-level mocks (vi.mock is hoisted)
vi.mock("~/lib/storage.client", () => ({
	loadRuns: vi.fn().mockResolvedValue([]),
}));

vi.mock("~/lib/db.client", () => ({
	getDB: vi.fn().mockResolvedValue({
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockResolvedValue([]),
		}),
	}),
	saveDB: vi.fn().mockResolvedValue(new Uint8Array()),
}));

vi.mock("~/db/schema", () => ({
	runs: {},
}));

const { needsMigration, migrateRunsFromIndexedDB, checkAndMigrate } =
	await import("~/lib/migrate");
const { loadRuns } = await import("~/lib/storage.client");
const { getDB } = await import("~/lib/db.client");

describe("Migration Utilities", () => {
	describe("needsMigration", () => {
		it("returns false when IndexedDB has no data", async () => {
			vi.mocked(loadRuns).mockResolvedValue([]);
			expect(await needsMigration()).toBe(false);
		});

		it("returns false when SQLite already has data", async () => {
			vi.mocked(loadRuns).mockResolvedValue([createMockRun("a")]);
			vi.mocked(getDB).mockResolvedValue({
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([{ seed: "a" }]),
				}),
			});
			expect(await needsMigration()).toBe(false);
		});

		it("returns true when IndexedDB has data but SQLite is empty", async () => {
			vi.mocked(loadRuns).mockResolvedValue([createMockRun("a")]);
			vi.mocked(getDB).mockResolvedValue({
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([]),
				}),
			});
			expect(await needsMigration()).toBe(true);
		});

		it("returns false when DB throws (not initialized)", async () => {
			vi.mocked(loadRuns).mockRejectedValue(new Error("Not available"));
			expect(await needsMigration()).toBe(false);
		});
	});

	describe("migrateRunsFromIndexedDB", () => {
		it("returns 0 when IndexedDB has no runs", async () => {
			vi.mocked(loadRuns).mockResolvedValue([]);
			expect(await migrateRunsFromIndexedDB()).toBe(0);
		});

		it("inserts runs from IndexedDB into SQLite", async () => {
			const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
			const values = vi.fn().mockReturnValue({ onConflictDoNothing });
			const insert = vi.fn().mockReturnValue({ values });
			vi.mocked(loadRuns).mockResolvedValue([
				createMockRun("seed-a"),
				createMockRun("seed-b"),
			]);
			vi.mocked(getDB).mockResolvedValue({ insert });
			const count = await migrateRunsFromIndexedDB();
			expect(count).toBe(2);
			expect(insert).toHaveBeenCalledTimes(2);
			expect(onConflictDoNothing).toHaveBeenCalledTimes(2);
		});

		it("throws and logs error when migration fails", async () => {
			vi.mocked(loadRuns).mockRejectedValue(new Error("Read error"));
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			await expect(migrateRunsFromIndexedDB()).rejects.toThrow("Read error");
			expect(consoleSpy).toHaveBeenCalledWith(
				"Migration failed:",
				expect.any(Error),
			);
			consoleSpy.mockRestore();
		});
	});

	describe("checkAndMigrate", () => {
		it("returns 0 when not in client environment", async () => {
			expect(await checkAndMigrate()).toBe(0);
		});
	});
});
