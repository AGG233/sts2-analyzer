CREATE TABLE `card_pools` (
	`card_id` text NOT NULL,
	`character_id` text DEFAULT '' NOT NULL,
	`is_starter` integer DEFAULT 0 NOT NULL,
	`game_version` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`card_id`, `character_id`, `game_version`),
	FOREIGN KEY (`game_version`) REFERENCES `game_versions`(`version`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_versions` (
	`version` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`added_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `run_floors` (
	`run_seed` text NOT NULL,
	`global_floor` integer NOT NULL,
	`act_index` integer NOT NULL,
	`local_floor` integer NOT NULL,
	`map_point_type` text DEFAULT '' NOT NULL,
	`player_stats_json` text DEFAULT '[]' NOT NULL,
	`rooms_json` text DEFAULT '[]' NOT NULL,
	PRIMARY KEY(`run_seed`, `global_floor`),
	FOREIGN KEY (`run_seed`) REFERENCES `runs`(`seed`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `run_players` (
	`run_seed` text NOT NULL,
	`player_index` integer NOT NULL,
	`player_id` integer DEFAULT 0 NOT NULL,
	`character_id` text NOT NULL,
	`deck_json` text DEFAULT '[]' NOT NULL,
	`relics_json` text DEFAULT '[]' NOT NULL,
	`potions_json` text DEFAULT '[]' NOT NULL,
	`max_potion_slot_count` integer DEFAULT 3 NOT NULL,
	PRIMARY KEY(`run_seed`, `player_index`),
	FOREIGN KEY (`run_seed`) REFERENCES `runs`(`seed`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`seed` text PRIMARY KEY NOT NULL,
	`game_version` text DEFAULT '' NOT NULL,
	`player_count` integer DEFAULT 1 NOT NULL,
	`character_id` text NOT NULL,
	`ascension` integer DEFAULT 0 NOT NULL,
	`win` integer DEFAULT 0 NOT NULL,
	`was_abandoned` integer DEFAULT 0 NOT NULL,
	`build_id` text,
	`game_mode` text DEFAULT 'standard' NOT NULL,
	`platform_type` text DEFAULT '' NOT NULL,
	`killed_by_encounter` text DEFAULT '' NOT NULL,
	`killed_by_event` text DEFAULT '' NOT NULL,
	`start_time` integer DEFAULT 0 NOT NULL,
	`run_time` integer DEFAULT 0 NOT NULL,
	`total_floors` integer DEFAULT 0 NOT NULL,
	`game_schema_version` integer DEFAULT 0 NOT NULL,
	`raw_json` text NOT NULL,
	`file_timestamp` integer DEFAULT 0 NOT NULL,
	`imported_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`game_version`) REFERENCES `game_versions`(`version`) ON UPDATE no action ON DELETE no action
);
