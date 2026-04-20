import { eq } from "drizzle-orm";
import { getTotalFloorCount } from "~/data/analytics/floors";
import type { RunFile } from "~/data/types";
import * as schema from "~/db/schema";
import { getDB, initDB, saveDB, scheduleSave } from "~/lib/db.client";

export interface PersistedRunInput {
	run: RunFile;
	fileTimestamp?: number;
	sourcePath?: string;
	importedAt?: string;
}

export interface RunImportMetadata {
	seed: string;
	sourcePath: string;
	fileTimestamp: number;
}

type DB = Awaited<ReturnType<typeof initDB>>;

export async function loadAllRunsFromRepository(): Promise<RunFile[]> {
	await initDB();
	const db = getDB();
	const rows = (await db
		.select({ rawJson: schema.runs.rawJson })
		.from(schema.runs)) as {
		rawJson: string;
	}[];

	return rows.map((row) => JSON.parse(row.rawJson) as RunFile);
}

export async function loadRunBySeedFromRepository(
	seed: string,
): Promise<RunFile | null> {
	await initDB();
	const db = getDB();
	const rows = (await db
		.select({ rawJson: schema.runs.rawJson })
		.from(schema.runs)
		.where(eq(schema.runs.seed, seed))) as { rawJson: string }[];

	if (rows.length === 0) {
		return null;
	}

	const firstRow = rows[0];
	return firstRow ? (JSON.parse(firstRow.rawJson) as RunFile) : null;
}

export async function getRunImportMetadataMap(): Promise<
	Map<string, RunImportMetadata>
> {
	await initDB();
	const db = getDB();
	const rows = (await db
		.select({
			seed: schema.runs.seed,
			sourcePath: schema.runs.sourcePath,
			fileTimestamp: schema.runs.fileTimestamp,
		})
		.from(schema.runs)) as RunImportMetadata[];

	return new Map(
		rows.filter((row) => row.sourcePath).map((row) => [row.sourcePath, row]),
	);
}

export async function upsertRunsInRepository(
	runs: PersistedRunInput[],
	options?: { saveStrategy?: "debounced" | "immediate" | "none" },
): Promise<void> {
	if (runs.length === 0) {
		return;
	}

	await initDB();
	const db = getDB();

	for (const input of runs) {
		await db.transaction(async (tx) => {
			const queries = buildRunQueries(tx as unknown as DB, input);
			for (const query of queries) {
				await query;
			}
		});
	}

	if (options?.saveStrategy === "immediate") {
		await saveDB();
	} else if (options?.saveStrategy !== "none") {
		scheduleSave();
	}
}

export async function clearRunsInRepository(): Promise<void> {
	await initDB();
	const db = getDB();
	await db.delete(schema.runs);
	await saveDB();
}

function buildRunQueries(db: DB, input: PersistedRunInput) {
	const { run } = input;
	const queries = [];
	const importedAt = input.importedAt ?? new Date().toISOString();

	const runData = {
		seed: run.seed,
		gameVersion: deriveGameVersion(run),
		playerCount: run.players.length,
		characterId: run.players[0]?.character ?? "UNKNOWN",
		ascension: run.ascension,
		win: run.win ? 1 : 0,
		wasAbandoned: run.was_abandoned ? 1 : 0,
		buildId: run.build_id,
		gameMode: run.game_mode,
		platformType: run.platform_type ?? "",
		killedByEncounter: run.killed_by_encounter,
		killedByEvent: run.killed_by_event,
		startTime: run.start_time,
		runTime: run.run_time,
		totalFloors: getTotalFloorCount(run),
		gameSchemaVersion: run.schema_version,
		rawJson: JSON.stringify(run),
		fileTimestamp: input.fileTimestamp ?? 0,
		sourcePath: input.sourcePath ?? "",
		importedAt,
	};

	queries.push(
		db.insert(schema.runs).values(runData).onConflictDoUpdate({
			target: schema.runs.seed,
			set: runData,
		}),
	);

	for (let playerIndex = 0; playerIndex < run.players.length; playerIndex++) {
		const player = run.players[playerIndex];
		if (!player) {
			continue;
		}

		const playerData = {
			runSeed: run.seed,
			playerIndex,
			playerId: player.id,
			characterId: player.character,
			deckJson: JSON.stringify(player.deck),
			relicsJson: JSON.stringify(player.relics),
			potionsJson: JSON.stringify(player.potions),
			maxPotionSlotCount: player.max_potion_slot_count,
		};

		queries.push(
			db
				.insert(schema.runPlayers)
				.values(playerData)
				.onConflictDoUpdate({
					target: [schema.runPlayers.runSeed, schema.runPlayers.playerIndex],
					set: playerData,
				}),
		);
	}

	let globalFloor = 1;
	for (let actIndex = 0; actIndex < run.map_point_history.length; actIndex++) {
		const act = run.map_point_history[actIndex];
		if (!act) {
			continue;
		}

		for (let localFloor = 0; localFloor < act.length; localFloor++) {
			const point = act[localFloor];
			if (!point) {
				continue;
			}

			const floorData = {
				runSeed: run.seed,
				globalFloor,
				actIndex,
				localFloor,
				mapPointType: point.map_point_type,
				playerStatsJson: JSON.stringify(point.player_stats),
				roomsJson: JSON.stringify(point.rooms),
			};

			queries.push(
				db
					.insert(schema.runFloors)
					.values(floorData)
					.onConflictDoUpdate({
						target: [schema.runFloors.runSeed, schema.runFloors.globalFloor],
						set: floorData,
					}),
			);

			globalFloor++;
		}
	}

	return queries;
}

function deriveGameVersion(run: RunFile): string {
	if (!run.build_id) {
		return "unknown";
	}

	const match = run.build_id.match(/\d+\.\d+(?:\.\d+)?/);
	return match ? match[0] : run.build_id;
}
