import {
	int,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const gameVersions = sqliteTable("game_versions", {
	version: text("version").primaryKey(),
	displayName: text("display_name").notNull().default(""),
	addedAt: text("added_at").notNull().default("datetime('now')"),
	notes: text("notes").notNull().default(""),
});

export const cardPools = sqliteTable(
	"card_pools",
	{
		cardId: text("card_id").notNull(),
		characterId: text("character_id").notNull().default(""),
		isStarter: integer("is_starter").notNull().default(0),
		gameVersion: text("game_version")
			.notNull()
			.default("")
			.references(() => gameVersions.version),
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.cardId, table.characterId, table.gameVersion],
		}),
	}),
);

export const runs = sqliteTable("runs", {
	seed: text("seed").primaryKey(),
	gameVersion: text("game_version")
		.notNull()
		.default("")
		.references(() => gameVersions.version),
	playerCount: int("player_count").notNull().default(1),
	characterId: text("character_id").notNull(),
	ascension: int("ascension").notNull().default(0),
	win: int("win").notNull().default(0),
	wasAbandoned: int("was_abandoned").notNull().default(0),
	buildId: text("build_id"),
	gameMode: text("game_mode").notNull().default("standard"),
	platformType: text("platform_type").notNull().default(""),
	killedByEncounter: text("killed_by_encounter").notNull().default(""),
	killedByEvent: text("killed_by_event").notNull().default(""),
	startTime: int("start_time").notNull().default(0),
	runTime: int("run_time").notNull().default(0),
	totalFloors: int("total_floors").notNull().default(0),
	gameSchemaVersion: int("game_schema_version").notNull().default(0),
	rawJson: text("raw_json").notNull(),
	fileTimestamp: int("file_timestamp").notNull().default(0),
	importedAt: text("imported_at").notNull().default("datetime('now')"),
});

export const runPlayers = sqliteTable(
	"run_players",
	{
		runSeed: text("run_seed")
			.notNull()
			.references(() => runs.seed, { onDelete: "cascade" }),
		playerIndex: int("player_index").notNull(),
		playerId: int("player_id").notNull().default(0),
		characterId: text("character_id").notNull(),
		deckJson: text("deck_json").notNull().default("[]"),
		relicsJson: text("relics_json").notNull().default("[]"),
		potionsJson: text("potions_json").notNull().default("[]"),
		maxPotionSlotCount: int("max_potion_slot_count").notNull().default(3),
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.runSeed, table.playerIndex],
		}),
	}),
);

export const runFloors = sqliteTable(
	"run_floors",
	{
		runSeed: text("run_seed")
			.notNull()
			.references(() => runs.seed, { onDelete: "cascade" }),
		globalFloor: int("global_floor").notNull(),
		actIndex: int("act_index").notNull(),
		localFloor: int("local_floor").notNull(),
		mapPointType: text("map_point_type").notNull().default(""),
		playerStatsJson: text("player_stats_json").notNull().default("[]"),
		roomsJson: text("rooms_json").notNull().default("[]"),
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.runSeed, table.globalFloor],
		}),
	}),
);
