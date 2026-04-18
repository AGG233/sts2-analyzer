import { describe, expect, it } from "vitest";
import {
	getDeckAtFloor,
	getDeckEvolution,
	getDeckHistory,
} from "../../../app/data/analytics/deck-history";
import { createFloorStats, createRun } from "./helpers";

describe("Deck History", () => {
	describe("getDeckHistory", () => {
		it("reconstructs initial deck from final deck by undoing changes", () => {
			const run = createRun();
			const history = getDeckHistory(run);
			const initial = history.get(0);
			expect(initial?.map((c) => c.id).sort()).toEqual(["DEFEND", "STRIKE"]);
		});

		it("keeps starter cards in early floors even if removed later", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									cards_removed: [{ id: "STRIKE", floor_added_to_deck: 1 }],
								}),
							],
							rooms: [],
						},
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									cards_gained: [{ id: "BASH", floor_added_to_deck: 2 }],
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
							{ id: "DEFEND", floor_added_to_deck: 1 },
							{ id: "BASH", floor_added_to_deck: 2 },
						],
						relics: [{ id: "BURNING_BLOOD", floor_added_to_deck: 1 }],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});

			const history = getDeckHistory(run);
			expect(
				history
					.get(0)
					?.map((c) => c.id)
					.sort(),
			).toEqual(["DEFEND", "STRIKE"]);
			expect(
				history
					.get(1)
					?.map((c) => c.id)
					.sort(),
			).toEqual(["DEFEND"]);
			expect(
				history
					.get(2)
					?.map((c) => c.id)
					.sort(),
			).toEqual(["BASH", "DEFEND"]);
		});

		it("handles card transformations correctly", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "event",
							player_stats: [
								createFloorStats({
									cards_transformed: [
										{
											original_card: { id: "STRIKE", floor_added_to_deck: 1 },
											final_card: { id: "SMITE", floor_added_to_deck: 1 },
										},
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
							{ id: "SMITE", floor_added_to_deck: 1 },
							{ id: "DEFEND", floor_added_to_deck: 1 },
						],
						relics: [{ id: "BURNING_BLOOD", floor_added_to_deck: 1 }],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});

			const history = getDeckHistory(run);
			expect(
				history
					.get(0)
					?.map((c) => c.id)
					.sort(),
			).toEqual(["DEFEND", "STRIKE"]);
			expect(
				history
					.get(1)
					?.map((c) => c.id)
					.sort(),
			).toEqual(["DEFEND", "SMITE"]);
		});

		it("tracks upgrade level correctly across floors", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "rest",
							player_stats: [
								createFloorStats({
									upgraded_cards: ["STRIKE"],
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
							{
								id: "STRIKE",
								floor_added_to_deck: 1,
								current_upgrade_level: 1,
							},
							{ id: "DEFEND", floor_added_to_deck: 1 },
						],
						relics: [{ id: "BURNING_BLOOD", floor_added_to_deck: 1 }],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});

			const history = getDeckHistory(run);
			const strike0 = history.get(0)?.find((c) => c.id === "STRIKE");
			expect(strike0?.upgradeLevel).toBe(0);
			const strike1 = history.get(1)?.find((c) => c.id === "STRIKE");
			expect(strike1?.upgradeLevel).toBe(1);
		});

		it("handles downgraded cards", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									downgraded_cards: ["STRIKE"],
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
							{
								id: "STRIKE",
								floor_added_to_deck: 1,
								current_upgrade_level: 0,
							},
							{ id: "DEFEND", floor_added_to_deck: 1 },
						],
						relics: [{ id: "BURNING_BLOOD", floor_added_to_deck: 1 }],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});

			const history = getDeckHistory(run);
			const strike0 = history.get(0)?.find((c) => c.id === "STRIKE");
			expect(strike0?.upgradeLevel).toBe(1);
			const strike1 = history.get(1)?.find((c) => c.id === "STRIKE");
			expect(strike1?.upgradeLevel).toBe(0);
		});

		it("handles duplicate card ids with different floor_added_to_deck", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									cards_gained: [{ id: "STRIKE", floor_added_to_deck: 1 }],
								}),
							],
							rooms: [],
						},
						{
							map_point_type: "shop",
							player_stats: [
								createFloorStats({
									cards_removed: [{ id: "STRIKE", floor_added_to_deck: 2 }],
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

			const history = getDeckHistory(run);
			expect(history.get(0)?.length).toBe(2);
			expect(history.get(1)?.length).toBe(3);
			expect(history.get(2)?.length).toBe(2);
			expect(
				history
					.get(2)
					?.map((c) => c.id)
					.sort(),
			).toEqual(["DEFEND", "STRIKE"]);
		});

		it("keeps multi-player deck histories independent", () => {
			const run = createRun({
				players: [
					{
						id: 101,
						character: "CHARACTER.IRONCLAD",
						deck: [
							{ id: "STRIKE", floor_added_to_deck: 1 },
							{ id: "BASH", floor_added_to_deck: 1 },
						],
						relics: [],
						potions: [],
						max_potion_slot_count: 3,
					},
					{
						id: 202,
						character: "CHARACTER.SILENT",
						deck: [
							{ id: "NEUTRALIZE", floor_added_to_deck: 1 },
							{ id: "SLICE", floor_added_to_deck: 1 },
						],
						relics: [],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									player_id: 101,
									cards_gained: [
										{ id: "IRONCLAD_ONLY", floor_added_to_deck: 1 },
									],
								}),
								createFloorStats({
									player_id: 202,
									cards_gained: [{ id: "SILENT_ONLY", floor_added_to_deck: 1 }],
								}),
							],
							rooms: [],
						},
					],
				],
			});

			const history0 = getDeckHistory(run, 0);
			const history1 = getDeckHistory(run, 1);

			expect(
				history0
					.get(1)
					?.map((c) => c.id)
					.sort(),
			).toContain("IRONCLAD_ONLY");
			expect(
				history0
					.get(1)
					?.map((c) => c.id)
					.sort(),
			).not.toContain("SILENT_ONLY");
			expect(
				history1
					.get(1)
					?.map((c) => c.id)
					.sort(),
			).toContain("SILENT_ONLY");
			expect(
				history1
					.get(1)
					?.map((c) => c.id)
					.sort(),
			).not.toContain("IRONCLAD_ONLY");
		});
	});

	describe("getDeckAtFloor", () => {
		it("returns deck at specific floor", () => {
			const run = createRun();
			expect(
				getDeckAtFloor(run, 0)
					.map((c) => c.id)
					.sort(),
			).toEqual(["DEFEND", "STRIKE"]);
		});

		it("returns empty array for non-existent player", () => {
			const run = createRun();
			expect(getDeckAtFloor(run, 0, 99)).toEqual([]);
		});
	});

	describe("getDeckEvolution", () => {
		it("reports correct deck sizes across floors", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									cards_removed: [{ id: "STRIKE", floor_added_to_deck: 1 }],
								}),
							],
							rooms: [],
						},
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									cards_gained: [{ id: "BASH", floor_added_to_deck: 2 }],
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
							{ id: "DEFEND", floor_added_to_deck: 1 },
							{ id: "BASH", floor_added_to_deck: 2 },
						],
						relics: [{ id: "BURNING_BLOOD", floor_added_to_deck: 1 }],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});

			const evolution = getDeckEvolution(run);
			expect(evolution.map((e) => e.deckSize)).toEqual([1, 2]);
			expect(evolution[0]?.cardRemoved).toContain("STRIKE");
			expect(evolution[1]?.cardAdded).toContain("BASH");
		});

		it("does not treat upgrades as card additions or removals", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									upgraded_cards: ["STRIKE"],
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
							{
								id: "STRIKE",
								floor_added_to_deck: 1,
								current_upgrade_level: 1,
							},
							{ id: "DEFEND", floor_added_to_deck: 1 },
						],
						relics: [{ id: "BURNING_BLOOD", floor_added_to_deck: 1 }],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});

			expect(getDeckEvolution(run)).toEqual([
				{
					floor: 1,
					cardAdded: [],
					cardRemoved: [],
					deckSize: 2,
					playerIndex: 0,
				},
			]);
		});
	});
});
