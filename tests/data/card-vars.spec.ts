import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearCardVarCache,
	getCardVarData,
	getRelicVarData,
} from "~/data/card-vars";

describe("card-vars", () => {
	beforeEach(() => {
		clearCardVarCache();
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
		} as unknown as Parameters<typeof getCardVarData>[0];
	}

	function mockRow(overrides: Record<string, unknown> = {}) {
		return {
			entityId: "bash",
			entityType: "card",
			dataJson: JSON.stringify({
				vars: [{ name: "Damage", type: "int", base_value: 8 }],
				upgrades: { Damage: 2 },
			}),
			...overrides,
		};
	}

	describe("getCardVarData", () => {
		it("queries DB and returns parsed var entry", async () => {
			const db = createMockDb([mockRow()]);
			const result = await getCardVarData(db, "CARD.bash");

			expect(result).toBeDefined();
			expect(result?.vars).toHaveLength(1);
			expect(result?.vars[0].name).toBe("Damage");
			expect(result?.upgrades.Damage).toBe(2);
		});

		it("caches result and returns on second call", async () => {
			const db = createMockDb([mockRow()]);
			await getCardVarData(db, "CARD.bash");
			await getCardVarData(db, "CARD.bash");

			expect(db.select).toHaveBeenCalledOnce();
		});

		it("strips CARD. prefix from id", async () => {
			const db = createMockDb([mockRow()]);
			await getCardVarData(db, "CARD.bash");
			expect(db.select).toHaveBeenCalled();
		});

		it("returns undefined when card not found", async () => {
			const db = createMockDb([]);
			const result = await getCardVarData(db, "CARD.unknown");

			expect(result).toBeUndefined();
		});
	});

	describe("getRelicVarData", () => {
		it("queries DB and returns parsed relic var entry", async () => {
			const db = createMockDb([
				mockRow({
					entityId: "burning_blood",
					entityType: "relic",
					dataJson: JSON.stringify({
						vars: [{ name: "Heal", type: "int", base_value: 6 }],
						upgrades: {},
					}),
				}),
			]);
			const result = await getRelicVarData(db, "RELIC.burning_blood");

			expect(result).toBeDefined();
			expect(result?.vars[0].name).toBe("Heal");
		});

		it("strips RELIC. prefix from id", async () => {
			const db = createMockDb([
				mockRow({ entityId: "burning_blood", entityType: "relic" }),
			]);
			await getRelicVarData(db, "RELIC.burning_blood");
			expect(db.select).toHaveBeenCalled();
		});

		it("caches result", async () => {
			const db = createMockDb([
				mockRow({ entityId: "r", entityType: "relic" }),
			]);
			await getRelicVarData(db, "RELIC.r");
			await getRelicVarData(db, "RELIC.r");

			expect(db.select).toHaveBeenCalledOnce();
		});

		it("returns undefined when relic not found", async () => {
			const db = createMockDb([]);
			const result = await getRelicVarData(db, "RELIC.unknown");

			expect(result).toBeUndefined();
		});
	});
});
