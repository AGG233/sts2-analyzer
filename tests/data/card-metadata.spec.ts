import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	CARD_TYPE_CONFIG,
	CHARACTER_FRAME_COLORS,
	clearMetadataCache,
	getAllCardMetadata,
	getCardMetadata,
	RARITY_CONFIG,
} from "~/data/card-metadata";

describe("card-metadata", () => {
	beforeEach(() => {
		clearMetadataCache();
	});

	function createMockDb(rows: unknown[]) {
		return {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue(rows),
					}),
				}),
			}),
		} as unknown as Parameters<typeof getCardMetadata>[0];
	}

	function createMockDbAll(rows: unknown[]) {
		return {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockResolvedValue(rows),
			}),
		} as unknown as Parameters<typeof getAllCardMetadata>[0];
	}

	function mockRow(overrides: Record<string, unknown> = {}) {
		return {
			cardId: "bash",
			cost: 2,
			type: "Attack",
			rarity: "Basic",
			target: "enemy",
			tagsJson: '["strike"]',
			characterId: "ironclad",
			isStarter: 1,
			...overrides,
		};
	}

	describe("getCardMetadata", () => {
		it("queries DB and returns metadata entry", async () => {
			const db = createMockDb([mockRow()]);
			const result = await getCardMetadata(db, "CARD.bash");

			expect(result).toBeDefined();
			expect(result?.cost).toBe(2);
			expect(result?.type).toBe("Attack");
			expect(result?.tags).toEqual(["strike"]);
			expect(result?.character_id).toBe("ironclad");
			expect(result?.is_starter).toBe(true);
		});

		it("caches result and returns on second call", async () => {
			const db = createMockDb([mockRow()]);
			await getCardMetadata(db, "CARD.bash");
			await getCardMetadata(db, "CARD.bash");

			expect(db.select).toHaveBeenCalledOnce();
		});

		it("strips CARD. prefix from id", async () => {
			const db = createMockDb([mockRow()]);
			await getCardMetadata(db, "CARD.bash");
			expect(db.select).toHaveBeenCalled();
		});

		it("returns undefined when card not found", async () => {
			const db = createMockDb([]);
			const result = await getCardMetadata(db, "CARD.unknown");

			expect(result).toBeUndefined();
		});

		it("handles missing characterId", async () => {
			const db = createMockDb([mockRow({ characterId: "" })]);
			const result = await getCardMetadata(db, "CARD.bash");

			expect(result?.character_id).toBeUndefined();
		});

		it("handles non-starter card", async () => {
			const db = createMockDb([mockRow({ isStarter: 0 })]);
			const result = await getCardMetadata(db, "CARD.bash");

			expect(result?.is_starter).toBeUndefined();
		});
	});

	describe("getAllCardMetadata", () => {
		it("returns all metadata as a record", async () => {
			const db = createMockDbAll([
				mockRow({ cardId: "bash" }),
				mockRow({ cardId: "defend", type: "Skill" }),
			]);
			const result = await getAllCardMetadata(db);

			expect(Object.keys(result)).toHaveLength(2);
			expect(result.bash).toBeDefined();
			expect(result.defend).toBeDefined();
		});

		it("caches result", async () => {
			const db = createMockDbAll([mockRow()]);
			await getAllCardMetadata(db);
			await getAllCardMetadata(db);

			expect(db.select).toHaveBeenCalledOnce();
		});
	});

	describe("config objects", () => {
		it("CARD_TYPE_CONFIG has expected entries", () => {
			expect(CARD_TYPE_CONFIG.Attack).toBeDefined();
			expect(CARD_TYPE_CONFIG.Skill).toBeDefined();
			expect(CARD_TYPE_CONFIG.Power).toBeDefined();
		});

		it("RARITY_CONFIG has expected entries", () => {
			expect(RARITY_CONFIG.Common).toBeDefined();
			expect(RARITY_CONFIG.Rare).toBeDefined();
		});

		it("CHARACTER_FRAME_COLORS has expected entries", () => {
			expect(CHARACTER_FRAME_COLORS.ironclad).toBeDefined();
			expect(CHARACTER_FRAME_COLORS.silent).toBeDefined();
		});
	});
});
