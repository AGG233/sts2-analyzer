// =============================================================================
// Slay the Spire 2 — Save Data Type Definitions
// =============================================================================

// ---- Enums / Union Types ----

export type ActId = "ACT.OVERGROWTH" | "ACT.HIVE" | "ACT.GLORY";

export type MapPointType =
	| "monster"
	| "elite"
	| "boss"
	| "event"
	| "shop"
	| "treasure"
	| "rest_site"
	| "ancient"
	| "unknown";

export type RoomType =
	| "monster"
	| "elite"
	| "boss"
	| "event"
	| "shop"
	| "treasure"
	| "rest_site";

// ---- Known character IDs (used as narrowed type) ----
export type KnownCharacterId =
	| "CHARACTER.IRONCLAD"
	| "CHARACTER.SILENT"
	| "CHARACTER.REGENT"
	| "CHARACTER.NECROBINDER"
	| "CHARACTER.DEFECT";

// Forward-compatible character ID: known IDs + arbitrary string
// eslint-disable-next-line typescript:S6571
export type CharacterId = KnownCharacterId | (string & {});

// eslint-disable-next-line typescript:S6571
export type GameMode = "standard" | (string & {});

// eslint-disable-next-line typescript:S6571
export type PlatformType = "steam" | (string & {});

// eslint-disable-next-line typescript:S6571
export type RestSiteChoice = KnownRestSiteChoice | (string & {});
export type KnownRestSiteChoice = "HEAL" | "UPGRADE" | "DIG" | "LIFT" | "RECALL";

// ---- Card ----

export interface DeckCard {
	id: string;
	floor_added_to_deck?: number;
	current_upgrade_level?: number;
	enchantment?: {
		id: string;
		amount: number;
	};
}

export interface CardChoice {
	card: { id: string; floor_added_to_deck?: number };
	was_picked: boolean;
}

export interface CardGained {
	id: string;
	floor_added_to_deck?: number;
	current_upgrade_level?: number;
}

export interface CardTransformed {
	original_card: { id: string; floor_added_to_deck?: number };
	final_card: { id: string; floor_added_to_deck?: number };
}

// ---- Relic ----

export interface RelicProp {
	name: string;
	value: unknown;
}

export interface Relic {
	id: string;
	floor_added_to_deck?: number;
	props?: {
		bools?: { name: string; value: boolean }[];
		ints?: { name: string; value: number }[];
		cards?: {
			name: string;
			value: {
				id: string;
				floor_added_to_deck?: number;
				current_upgrade_level?: number;
			};
		}[];
	};
}

export interface RelicChoice {
	choice: string;
	was_picked: boolean;
}

// ---- Potion ----

export interface Potion {
	id: string;
	slot_index?: number;
}

export interface PotionChoice {
	choice: string;
	was_picked: boolean;
}

// ---- Event ----

export interface EventChoice {
	title: {
		key: string;
		table: string;
	};
	variables?: Record<
		string,
		{
			type: string;
			decimal_value?: number;
			bool_value?: boolean;
			string_value?: string;
		}
	>;
}

export interface AncientChoice {
	TextKey: string;
	title: { key: string; table: string };
	was_chosen: boolean;
}

// ---- Room / Encounter ----

export interface Room {
	model_id?: string;
	monster_ids?: string[];
	room_type: RoomType;
	turns_taken: number;
}

// ---- Floor Player Stats ----

export interface FloorPlayerStats {
	player_id: number;
	current_hp: number;
	max_hp: number;
	hp_healed: number;
	damage_taken: number;
	max_hp_gained: number;
	max_hp_lost: number;
	current_gold: number;
	gold_gained: number;
	gold_lost: number;
	gold_spent: number;
	gold_stolen: number;
	card_choices?: CardChoice[];
	cards_gained?: CardGained[];
	cards_transformed?: CardTransformed[];
	event_choices?: EventChoice[];
	relic_choices?: RelicChoice[];
	potion_choices?: PotionChoice[];
	potion_used?: string[];
	rest_site_choices?: RestSiteChoice[];
	upgraded_cards?: string[];
	ancient_choice?: AncientChoice[];
	cards_removed?: { id: string; floor_added_to_deck?: number }[];
	cards_enchanted?: {
		card: { id: string; floor_added_to_deck?: number };
		enchantment: string;
	}[];
	downgraded_cards?: string[];
	bought_colorless?: string[];
	bought_potions?: string[];
	bought_relics?: string[];
	potion_discarded?: string[];
	relics_removed?: string[];
	completed_quests?: string[];
}

// ---- Map Point (single floor) ----

export interface MapPoint {
	map_point_type: MapPointType;
	player_stats: FloorPlayerStats[];
	rooms: Room[];
}

// ---- Player (final state) ----

export interface Player {
	id: number;
	character: CharacterId;
	deck: DeckCard[];
	relics: Relic[];
	potions: Potion[];
	max_potion_slot_count: number;
}

// ---- Run File (.run) ----

export interface RunFile {
	acts: ActId[];
	ascension: number;
	build_id: string;
	game_mode: GameMode;
	killed_by_encounter: string;
	killed_by_event: string;
	map_point_history: MapPoint[][]; // [act][floor]
	modifiers: unknown[];
	platform_type: PlatformType;
	players: Player[];
	run_time: number;
	schema_version: number;
	seed: string;
	start_time: number;
	was_abandoned: boolean;
	win: boolean;
}

// ---- Progress File (progress.save) ----

export interface AncientCharacterStat {
	character: CharacterId;
	wins: number;
	losses: number;
}

export interface AncientStat {
	ancient_id: string;
	character_stats: AncientCharacterStat[];
}

export interface ProgressFile {
	ancient_stats: AncientStat[];
	schema_version: number;
	[key: string]: unknown; // other stats fields
}

// ---- Prefs File (prefs.save) ----

export interface PrefsFile {
	fast_mode: string;
	long_press: boolean;
	mute_in_background: boolean;
	schema_version: number;
	screenshake: number;
	show_card_indices: boolean;
	show_run_timer: boolean;
	text_effects_enabled: boolean;
	upload_data: boolean;
}

// ---- Settings File (settings.save) ----

export interface ControllerMapping {
	[action: string]: string;
}

export interface KeyboardMapping {
	[action: string]: string;
}

export interface ModEntry {
	id: string;
	is_enabled: boolean;
	source: string;
}

export interface ModSettings {
	mods_enabled: boolean;
	mod_list: ModEntry[];
}

export interface WindowPosition {
	X: number;
	Y: number;
}

export interface WindowSize {
	X: number;
	Y: number;
}

export interface SettingsFile {
	aspect_ratio: string;
	controller_mapping: ControllerMapping;
	controller_mapping_type: string;
	fps_limit: number;
	fullscreen: boolean;
	keyboard_mapping: KeyboardMapping;
	language: string;
	limit_fps_in_background: boolean;
	mod_settings: ModSettings;
	msaa: number;
	resize_windows: boolean;
	schema_version: number;
	seen_ea_disclaimer: boolean;
	skip_intro_logo: boolean;
	target_display: number;
	volume_ambience: number;
	volume_bgm: number;
	volume_master: number;
	volume_sfx: number;
	vsync: string;
	window_position: WindowPosition;
	window_size: WindowSize;
}
