import { describe, expect, it, vi } from "vitest";
import type { RunFile } from "~/data/types";

function createMockRun(
	seed: string,
	character = "CHARACTER.IRONCLAD",
): RunFile {
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
		acts: ["ACT.OVERGROWTH"],
		ascension: 0,
		build_id: "test-build-0.15",
		game_mode: "standard",
		killed_by_encounter: "NONE.NONE",
		killed_by_event: "",
		map_point_history: [],
		modifiers: [],
		platform_type: "steam",
		run_time: 60,
		schema_version: 9,
		start_time: 1000,
		was_abandoned: false,
		win: false,
	};
}

vi.mock("~/lib/storage.client", () => ({
	loadRuns: vi.fn().mockResolvedValue([]),
}));

vi.mock("~/lib/db.client", () => ({
	getDB: vi.fn().mockReturnValue({
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockResolvedValue([]),
		}),
	}),
}));

vi.mock("~/db/schema", () => ({
	runs: {},
}));

vi.mock("~/repositories/runRepository", () => ({
	upsertRunsInRepository: vi.fn().mockResolvedValue(undefined),
}));

const { needsMigration, migrateRunsFromIndexedDB, checkAndMigrate } =
	await import("~/lib/migrate");
const { loadRuns } = await import("~/lib/storage.client");
const { getDB } = await import("~/lib/db.client");
const { upsertRunsInRepository } = await import("~/repositories/runRepository");

describe("Migration Utilities", () => {
	describe("needsMigration", () => {
		it("returns false when IndexedDB has no data", async () => {
			vi.mocked(loadRuns).mockResolvedValue([]);
			expect(await needsMigration()).toBe(false);
		});

		it("returns false when SQLite already has data", async () => {
			vi.mocked(loadRuns).mockResolvedValue([createMockRun("a")]);
			vi.mocked(getDB).mockReturnValue({
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([{ seed: "a" }]),
				}),
			});
			expect(await needsMigration()).toBe(false);
		});

		it("returns true when IndexedDB has data but SQLite is empty", async () => {
			vi.mocked(loadRuns).mockResolvedValue([createMockRun("a")]);
			vi.mocked(getDB).mockReturnValue({
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

		it("persists runs through the shared repository path", async () => {
			vi.mocked(loadRuns).mockResolvedValue([
				createMockRun("seed-a"),
				createMockRun("seed-b"),
			]);

			const count = await migrateRunsFromIndexedDB();

			expect(count).toBe(2);
			expect(upsertRunsInRepository).toHaveBeenCalledTimes(1);
			expect(upsertRunsInRepository).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						run: expect.objectContaining({ seed: "seed-a" }),
					}),
					expect.objectContaining({
						run: expect.objectContaining({ seed: "seed-b" }),
					}),
				]),
				{ saveStrategy: "immediate" },
			);
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
