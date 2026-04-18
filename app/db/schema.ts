import { sqliteTable, text, int, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const gameVersions = sqliteTable('game_versions', {
  version: text('version').primaryKey(),
  displayName: text('display_name').notNull().default(''),
  addedAt: text('added_at').notNull().default("datetime('now')"),
  notes: text('notes').notNull().default(''),
})

export const cardPools = sqliteTable('card_pools', {
  cardId: text('card_id').notNull(),
  characterId: text('character_id').notNull().default(''),
  isStarter: integer('is_starter').notNull().default(0),
  gameVersion: text('game_version').notNull().default('').references(() => gameVersions.version),
}, (table) => ({
  pk: primaryKey({ columns: [table.cardId, table.characterId, table.gameVersion] }),
}))

export const runs = sqliteTable('runs', {
  seed: text('seed').primaryKey(),
  gameVersion: text('game_version').notNull().default('').references(() => gameVersions.version),
  characterId: text('character_id').notNull(),
  ascension: int('ascension').notNull().default(0),
  win: int('win').notNull().default(0),
  wasAbandoned: int('was_abandoned').notNull().default(0),
  buildId: text('build_id'),
  gameMode: text('game_mode').notNull().default('standard'),
  killedByEncounter: text('killed_by_encounter').notNull().default(''),
  killedByEvent: text('killed_by_event').notNull().default(''),
  startTime: int('start_time').notNull().default(0),
  runTime: int('run_time').notNull().default(0),
  totalFloors: int('total_floors').notNull().default(0),
  rawJson: text('raw_json').notNull(),
  importedAt: text('imported_at').notNull().default("datetime('now')"),
})

export const cardChoices = sqliteTable('card_choices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runSeed: text('run_seed').notNull().references(() => runs.seed),
  characterId: text('character_id').notNull(),
  cardId: text('card_id').notNull(),
  wasPicked: int('was_picked').notNull().default(0),
  floorNumber: int('floor_number').notNull(),
})
