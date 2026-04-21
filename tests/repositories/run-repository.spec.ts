import { beforeEach, describe, expect, it, vi } from "vitest";
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
				deck: [
					{
						id: "CARD.STRIKE",
						floor_added_to_deck: 0,
						current_upgrade_level: 0,
					},
				],
				relics: [{ id: "RELIC.BURNING_BLOOD", counter: -1 }],
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
		map_point_history: [
			[
				{
					map_point_type: "MAP_POINT_TYPE.MONSTER",
					player_stats: [{ hp: 80, max_hp: 80, gold: 99 }],
					rooms: [],
				},
			],
		],
		modifiers: [],
		platform_type: "steam",
		run_time: 60,
		schema_version: 9,
		start_time: 1000,
		was_abandoned: false,
		win: false,
	};
}

// 模拟事务执行器
function createMockTransaction() {
	const executed: Array<{ sql: string; params?: unknown[] }> = [];
	const mockTx = {
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				onConflictDoUpdate: vi.fn().mockReturnValue({
					target: vi.fn(),
					set: vi.fn(),
				}),
				onConflictDoNothing: vi.fn().mockReturnValue({
					target: vi.fn(),
				}),
			}),
		}),
		delete: vi.fn().mockReturnValue({
			from: vi.fn().mockResolvedValue(undefined),
		}),
		transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
			await fn(mockTx);
		}),
	};
	return { mockTx, executed };
}

vi.mock("~/lib/db.client", () => ({
	getDB: vi.fn(),
	initDB: vi.fn().mockResolvedValue(undefined),
	saveDB: vi.fn().mockResolvedValue(new Uint8Array([1])),
	scheduleSave: vi.fn(),
}));

vi.mock("~/data/analytics/floors", () => ({
	getTotalFloorCount: vi.fn(() => 1),
}));

vi.mock("~/db/schema", () => ({
	runs: {
		seed: "seed",
		sourcePath: "sourcePath",
		fileTimestamp: "fileTimestamp",
	},
	runPlayers: {
		runSeed: "runSeed",
		playerIndex: "playerIndex",
	},
	runFloors: {
		runSeed: "runSeed",
		globalFloor: "globalFloor",
	},
}));

const { getDB } = await import("~/lib/db.client");
const {
	clearRunsInRepository,
	getRunImportMetadataMap,
	loadAllRunsFromRepository,
	loadRunBySeedFromRepository,
	upsertRunsInRepository,
} = await import("~/repositories/runRepository");

describe("runRepository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("loadAllRunsFromRepository", () => {
		it("从 rawJson 列反序列化所有 RunFile", async () => {
			const run = createMockRun("seed-a");
			vi.mocked(getDB).mockReturnValue({
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([{ rawJson: JSON.stringify(run) }]),
				}),
			} as unknown as Awaited<ReturnType<typeof getDB>>);

			const runs = await loadAllRunsFromRepository();

			expect(runs).toHaveLength(1);
			expect(runs[0].seed).toBe("seed-a");
		});

		it("空数据库返回空数组", async () => {
			vi.mocked(getDB).mockReturnValue({
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([]),
				}),
			} as unknown as Awaited<ReturnType<typeof getDB>>);

			const runs = await loadAllRunsFromRepository();

			expect(runs).toEqual([]);
		});
	});

	describe("loadRunBySeedFromRepository", () => {
		it("按 seed 查找单个 RunFile", async () => {
			const run = createMockRun("target-seed");
			vi.mocked(getDB).mockReturnValue({
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi
							.fn()
							.mockResolvedValue([{ rawJson: JSON.stringify(run) }]),
					}),
				}),
			} as unknown as Awaited<ReturnType<typeof getDB>>);

			const found = await loadRunBySeedFromRepository("target-seed");

			expect(found).not.toBeNull();
			expect(found?.seed).toBe("target-seed");
		});

		it("不存在的 seed 返回 null", async () => {
			vi.mocked(getDB).mockReturnValue({
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as unknown as Awaited<ReturnType<typeof getDB>>);

			const found = await loadRunBySeedFromRepository("nonexistent");

			expect(found).toBeNull();
		});
	});

	describe("getRunImportMetadataMap", () => {
		it("返回 sourcePath → metadata 的映射", async () => {
			vi.mocked(getDB).mockReturnValue({
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([
						{ seed: "a", sourcePath: "path/a.run", fileTimestamp: 100 },
						{ seed: "b", sourcePath: "path/b.run", fileTimestamp: 200 },
						{ seed: "c", sourcePath: "", fileTimestamp: 0 },
					]),
				}),
			} as unknown as Awaited<ReturnType<typeof getDB>>);

			const map = await getRunImportMetadataMap();

			expect(map.size).toBe(2);
			expect(map.get("path/a.run")?.seed).toBe("a");
			expect(map.get("path/b.run")?.fileTimestamp).toBe(200);
			// 空路径的记录被过滤
			expect(map.has("")).toBe(false);
		});
	});

	describe("upsertRunsInRepository", () => {
		it("空输入不做任何操作", async () => {
			await upsertRunsInRepository([]);

			expect(getDB).not.toHaveBeenCalled();
		});

		it("使用 debounced 策略保存（默认）", async () => {
			const { scheduleSave } = await import("~/lib/db.client");

			const { mockTx } = createMockTransaction();
			vi.mocked(getDB).mockReturnValue({
				transaction: mockTx.transaction,
			} as unknown as Awaited<ReturnType<typeof getDB>>);

			await upsertRunsInRepository([{ run: createMockRun("test") }]);

			expect(scheduleSave).toHaveBeenCalledOnce();
		});

		it("使用 immediate 策略立即保存", async () => {
			const { saveDB } = await import("~/lib/db.client");

			const { mockTx } = createMockTransaction();
			vi.mocked(getDB).mockReturnValue({
				transaction: mockTx.transaction,
			} as unknown as Awaited<ReturnType<typeof getDB>>);

			await upsertRunsInRepository([{ run: createMockRun("test") }], {
				saveStrategy: "immediate",
			});

			expect(saveDB).toHaveBeenCalledOnce();
		});

		it("使用 none 策略不保存", async () => {
			const { saveDB, scheduleSave } = await import("~/lib/db.client");

			const { mockTx } = createMockTransaction();
			vi.mocked(getDB).mockReturnValue({
				transaction: mockTx.transaction,
			} as unknown as Awaited<ReturnType<typeof getDB>>);

			await upsertRunsInRepository([{ run: createMockRun("test") }], {
				saveStrategy: "none",
			});

			expect(saveDB).not.toHaveBeenCalled();
			expect(scheduleSave).not.toHaveBeenCalled();
		});
	});

	describe("clearRunsInRepository", () => {
		it("清空 runs 表并立即保存", async () => {
			const { saveDB } = await import("~/lib/db.client");
			vi.mocked(getDB).mockReturnValue({
				delete: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue(undefined),
				}),
			} as unknown as Awaited<ReturnType<typeof getDB>>);

			await clearRunsInRepository();

			expect(saveDB).toHaveBeenCalledOnce();
		});
	});
});
