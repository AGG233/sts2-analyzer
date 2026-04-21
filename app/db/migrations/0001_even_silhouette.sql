CREATE TABLE `card_metadata` (
	`card_id` text NOT NULL,
	`game_version` text NOT NULL,
	`cost` integer NOT NULL,
	`type` text NOT NULL,
	`rarity` text NOT NULL,
	`target` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`character_id` text DEFAULT '' NOT NULL,
	`is_starter` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`card_id`, `game_version`),
	FOREIGN KEY (`game_version`) REFERENCES `game_versions`(`version`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `card_vars` (
	`entity_id` text NOT NULL,
	`entity_type` text DEFAULT 'card' NOT NULL,
	`game_version` text NOT NULL,
	`data_json` text NOT NULL,
	PRIMARY KEY(`entity_id`, `entity_type`, `game_version`),
	FOREIGN KEY (`game_version`) REFERENCES `game_versions`(`version`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `game_versions` ADD `build_number` integer DEFAULT 0 NOT NULL;