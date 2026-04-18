import { describe, expect, it } from "vitest";
import type { CardPickRateOptions } from "../../../app/data/analytics/aggregate";
import {
	getAscensionStats,
	getCardPickRate,
	getCardPickRateByCharacter,
	getDeathCauseStats,
	getFloorTypeDistribution,
	getRelicPickRate,
	getRunSummary,
	getWinRateByCharacter,
} from "../../../app/data/analytics/aggregate";
import { getTotalFloorCount } from "../../../app/data/analytics/floors";
import { createFloorStats, createRun } from "./helpers";

describe("Aggregate Analytics", () => {
	describe("getCardPickRate", () => {
		it("should return empty array when given empty runs", () => {
			expect(getCardPickRate([], {})).toEqual([]);
		});

		it("should accept CardPickRateOptions", () => {
			const options: CardPickRateOptions = {
				deduplicate: false,
				floorMin: undefined,
				floorMax: undefined,
			};
			expect(Array.isArray(getCardPickRate([], options))).toBe(true);
		});

		it("filters by floor range and supports per-run deduplication", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									card_choices: [
										{ card: { id: "BASH" }, was_picked: true },
										{ card: { id: "ANGER" }, was_picked: false },
									],
								}),
							],
							rooms: [],
						},
						{
							map_point_type: "shop",
							player_stats: [
								createFloorStats({
									card_choices: [
										{ card: { id: "BASH" }, was_picked: true },
										{ card: { id: "ANGER" }, was_picked: false },
									],
								}),
							],
							rooms: [],
						},
					],
				],
			});

			expect(getCardPickRate([run], { deduplicate: true })).toEqual([
				{ cardId: "BASH", picked: 1, skipped: 0, total: 1, pickRate: 1 },
				{ cardId: "ANGER", picked: 0, skipped: 1, total: 1, pickRate: 0 },
			]);

			expect(getCardPickRate([run], { floorMin: 2, floorMax: 2 })).toEqual([
				{ cardId: "BASH", picked: 1, skipped: 0, total: 1, pickRate: 1 },
				{ cardId: "ANGER", picked: 0, skipped: 1, total: 1, pickRate: 0 },
			]);
		});
	});

	describe("getCardPickRateByCharacter", () => {
		it("should return empty array when given empty runs", async () => {
			expect(await getCardPickRateByCharacter([], "ironclad")).toEqual([]);
		});

		it("only counts card choices from the matching character in a multi-player run", async () => {
			const run = createRun({
				players: [
					{
						id: 101,
						character: "CHARACTER.REGENT",
						deck: [],
						relics: [],
						potions: [],
						max_potion_slot_count: 3,
					},
					{
						id: 202,
						character: "CHARACTER.IRONCLAD",
						deck: [],
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
									player_id: 202,
									card_choices: [
										{ card: { id: "BASH" }, was_picked: true },
										{ card: { id: "ANGER" }, was_picked: true },
									],
								}),
								createFloorStats({
									player_id: 101,
									card_choices: [
										{ card: { id: "DEFEND" }, was_picked: true },
										{ card: { id: "OUTMANEUVER" }, was_picked: false },
									],
								}),
							],
							rooms: [],
						},
					],
				],
			});

			const regentStats = await getCardPickRateByCharacter([run], "CHARACTER.REGENT");
			expect(regentStats).toEqual([
				{ cardId: "DEFEND", picked: 1, skipped: 0, total: 1, pickRate: 1 },
				{ cardId: "OUTMANEUVER", picked: 0, skipped: 1, total: 1, pickRate: 0 },
			]);

			const ironcladStats = await getCardPickRateByCharacter([run], "CHARACTER.IRONCLAD");
			expect(ironcladStats).toEqual([
				{ cardId: "BASH", picked: 1, skipped: 0, total: 1, pickRate: 1 },
				{ cardId: "ANGER", picked: 1, skipped: 0, total: 1, pickRate: 1 },
			]);
		});

		it("finds character at non-zero player index", async () => {
			const run = createRun({
				players: [
					{
						id: 101,
						character: "CHARACTER.IRONCLAD",
						deck: [],
						relics: [],
						potions: [],
						max_potion_slot_count: 3,
					},
					{
						id: 202,
						character: "CHARACTER.SILENT",
						deck: [],
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
									card_choices: [
										{ card: { id: "BASH" }, was_picked: true },
									],
								}),
								createFloorStats({
									player_id: 202,
									card_choices: [
										{ card: { id: "BACKSTAB" }, was_picked: true },
									],
								}),
							],
							rooms: [],
						},
					],
				],
			});

			const silentStats = await getCardPickRateByCharacter([run], "CHARACTER.SILENT");
			expect(silentStats).toEqual([
				{ cardId: "BACKSTAB", picked: 1, skipped: 0, total: 1, pickRate: 1 },
			]);
		});

		it("skips runs where the character is not present", async () => {
			const ironcladRun = createRun({
				seed: "a",
				players: [
					{
						id: 0,
						character: "CHARACTER.IRONCLAD",
						deck: [],
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
									card_choices: [
										{ card: { id: "BASH" }, was_picked: true },
									],
								}),
							],
							rooms: [],
						},
					],
				],
			});

			const regentStats = await getCardPickRateByCharacter(
				[ironcladRun],
				"CHARACTER.REGENT",
			);
			expect(regentStats).toEqual([]);
		});
	});

	describe("getWinRateByCharacter", () => {
		it("computes win/loss rates per character", () => {
			const run1 = createRun({
				seed: "a",
				win: true,
				players: [
					{
						id: 0,
						character: "CHARACTER.IRONCLAD",
						deck: [],
						relics: [],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});
			const run2 = createRun({
				seed: "b",
				win: false,
				players: [
					{
						id: 0,
						character: "CHARACTER.IRONCLAD",
						deck: [],
						relics: [],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});
			const run3 = createRun({
				seed: "c",
				win: true,
				players: [
					{
						id: 0,
						character: "CHARACTER.IRONCLAD",
						deck: [],
						relics: [],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});
			const run4 = createRun({
				seed: "d",
				win: false,
				players: [
					{
						id: 0,
						character: "CHARACTER.SILENT",
						deck: [],
						relics: [],
						potions: [],
						max_potion_slot_count: 3,
					},
				],
			});

			const stats = getWinRateByCharacter([run1, run2, run3, run4]);
			const ironclad = stats.find((s) => s.character === "CHARACTER.IRONCLAD");
			expect(ironclad).toEqual({
				character: "CHARACTER.IRONCLAD",
				wins: 2,
				losses: 1,
				total: 3,
				winRate: 2 / 3,
			});
			const silent = stats.find((s) => s.character === "CHARACTER.SILENT");
			expect(silent).toEqual({
				character: "CHARACTER.SILENT",
				wins: 0,
				losses: 1,
				total: 1,
				winRate: 0,
			});
		});
	});

	describe("getDeathCauseStats", () => {
		it("aggregates death encounters", () => {
			const run1 = createRun({
				seed: "a",
				killed_by_encounter: "ENCOUNTER.BOSS",
			});
			const run2 = createRun({
				seed: "b",
				killed_by_encounter: "ENCOUNTER.BOSS",
			});
			const run3 = createRun({
				seed: "c",
				killed_by_encounter: "ENCOUNTER.ELITE",
			});
			const run4 = createRun({
				seed: "d",
				win: true,
				killed_by_encounter: "NONE.NONE",
			});

			expect(getDeathCauseStats([run1, run2, run3, run4])).toEqual([
				{ encounter: "ENCOUNTER.BOSS", count: 2 },
				{ encounter: "ENCOUNTER.ELITE", count: 1 },
			]);
		});
	});

	describe("getAscensionStats", () => {
		it("aggregates ascension levels", () => {
			const run1 = createRun({ seed: "a", ascension: 5, win: true });
			const run2 = createRun({ seed: "b", ascension: 5, win: false });
			const run3 = createRun({ seed: "c", ascension: 10, win: true });

			expect(getAscensionStats([run1, run2, run3])).toEqual([
				{ ascension: 5, wins: 1, losses: 1, total: 2 },
				{ ascension: 10, wins: 1, losses: 0, total: 1 },
			]);
		});
	});

	describe("getRelicPickRate", () => {
		it("aggregates relic pick rate across all player stats", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [
								createFloorStats({
									relic_choices: [
										{ choice: "ANCHOR", was_picked: true },
										{ choice: "BAG_OF_PREPARATION", was_picked: false },
									],
								}),
								createFloorStats({
									player_id: 2000,
									relic_choices: [
										{ choice: "ANCHOR", was_picked: false },
										{ choice: "LANTERN", was_picked: true },
									],
								}),
							],
							rooms: [],
						},
					],
				],
			});

			expect(getRelicPickRate([run])).toEqual([
				{ relicId: "ANCHOR", picked: 1, skipped: 1, total: 2, pickRate: 0.5 },
				{
					relicId: "BAG_OF_PREPARATION",
					picked: 0,
					skipped: 1,
					total: 1,
					pickRate: 0,
				},
				{ relicId: "LANTERN", picked: 1, skipped: 0, total: 1, pickRate: 1 },
			]);
		});
	});

	describe("getFloorTypeDistribution", () => {
		it("aggregates floor type distribution across runs", () => {
			const runA = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [createFloorStats()],
							rooms: [],
						},
						{
							map_point_type: "shop",
							player_stats: [createFloorStats()],
							rooms: [],
						},
					],
				],
			});
			const runB = createRun({
				seed: "seed-2",
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [createFloorStats()],
							rooms: [],
						},
						{
							map_point_type: "event",
							player_stats: [createFloorStats()],
							rooms: [],
						},
					],
				],
			});

			expect(getFloorTypeDistribution([runA, runB])).toEqual([
				{ type: "monster", count: 2 },
				{ type: "shop", count: 1 },
				{ type: "event", count: 1 },
			]);
		});
	});

	describe("getRunSummary", () => {
		it("reports total floors using map history instead of filtered timeline length", () => {
			const run = createRun({
				map_point_history: [
					[
						{
							map_point_type: "monster",
							player_stats: [createFloorStats()],
							rooms: [],
						},
						{
							map_point_type: "event",
							player_stats: [],
							rooms: [],
						},
						{
							map_point_type: "shop",
							player_stats: [createFloorStats()],
							rooms: [],
						},
					],
				],
			});

			expect(getRunSummary(run).totalFloors).toBe(3);
			expect(getTotalFloorCount(run)).toBe(3);
		});

		it("matches per-player floor stats by stable player id instead of array order", () => {
			const run = createRun({
				players: [
					{
						id: 101,
						character: "CHARACTER.IRONCLAD",
						deck: [{ id: "STRIKE", floor_added_to_deck: 1 }],
						relics: [{ id: "BURNING_BLOOD", floor_added_to_deck: 1 }],
						potions: [],
						max_potion_slot_count: 3,
					},
					{
						id: 202,
						character: "CHARACTER.SILENT",
						deck: [{ id: "NEUTRALIZE", floor_added_to_deck: 1 }],
						relics: [{ id: "RING_OF_THE_SNAKE", floor_added_to_deck: 1 }],
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
									player_id: 202,
									current_hp: 66,
									current_gold: 44,
								}),
								createFloorStats({
									player_id: 101,
									current_hp: 77,
									current_gold: 55,
								}),
							],
							rooms: [],
						},
					],
				],
			});

			const summary = getRunSummary(run);
			expect(summary.players.map((p) => p.playerId)).toEqual([101, 202]);
			expect(summary.players.map((p) => p.finalHp)).toEqual([77, 66]);
			expect(summary.finalGold).toBe(55);
		});
	});
});
