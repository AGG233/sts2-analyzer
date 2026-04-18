import type { FloorPlayerStats, RunFile } from "../../../app/data/types";

export function createFloorStats(
	overrides: Partial<FloorPlayerStats> = {},
): FloorPlayerStats {
	return {
		player_id: 1000,
		current_hp: 80,
		max_hp: 80,
		hp_healed: 0,
		damage_taken: 0,
		max_hp_gained: 0,
		max_hp_lost: 0,
		current_gold: 99,
		gold_gained: 0,
		gold_lost: 0,
		gold_spent: 0,
		gold_stolen: 0,
		...overrides,
	};
}

export function createRun(overrides: Partial<RunFile> = {}): RunFile {
	return {
		acts: ["ACT.OVERGROWTH"],
		ascension: 0,
		build_id: "test-build",
		game_mode: "standard",
		killed_by_encounter: "NONE.NONE",
		killed_by_event: "",
		map_point_history: [
			[
				{
					map_point_type: "monster",
					player_stats: [createFloorStats()],
					rooms: [],
				},
			],
		],
		modifiers: [],
		platform_type: "steam",
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
		run_time: 120,
		schema_version: 8,
		seed: "seed-1",
		start_time: 1,
		was_abandoned: false,
		win: false,
		...overrides,
	};
}
