import { describe, expect, it } from "vitest";
import {
	getEncounterStats,
	getGoldTimeline,
	getHpTimeline,
} from "../../../app/data/analytics/timelines";
import { createFloorStats, createRun } from "./helpers";

describe("Timelines", () => {
	describe("getHpTimeline", () => {
		it("returns HP data points for each floor", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									current_hp: 70,
									max_hp: 80,
									damage_taken: 10,
								}),
							],
							rooms: [],
						},
						{
							map_point_type: "rest",
							player_stats: [
								createFloorStats({ current_hp: 80, max_hp: 80, hp_healed: 10 }),
							],
							rooms: [],
						},
					],
				],
			});

			const timeline = getHpTimeline(run);
			expect(timeline).toHaveLength(2);
			expect(timeline[0]).toEqual({
				floor: 1,
				hp: 70,
				maxHp: 80,
				damageTaken: 10,
				hpHealed: 0,
				playerIndex: 0,
			});
			expect(timeline[1]).toEqual({
				floor: 2,
				hp: 80,
				maxHp: 80,
				damageTaken: 0,
				hpHealed: 10,
				playerIndex: 0,
			});
		});

		it("matches per-player HP by stable player id", () => {
			const run = createRun({
				players: [
					{
						id: 101,
						character: "CHARACTER.IRONCLAD",
						deck: [{ id: "STRIKE", floor_added_to_deck: 1 }],
						relics: [],
						potions: [],
						max_potion_slot_count: 3,
					},
					{
						id: 202,
						character: "CHARACTER.SILENT",
						deck: [{ id: "NEUTRALIZE", floor_added_to_deck: 1 }],
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
								createFloorStats({ player_id: 202, current_hp: 66 }),
								createFloorStats({ player_id: 101, current_hp: 77 }),
							],
							rooms: [],
						},
					],
				],
			});

			expect(getHpTimeline(run, 0)[0]?.hp).toBe(77);
			expect(getHpTimeline(run, 1)[0]?.hp).toBe(66);
		});
	});

	describe("getGoldTimeline", () => {
		it("returns gold data points for each floor", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									current_gold: 120,
									gold_gained: 30,
									gold_spent: 0,
								}),
							],
							rooms: [],
						},
						{
							map_point_type: "shop",
							player_stats: [
								createFloorStats({
									current_gold: 50,
									gold_gained: 0,
									gold_spent: 70,
								}),
							],
							rooms: [],
						},
					],
				],
			});

			const timeline = getGoldTimeline(run);
			expect(timeline).toHaveLength(2);
			expect(timeline[0]).toEqual({
				floor: 1,
				gold: 120,
				gained: 30,
				spent: 0,
				lost: 0,
				stolen: 0,
				playerIndex: 0,
			});
			expect(timeline[1]).toEqual({
				floor: 2,
				gold: 50,
				gained: 0,
				spent: 70,
				lost: 0,
				stolen: 0,
				playerIndex: 0,
			});
		});
	});

	describe("getEncounterStats", () => {
		it("returns encounter records for monster floors with rooms", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [createFloorStats({ damage_taken: 15 })],
							rooms: [
								{
									model_id: "ENCOUNTER.JAW_WORM",
									room_type: "monster",
									monster_ids: ["MONSTER.JAW_WORM"],
									turns_taken: 3,
								},
							],
						},
						{
							map_point_type: "shop",
							player_stats: [createFloorStats()],
							rooms: [],
						},
						{
							map_point_type: "monster",
							player_stats: [createFloorStats({ damage_taken: 8 })],
							rooms: [
								{
									model_id: "ENCOUNTER.TWO_LIZARDS",
									room_type: "elite",
									monster_ids: ["MONSTER.LIZARD_A", "MONSTER.LIZARD_B"],
									turns_taken: 5,
								},
							],
						},
					],
				],
			});

			const encounters = getEncounterStats(run);
			expect(encounters).toHaveLength(2);
			expect(encounters[0]).toEqual({
				floor: 1,
				encounter: "ENCOUNTER.JAW_WORM",
				monsters: ["MONSTER.JAW_WORM"],
				roomType: "monster",
				turns: 3,
				damageTaken: 15,
				playerIndex: 0,
			});
			expect(encounters[1]).toEqual({
				floor: 3,
				encounter: "ENCOUNTER.TWO_LIZARDS",
				monsters: ["MONSTER.LIZARD_A", "MONSTER.LIZARD_B"],
				roomType: "elite",
				turns: 5,
				damageTaken: 8,
				playerIndex: 0,
			});
		});

		it("skips floors without rooms", () => {
			const run = createRun();
			expect(getEncounterStats(run)).toHaveLength(0);
		});
	});
});
