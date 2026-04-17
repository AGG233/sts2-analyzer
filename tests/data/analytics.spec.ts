import { describe, it, expect } from "vitest";
import {
	getCardPickRate,
	getCardPickRateByCharacter,
	type CardPickRateOptions,
} from "../../app/data/analytics";

describe("Analytics functions", () => {
	describe("getCardPickRate", () => {
		it("should be a function", () => {
			expect(typeof getCardPickRate).toBe("function");
		});

		it("should return empty array when given empty runs", () => {
			const result = getCardPickRate([], {});
			expect(result).toEqual([]);
		});

		it("should accept CardPickRateOptions", () => {
			const options: CardPickRateOptions = {
				deduplicate: false,
				floorMin: undefined,
				floorMax: undefined,
			};
			const result = getCardPickRate([], options);
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("getCardPickRateByCharacter", () => {
		it("should be a function", () => {
			expect(typeof getCardPickRateByCharacter).toBe("function");
		});

		it("should return empty array when given empty runs", () => {
			const result = getCardPickRateByCharacter([], "ironclad");
			expect(result).toEqual([]);
		});
	});
});
