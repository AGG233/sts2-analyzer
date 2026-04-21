import { and, eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import type { DrizzleDB } from "~/lib/db.client";
import type { CardVarEntry } from "~/types/card-vars";

const cardVarCache = new Map<string, CardVarEntry>();
const relicVarCache = new Map<string, CardVarEntry>();

export async function getCardVarData(
	db: DrizzleDB,
	cardId: string,
): Promise<CardVarEntry | undefined> {
	const bare = cardId.replace("CARD.", "");
	if (cardVarCache.has(bare)) return cardVarCache.get(bare);

	const results = await db
		.select()
		.from(schema.cardVars)
		.where(
			and(
				eq(schema.cardVars.entityId, bare),
				eq(schema.cardVars.entityType, "card"),
			),
		)
		.limit(1);

	const row = results[0];
	if (!row) return undefined;

	const entry = JSON.parse(row.dataJson) as CardVarEntry;
	cardVarCache.set(bare, entry);
	return entry;
}

export async function getRelicVarData(
	db: DrizzleDB,
	relicId: string,
): Promise<CardVarEntry | undefined> {
	const bare = relicId.replace("RELIC.", "");
	if (relicVarCache.has(bare)) return relicVarCache.get(bare);

	const results = await db
		.select()
		.from(schema.cardVars)
		.where(
			and(
				eq(schema.cardVars.entityId, bare),
				eq(schema.cardVars.entityType, "relic"),
			),
		)
		.limit(1);

	const row = results[0];
	if (!row) return undefined;

	const entry = JSON.parse(row.dataJson) as CardVarEntry;
	relicVarCache.set(bare, entry);
	return entry;
}

export function clearCardVarCache(): void {
	cardVarCache.clear();
	relicVarCache.clear();
}
