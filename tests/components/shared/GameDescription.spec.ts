import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import GameDescription from "~/components/shared/GameDescription.vue";
import type { Segment } from "~/lib/template-renderer";

describe("GameDescription", () => {
	function mountWith(segments: Segment[]) {
		return mount(GameDescription, { props: { segments } });
	}

	it("renders text segments", () => {
		const wrapper = mountWith([{ type: "text", value: "Deal" }]);
		expect(wrapper.text()).toContain("Deal");
	});

	it("renders variable segments with value", () => {
		const wrapper = mountWith([
			{ type: "variable", name: "Damage", value: 8, upgraded: false },
		]);
		expect(wrapper.text()).toContain("8");
		expect(wrapper.find(".var-value").exists()).toBe(true);
	});

	it("applies upgraded class to upgraded variables", () => {
		const wrapper = mountWith([
			{ type: "variable", name: "Damage", value: 10, upgraded: true },
		]);
		expect(wrapper.find(".var-upgraded").exists()).toBe(true);
	});

	it("renders energy segments", () => {
		const wrapper = mountWith([{ type: "energy", value: 2 }]);
		expect(wrapper.text()).toContain("2");
		expect(wrapper.find(".energy-icon").exists()).toBe(true);
	});

	it("renders stars segments", () => {
		const wrapper = mountWith([{ type: "stars", value: 3 }]);
		expect(wrapper.text()).toContain("3");
		expect(wrapper.find(".star-icon").exists()).toBe(true);
	});

	it("renders color segments with nested children", () => {
		const wrapper = mountWith([
			{
				type: "color",
				tag: "gold",
				children: [{ type: "text", value: "Golden" }],
			},
		]);
		expect(wrapper.find(".bbcode-gold").exists()).toBe(true);
		expect(wrapper.text()).toContain("Golden");
	});

	it("renders blue color class", () => {
		const wrapper = mountWith([
			{
				type: "color",
				tag: "blue",
				children: [{ type: "text", value: "Blue" }],
			},
		]);
		expect(wrapper.find(".bbcode-blue").exists()).toBe(true);
	});

	it("renders bold segments with nested children", () => {
		const wrapper = mountWith([
			{
				type: "bold",
				children: [{ type: "text", value: "Bold" }],
			},
		]);
		expect(wrapper.find(".font-bold").exists()).toBe(true);
		expect(wrapper.text()).toContain("Bold");
	});

	it("renders mixed segments", () => {
		const wrapper = mountWith([
			{ type: "text", value: "Deal " },
			{ type: "variable", name: "Damage", value: 8, upgraded: false },
			{ type: "text", value: " damage." },
		]);
		expect(wrapper.text()).toContain("Deal 8 damage.");
	});

	it("renders nested color inside bold", () => {
		const wrapper = mountWith([
			{
				type: "bold",
				children: [
					{
						type: "color",
						tag: "red",
						children: [{ type: "text", value: "Nested" }],
					},
				],
			},
		]);
		expect(wrapper.find(".font-bold").exists()).toBe(true);
		expect(wrapper.find(".bbcode-red").exists()).toBe(true);
	});
});
