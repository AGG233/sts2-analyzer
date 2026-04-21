import { describe, expect, it } from "vitest";
import {
	getBannerPath,
	getBorderPath,
	getEnergyPath,
	getFramePath,
	getPortraitPath,
} from "~/data/card-assets";

describe("card-assets", () => {
	describe("getPortraitPath", () => {
		it("returns path with character-specific filename for Strike", () => {
			const path = getPortraitPath("ironclad", "Strike");
			expect(path).toContain("strike_ironclad.png");
		});

		it("returns path with character-specific filename for Defend", () => {
			const path = getPortraitPath("ironclad", "Defend");
			expect(path).toContain("defend_ironclad.png");
		});

		it("returns path with bare id for non-basic cards", () => {
			const path = getPortraitPath("silent", "Backstab");
			expect(path).toContain("backstab.png");
		});

		it("converts card id to lowercase", () => {
			const path = getPortraitPath("ironclad", "BASH");
			expect(path).toContain("bash.png");
		});
	});

	describe("getFramePath", () => {
		it("maps Attack to attack frame", () => {
			expect(getFramePath("Attack")).toContain("attack.png");
		});

		it("maps Skill to skill frame", () => {
			expect(getFramePath("Skill")).toContain("skill.png");
		});

		it("maps Power to power frame", () => {
			expect(getFramePath("Power")).toContain("power.png");
		});

		it("falls back to attack for unknown types", () => {
			expect(getFramePath("Unknown")).toContain("attack.png");
		});
	});

	describe("getEnergyPath", () => {
		it("returns character-specific energy icon path", () => {
			expect(getEnergyPath("ironclad")).toContain("ironclad.png");
		});
	});

	describe("getBorderPath", () => {
		it("maps Attack to attack border", () => {
			expect(getBorderPath("Attack")).toContain("attack.png");
		});

		it("maps Status to plaque border", () => {
			expect(getBorderPath("Status")).toContain("plaque.png");
		});

		it("falls back to plaque for unknown types", () => {
			expect(getBorderPath("Unknown")).toContain("plaque.png");
		});
	});

	describe("getBannerPath", () => {
		it("returns ancient banner for Ancient rarity", () => {
			expect(getBannerPath("Ancient")).toContain("ancient_banner.png");
		});

		it("returns standard banner for other rarities", () => {
			expect(getBannerPath("Rare")).toContain("banner.png");
			expect(getBannerPath("Common")).toContain("banner.png");
		});
	});
});
