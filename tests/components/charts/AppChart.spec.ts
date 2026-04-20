import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import AppChart from "~/components/charts/AppChart.client.vue";

vi.mock("vue-echarts", () => ({
	default: defineComponent({
		name: "MockVChart",
		props: {
			option: {
				type: Object,
				required: false,
				default: null,
			},
			autoresize: {
				type: Boolean,
				required: false,
				default: false,
			},
		},
		template: '<div class="mock-chart">{{ JSON.stringify(option) }}</div>',
	}),
}));

describe("AppChart", () => {
	it("renders nothing when option is empty", () => {
		const wrapper = mount(AppChart, {
			props: {
				option: null,
			},
		});

		expect(wrapper.find(".mock-chart").exists()).toBe(false);
	});

	it("lazily renders the chart component when option is provided", async () => {
		const wrapper = mount(AppChart, {
			props: {
				option: {
					series: [],
				},
			},
		});

		await flushPromises();

		expect(wrapper.find(".mock-chart").exists()).toBe(true);
		expect(wrapper.find(".mock-chart").text()).toContain('"series":[]');
	});
});
