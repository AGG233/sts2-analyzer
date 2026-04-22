import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeckRelicsSection from "~/components/run-detail/DeckRelicsSection.vue";
import AppTag from "~/components/shared/AppTag.vue";
import GameCard from "~/components/shared/GameCard.vue";

vi.mock("vue-i18n", () => ({
	useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("~/locales/lookup", () => ({
	useGameI18n: () => ({
		cardName: (id: string) => id,
		cardDescription: () => "Deal {Damage:diff()} damage.",
		relicName: (id: string) => id,
	}),
}));

vi.mock("~/lib/db.client", () => ({
	initDB: vi.fn(() => Promise.resolve()),
	getDB: vi.fn(() => ({})),
}));

vi.mock("~/data/card-metadata", () => ({
	getCardMetadata: vi.fn(() =>
		Promise.resolve({
			cost: 2,
			type: "Attack",
			rarity: "Common",
			character_id: "ironclad",
		}),
	),
	CHARACTER_FRAME_COLORS: {
		ironclad: "#e74c3c",
		silent: "#2ecc71",
		defect: "#3498db",
		regent: "#e67e22",
		necrobinder: "#e91e90",
		colorless: "#95a5a6",
	},
}));

vi.mock("~/data/card-vars", () => ({
	getCardVarData: vi.fn(() =>
		Promise.resolve({
			vars: [{ name: "Damage", type: "int", base_value: 8 }],
			upgrades: { Damage: 2 },
		}),
	),
}));

vi.mock("~/lib/template-renderer", () => ({
	renderSegments: vi.fn(() => [
		{ type: "text", value: "Deal " },
		{ type: "variable", name: "Damage", value: 8, upgraded: false },
		{ type: "text", value: " damage." },
	]),
}));

describe("DeckRelicsSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function mountSection(props: Record<string, unknown> = {}) {
		return mount(DeckRelicsSection, {
			props: {
				deck: [
					{ id: "CARD.bash", upgradeLevel: 0 },
					{ id: "CARD.bash", upgradeLevel: 0 },
					{ id: "CARD.strike", upgradeLevel: 1 },
				],
				relics: [{ id: "RELIC.burning_blood", floor_added_to_deck: 1 }],
				hoveredFloor: null,
				...props,
			},
			global: {
				components: { GameCard, AppTag },
			},
		});
	}

	it("renders deck cards grouped by id and upgrade level", async () => {
		const wrapper = mountSection();
		await vi.waitFor(() => wrapper.findAllComponents(GameCard).length > 0);

		const cards = wrapper.findAllComponents(GameCard);
		expect(cards.length).toBe(2); // bash x2 grouped, strike upgraded
	});

	it("passes description segments to GameCard", async () => {
		const wrapper = mountSection();
		await vi.waitFor(() => wrapper.findAllComponents(GameCard).length > 0);

		const card = wrapper.findComponent(GameCard);
		expect(card.props("descriptionSegments")).toBeDefined();
		expect(card.props("descriptionSegments")).toHaveLength(3);
	});

	it("passes count prop when card appears multiple times", async () => {
		const wrapper = mountSection();
		await vi.waitFor(() => wrapper.findAllComponents(GameCard).length > 0);

		const cards = wrapper.findAllComponents(GameCard);
		const bashCard = cards.find((c) => c.props("cardId") === "CARD.bash");
		expect(bashCard?.props("count")).toBe(2);
	});

	it("shows relic tags", async () => {
		const wrapper = mountSection();
		await vi.waitFor(() => wrapper.findAllComponents(AppTag).length > 0);

		const tags = wrapper.findAllComponents(AppTag);
		expect(tags.length).toBeGreaterThan(0);
	});

	it("shows hoveredFloor label when provided", async () => {
		const wrapper = mountSection({ hoveredFloor: 5 });
		await vi.waitFor(() => wrapper.text().includes("F5"));

		expect(wrapper.text()).toContain("F5");
	});

	it("shows final deck label when no hoveredFloor", async () => {
		const wrapper = mountSection();
		await vi.waitFor(() => wrapper.text().includes("run.finalDeck"));

		expect(wrapper.text()).toContain("run.finalDeck");
	});
});
