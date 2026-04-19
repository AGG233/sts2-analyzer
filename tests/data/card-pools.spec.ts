import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock drizzle-orm and db.client to avoid sql.js WASM loading
vi.mock("~/db/schema", () => ({
	cardPools: {
		cardId: "card_id",
		characterId: "character_id",
		gameVersion: "game_version",
	},
}));

vi.mock("~/lib/db.client", () => ({}));

// Must import AFTER mocks are set up
const {
	clearCardPoolCache,
	getCharacterCardIds,
	isCharacterCard,
	isColorlessCard,
	isCrossCharacterCard,
	isCurseOrStatus,
} = await import("~/data/card-pools");

import type { DrizzleDB } from "~/lib/db.client";

function createMockDb(cardData: Record<string, string[]>): DrizzleDB {
	return {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi
					.fn()
					.mockResolvedValue(
						Object.entries(cardData).flatMap(([characterId, cardIds]) =>
							cardIds.map((cardId) => ({ cardId, characterId })),
						),
					),
			}),
		}),
	} as unknown as DrizzleDB;
}

describe("Card Pools", () => {
	beforeEach(() => {
		clearCardPoolCache();
	});

	describe("getCharacterCardIds", () => {
		it("queries and caches card IDs for a character", async () => {
			const db = createMockDb({
				ironclad: ["STRIKE_IRONCLAD", "BASH", "ANGER"],
			});
			const result = await getCharacterCardIds(db, "ironclad");
			expect(result).toEqual(["STRIKE_IRONCLAD", "BASH", "ANGER"]);
			expect(db.select).toHaveBeenCalledTimes(1);
		});

		it("returns cached result on second call without querying DB", async () => {
			const db = createMockDb({ ironclad: ["STRIKE_IRONCLAD"] });
			await getCharacterCardIds(db, "ironclad");
			await getCharacterCardIds(db, "ironclad");
			expect(db.select).toHaveBeenCalledTimes(1);
		});

		it("uses latest cache key when version is undefined", async () => {
			const db = createMockDb({ silent: ["BACKSTAB"] });
			await getCharacterCardIds(db, "silent");
			await getCharacterCardIds(db, "silent", undefined);
			expect(db.select).toHaveBeenCalledTimes(1);
		});

		it("separates cache entries for different versions", async () => {
			const db = createMockDb({
				ironclad: ["STRIKE_IRONCLAD", "BASH"],
			});
			const v1 = await getCharacterCardIds(db, "ironclad", "0.14");
			const v2 = await getCharacterCardIds(db, "ironclad", "0.15");
			expect(v1).toEqual(["STRIKE_IRONCLAD", "BASH"]);
			expect(v2).toEqual(["STRIKE_IRONCLAD", "BASH"]);
			expect(db.select).toHaveBeenCalledTimes(2);
		});

		it("returns empty array for character with no cards", async () => {
			const db = createMockDb({});
			const result = await getCharacterCardIds(db, "nonexistent");
			expect(result).toEqual([]);
		});

		it("normalizes CHARACTER.IRONCLAD to ironclad for DB lookup", async () => {
			const db = createMockDb({
				ironclad: ["STRIKE_IRONCLAD", "BASH"],
			});
			const result = await getCharacterCardIds(db, "CHARACTER.IRONCLAD");
			expect(result).toEqual(["STRIKE_IRONCLAD", "BASH"]);
		});
	});

	describe("isCharacterCard", () => {
		it("returns true for a card in the character's pool", async () => {
			const db = createMockDb({ ironclad: ["BASH", "ANGER"] });
			expect(await isCharacterCard(db, "BASH", "ironclad")).toBe(true);
			expect(await isCharacterCard(db, "ANGER", "ironclad")).toBe(true);
		});

		it("returns false for a card not in the character's pool", async () => {
			const db = createMockDb({ ironclad: ["BASH"] });
			expect(await isCharacterCard(db, "DEFEND", "ironclad")).toBe(false);
		});

		it("loads cache lazily when not pre-populated", async () => {
			const db = createMockDb({ ironclad: ["BASH"] });
			await isCharacterCard(db, "BASH", "ironclad");
			await isCharacterCard(db, "BASH", "ironclad");
			expect(db.select).toHaveBeenCalledTimes(1);
		});
	});

	describe("isColorlessCard", () => {
		it("returns true for a colorless card", async () => {
			const db = createMockDb({ colorless: ["METALLICIZE", "HANDS_UP"] });
			expect(await isColorlessCard(db, "METALLICIZE")).toBe(true);
		});

		it("returns false for a non-colorless card", async () => {
			const db = createMockDb({ colorless: ["METALLICIZE"] });
			expect(await isColorlessCard(db, "BASH")).toBe(false);
		});
	});

	describe("isCurseOrStatus", () => {
		it("returns true for a curse card", async () => {
			const db = createMockDb({ curse: ["DECAY", "DOOM"] });
			expect(await isCurseOrStatus(db, "DECAY")).toBe(true);
		});

		it("returns true for a status card", async () => {
			const db = createMockDb({ status: ["BURN", "ENTANGLED"] });
			expect(await isCurseOrStatus(db, "BURN")).toBe(true);
		});

		it("returns false for a card that is neither curse nor status", async () => {
			const db = createMockDb({ curse: ["DECAY"], status: ["BURN"] });
			expect(await isCurseOrStatus(db, "BASH")).toBe(false);
		});
	});

	describe("isCrossCharacterCard", () => {
		it("returns true for a card from another character's pool", async () => {
			const db = createMockDb({
				ironclad: ["BASH"],
				colorless: ["METALLICIZE"],
				curse: ["DECAY"],
				status: ["BURN"],
			});
			expect(await isCrossCharacterCard(db, "BACKSTAB", "ironclad")).toBe(true);
		});

		it("returns false for a card in the character's own pool", async () => {
			const db = createMockDb({
				ironclad: ["BASH"],
				colorless: [],
				curse: [],
				status: [],
			});
			expect(await isCrossCharacterCard(db, "BASH", "ironclad")).toBe(false);
		});

		it("returns false for a colorless card", async () => {
			const db = createMockDb({
				ironclad: [],
				colorless: ["METALLICIZE"],
				curse: [],
				status: [],
			});
			expect(await isCrossCharacterCard(db, "METALLICIZE", "ironclad")).toBe(
				false,
			);
		});

		it("returns false for a curse card", async () => {
			const db = createMockDb({
				ironclad: [],
				colorless: [],
				curse: ["DECAY"],
				status: [],
			});
			expect(await isCrossCharacterCard(db, "DECAY", "ironclad")).toBe(false);
		});

		it("returns false for a status card", async () => {
			const db = createMockDb({
				ironclad: [],
				colorless: [],
				curse: [],
				status: ["BURN"],
			});
			expect(await isCrossCharacterCard(db, "BURN", "ironclad")).toBe(false);
		});
	});

	describe("clearCardPoolCache", () => {
		it("clears all cached data so next call queries DB again", async () => {
			const db = createMockDb({ ironclad: ["BASH"] });
			await getCharacterCardIds(db, "ironclad");
			expect(db.select).toHaveBeenCalledTimes(1);

			clearCardPoolCache();

			await getCharacterCardIds(db, "ironclad");
			expect(db.select).toHaveBeenCalledTimes(2);
		});
	});
});
