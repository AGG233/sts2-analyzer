import { describe, expect, it } from "vitest";
import { getRelicsAtFloor } from "../../../app/data/analytics/relic-history";
import { createFloorStats, createRun } from "./helpers";

describe("Relic History", () => {
	it("restores removed relics when reading earlier floors", () => {
		const run = createRun({
			map_point_history: [
				[
					{
						map_point_type: "monster",
						player_stats: [
							createFloorStats({
								bought_relics: ["ANCHOR"],
							}),
						],
						rooms: [],
					},
					{
						map_point_type: "monster",
						player_stats: [
							createFloorStats({
								relics_removed: ["ANCHOR"],
							}),
						],
						rooms: [],
					},
				],
			],
			players: [
				{
					id: 0,
					character: "CHARACTER.IRONCLAD",
					deck: [
						{ id: "STRIKE", floor_added_to_deck: 1 },
						{ id: "DEFEND", floor_added_to_deck: 1 },
					],
					relics: [{ id: "BURNING_BLOOD", floor_added_to_deck: 1 }],
					potions: [],
					max_potion_slot_count: 3,
				},
			],
		});

		expect(
			getRelicsAtFloor(run, 1)
				.map((r) => r.id)
				.sort(),
		).toEqual(["ANCHOR", "BURNING_BLOOD"]);
		expect(getRelicsAtFloor(run, 2).map((r) => r.id)).toEqual([
			"BURNING_BLOOD",
		]);
	});

	it("handles relic gained via relic_choices", () => {
		const run = createRun({
			map_point_history: [
				[
					{
						map_point_type: "boss",
						player_stats: [
							createFloorStats({
								relic_choices: [
									{ choice: "BLACK_BLOOD", was_picked: true },
									{ choice: "RUBY_RING", was_picked: false },
								],
							}),
						],
						rooms: [],
					},
				],
			],
			players: [
				{
					id: 0,
					character: "CHARACTER.IRONCLAD",
					deck: [
						{ id: "STRIKE", floor_added_to_deck: 1 },
						{ id: "DEFEND", floor_added_to_deck: 1 },
					],
					relics: [
						{ id: "BURNING_BLOOD", floor_added_to_deck: 1 },
						{ id: "BLACK_BLOOD", floor_added_to_deck: 1 },
					],
					potions: [],
					max_potion_slot_count: 3,
				},
			],
		});

		expect(
			getRelicsAtFloor(run, 1)
				.map((r) => r.id)
				.sort(),
		).toEqual(["BLACK_BLOOD", "BURNING_BLOOD"]);
	});

	it("returns empty for non-existent player", () => {
		const run = createRun();
		expect(getRelicsAtFloor(run, 0, 99)).toEqual([]);
	});

	it("preserves floor_added_to_deck from final relics", () => {
		const run = createRun({
			players: [
				{
					id: 0,
					character: "CHARACTER.IRONCLAD",
					deck: [{ id: "STRIKE", floor_added_to_deck: 1 }],
					relics: [
						{ id: "BURNING_BLOOD", floor_added_to_deck: 1 },
						{ id: "ANCHOR", floor_added_to_deck: 5 },
					],
					potions: [],
					max_potion_slot_count: 3,
				},
			],
			map_point_history: [],
		});

		const relics = getRelicsAtFloor(run, 0);
		expect(relics.find((r) => r.id === "ANCHOR")?.floor_added_to_deck).toBe(5);
	});
});
