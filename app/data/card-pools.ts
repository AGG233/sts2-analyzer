import { eq, and, inArray } from "drizzle-orm";
import * as schema from "~/db/schema";
import type { DrizzleDB } from "~/lib/db.client";

// Cache for character card IDs (map by characterId → cardIds)
const characterCardIdCache = new Map<string, string[]>();
const characterCardIdSetCache = new Map<string, Set<string>>();

// Get all card IDs for a specific character (including colorless if needed)
export async function getCharacterCardIds(db: DrizzleDB, characterId: string, version?: string): Promise<string[]> {
  const cacheKey = `${characterId}:${version || "latest"}`;
  if (characterCardIdCache.has(cacheKey)) {
    return characterCardIdCache.get(cacheKey)!;
  }

  let results;
  if (version) {
    results = await db.select({ cardId: schema.cardPools.cardId })
      .from(schema.cardPools)
      .where(and(
        eq(schema.cardPools.characterId, characterId),
        eq(schema.cardPools.gameVersion, version)
      ));
  } else {
    // Get latest available version's data
    results = await db.select({ cardId: schema.cardPools.cardId })
      .from(schema.cardPools)
      .where(eq(schema.cardPools.characterId, characterId));
  }

  const cardIds = results.map(r => r.cardId);
  characterCardIdCache.set(cacheKey, cardIds);
  characterCardIdSetCache.set(cacheKey, new Set(cardIds));

  return cardIds;
}

// Check if a card belongs to a specific character's pool
export async function isCharacterCard(db: DrizzleDB, cardId: string, characterId: string, version?: string): Promise<boolean> {
  const cacheKey = `${characterId}:${version || "latest"}`;
  if (!characterCardIdSetCache.has(cacheKey)) {
    await getCharacterCardIds(db, characterId, version);
  }
  return characterCardIdSetCache.get(cacheKey)!.has(cardId);
}

// Check if a card is a cross-character card (not in character's pool, not colorless/curse/status)
export async function isCrossCharacterCard(db: DrizzleDB, cardId: string, characterId: string, version?: string): Promise<boolean> {
  const isCharCard = await isCharacterCard(db, cardId, characterId, version);
  if (isCharCard) return false;

  const isColorless = await isColorlessCard(db, cardId, version);
  const isCurse = await isCurseOrStatus(db, cardId, version);

  return !isColorless && !isCurse;
}

// Check if a card is a colorless card
export async function isColorlessCard(db: DrizzleDB, cardId: string, version?: string): Promise<boolean> {
  const cacheKey = `colorless:${version || "latest"}`;
  if (!characterCardIdSetCache.has(cacheKey)) {
    await getCharacterCardIds(db, "colorless", version);
  }
  return characterCardIdSetCache.get(cacheKey)!.has(cardId);
}

// Check if a card is a curse or status card
export async function isCurseOrStatus(db: DrizzleDB, cardId: string, version?: string): Promise<boolean> {
  const curseCacheKey = `curse:${version || "latest"}`;
  const statusCacheKey = `status:${version || "latest"}`;

  if (!characterCardIdSetCache.has(curseCacheKey)) {
    await getCharacterCardIds(db, "curse", version);
  }
  if (!characterCardIdSetCache.has(statusCacheKey)) {
    await getCharacterCardIds(db, "status", version);
  }

  return characterCardIdSetCache.get(curseCacheKey)!.has(cardId) ||
         characterCardIdSetCache.get(statusCacheKey)!.has(cardId);
}

// Clear all caches (called when new version data is loaded)
export function clearCardPoolCache(): void {
  characterCardIdCache.clear();
  characterCardIdSetCache.clear();
}
