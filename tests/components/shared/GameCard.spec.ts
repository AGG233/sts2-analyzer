import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import GameCard from "~/components/shared/GameCard.vue";
import GameDescription from "~/components/shared/GameDescription.vue";

describe("GameCard", () => {
	function mountCard(props: Record<string, unknown>) {
		return mount(GameCard, {
			props: {
				cardId: "CARD.bash",
				name: "Bash",
				cost: 2,
				type: "Attack",
				rarity: "Basic",
				characterId: "ironclad",
				upgraded: false,
				...props,
			},
		});
	}

	it("renders card name and cost", () => {
		const wrapper = mountCard({});
		expect(wrapper.text()).toContain("Bash");
		expect(wrapper.text()).toContain("2");
	});

	it("shows upgraded title color when upgraded", () => {
		const wrapper = mountCard({ upgraded: true });
		expect(wrapper.find(".card-title.upgraded").exists()).toBe(true);
	});

	it("shows count badge when count > 1", () => {
		const wrapper = mountCard({ count: 3 });
		expect(wrapper.find(".card-count").exists()).toBe(true);
		expect(wrapper.text()).toContain("x3");
	});

	it("hides count badge when count is undefined", () => {
		const wrapper = mountCard({});
		expect(wrapper.find(".card-count").exists()).toBe(false);
	});

	it("hides count badge when count is 1", () => {
		const wrapper = mountCard({ count: 1 });
		expect(wrapper.find(".card-count").exists()).toBe(false);
	});

	it("shows description when provided", () => {
		const wrapper = mountCard({
			descriptionSegments: [{ type: "text", value: "Deal damage" }],
		});
		expect(wrapper.find(".card-desc-area").exists()).toBe(true);
	});

	it("hides description when not provided", () => {
		const wrapper = mountCard({});
		expect(wrapper.find(".card-desc-area").exists()).toBe(false);
	});

	it("displays card type", () => {
		const wrapper = mountCard({ type: "Skill" });
		expect(wrapper.find(".card-type").text()).toBe("Skill");
	});

	it("strips CARD. prefix for portrait path", () => {
		const wrapper = mountCard({ cardId: "CARD.strike" });
		const img = wrapper.find(".card-portrait");
		expect(img.attributes("src")).toContain("strike");
	});

	it("uses default filter for unknown rarity", () => {
		const wrapper = mountCard({ rarity: "Unknown" });
		expect(wrapper.find(".card-banner").exists()).toBe(true);
	});
});
