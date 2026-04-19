CREATE TABLE `run_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
CREATE TABLE `run_floors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
ALTER TABLE `runs` ADD COLUMN `player_count` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `runs` ADD COLUMN `platform_type` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `runs` ADD COLUMN `game_schema_version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `runs` ADD COLUMN `file_timestamp` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_runs_start_time` ON `runs`(`start_time`);
--> statement-breakpoint
DROP TABLE IF EXISTS `card_choices`;
