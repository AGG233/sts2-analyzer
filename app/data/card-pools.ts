import { and, eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import type { DrizzleDB } from "~/lib/db.client";

const characterCardIdCache = new Map<string, string[]>();
const characterCardIdSetCache = new Map<string, Set<string>>();

// Normalize "CHARACTER.IRONCLAD" → "ironclad" for DB lookup
function normalizeCharacterId(id: string): string {
	if (id.startsWith("CHARACTER.")) {
		return id.slice(10).toLowerCase();
	}
	return id.toLowerCase();
}

function getCardIdSet(cacheKey: string): Set<string> {
	return characterCardIdSetCache.get(cacheKey) ?? new Set<string>();
}

export async function getCharacterCardIds(
	db: DrizzleDB,
	characterId: string,
	version?: string,
): Promise<string[]> {
	const normalizedId = normalizeCharacterId(characterId);
	const cacheKey = `${normalizedId}:${version || "latest"}`;
	const cached = characterCardIdCache.get(cacheKey);
	if (cached) return cached;

	const results = version
		? await db
				.select({ cardId: schema.cardPools.cardId })
				.from(schema.cardPools)
				.where(
					and(
						eq(schema.cardPools.characterId, normalizedId),
						eq(schema.cardPools.gameVersion, version),
					),
				)
		: await db
				.select({ cardId: schema.cardPools.cardId })
				.from(schema.cardPools)
				.where(eq(schema.cardPools.characterId, normalizedId));

	const cardIds = results.map((r) => r.cardId);
	characterCardIdCache.set(cacheKey, cardIds);
	characterCardIdSetCache.set(cacheKey, new Set(cardIds));

	return cardIds;
}

export async function isCharacterCard(
	db: DrizzleDB,
	cardId: string,
	characterId: string,
	version?: string,
): Promise<boolean> {
	const normalizedId = normalizeCharacterId(characterId);
	const cacheKey = `${normalizedId}:${version || "latest"}`;
	if (!characterCardIdSetCache.has(cacheKey)) {
		await getCharacterCardIds(db, characterId, version);
	}
	return getCardIdSet(cacheKey).has(cardId);
}

export async function isCrossCharacterCard(
	db: DrizzleDB,
	cardId: string,
	characterId: string,
	version?: string,
): Promise<boolean> {
	const isCharCard = await isCharacterCard(db, cardId, characterId, version);
	if (isCharCard) return false;

	const isColorless = await isColorlessCard(db, cardId, version);
	const isCurse = await isCurseOrStatus(db, cardId, version);

	return !isColorless && !isCurse;
}

export async function isColorlessCard(
	db: DrizzleDB,
	cardId: string,
	version?: string,
): Promise<boolean> {
	const cacheKey = `colorless:${version || "latest"}`;
	if (!characterCardIdSetCache.has(cacheKey)) {
		await getCharacterCardIds(db, "colorless", version);
	}
	return getCardIdSet(cacheKey).has(cardId);
}

export async function isCurseOrStatus(
	db: DrizzleDB,
	cardId: string,
	version?: string,
): Promise<boolean> {
	const curseCacheKey = `curse:${version || "latest"}`;
	const statusCacheKey = `status:${version || "latest"}`;

	if (!characterCardIdSetCache.has(curseCacheKey)) {
		await getCharacterCardIds(db, "curse", version);
	}
	if (!characterCardIdSetCache.has(statusCacheKey)) {
		await getCharacterCardIds(db, "status", version);
	}

	return (
		getCardIdSet(curseCacheKey).has(cardId) ||
		getCardIdSet(statusCacheKey).has(cardId)
	);
}

export function clearCardPoolCache(): void {
	characterCardIdCache.clear();
	characterCardIdSetCache.clear();
}
