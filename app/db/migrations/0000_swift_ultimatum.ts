// Migrations are exported as string constants so they can be imported
// by db.client.ts without Vite ?raw plugin issues.
// DO NOT put SQL with backticks or template literal syntax here
// without proper escaping — prefer single-quoted strings.

export const migration0000 = `CREATE TABLE IF NOT EXISTS card_choices (
	id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	run_seed text NOT NULL,
	character_id text NOT NULL,
	card_id text NOT NULL,
	was_picked integer DEFAULT 0 NOT NULL,
	floor_number integer NOT NULL,
	FOREIGN KEY (run_seed) REFERENCES runs(seed) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS card_pools (
	card_id text NOT NULL,
	character_id text DEFAULT '' NOT NULL,
	is_starter integer DEFAULT 0 NOT NULL,
	game_version text DEFAULT '' NOT NULL,
	PRIMARY KEY(card_id, character_id, game_version),
	FOREIGN KEY (game_version) REFERENCES game_versions(version) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS game_versions (
	version text PRIMARY KEY NOT NULL,
	display_name text DEFAULT '' NOT NULL,
	added_at text DEFAULT 'datetime(''now'')' NOT NULL,
	notes text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS runs (
	seed text PRIMARY KEY NOT NULL,
	game_version text DEFAULT '' NOT NULL,
	character_id text NOT NULL,
	ascension integer DEFAULT 0 NOT NULL,
	win integer DEFAULT 0 NOT NULL,
	was_abandoned integer DEFAULT 0 NOT NULL,
	build_id text,
	game_mode text DEFAULT 'standard' NOT NULL,
	killed_by_encounter text DEFAULT '' NOT NULL,
	killed_by_event text DEFAULT '' NOT NULL,
	start_time integer DEFAULT 0 NOT NULL,
	run_time integer DEFAULT 0 NOT NULL,
	total_floors integer DEFAULT 0 NOT NULL,
	raw_json text NOT NULL,
	imported_at text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (game_version) REFERENCES game_versions(version) ON UPDATE no action ON DELETE no action
);`;
