import { eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import type { DrizzleDB } from "~/lib/db.client";
import type { CardMetadataEntry } from "~/types/card-metadata";

const metadataCache = new Map<string, CardMetadataEntry>();
let allMetadataCache: Record<string, CardMetadataEntry> | null = null;

export async function getCardMetadata(
	db: DrizzleDB,
	cardId: string,
): Promise<CardMetadataEntry | undefined> {
	const bare = cardId.replace("CARD.", "");
	if (metadataCache.has(bare)) return metadataCache.get(bare);

	const results = await db
		.select()
		.from(schema.cardMetadata)
		.where(eq(schema.cardMetadata.cardId, bare))
		.limit(1);

	const row = results[0];
	if (!row) return undefined;

	const entry: CardMetadataEntry = {
		cost: row.cost,
		type: row.type,
		rarity: row.rarity,
		target: row.target,
		tags: JSON.parse(row.tagsJson) as string[],
		character_id: row.characterId || undefined,
		is_starter: row.isStarter === 1 ? true : undefined,
	};
	metadataCache.set(bare, entry);
	return entry;
}

export async function getAllCardMetadata(
	db: DrizzleDB,
): Promise<Record<string, CardMetadataEntry>> {
	if (allMetadataCache) return allMetadataCache;

	const results = await db.select().from(schema.cardMetadata);
	const map: Record<string, CardMetadataEntry> = {};

	for (const row of results) {
		map[row.cardId] = {
			cost: row.cost,
			type: row.type,
			rarity: row.rarity,
			target: row.target,
			tags: JSON.parse(row.tagsJson) as string[],
			character_id: row.characterId || undefined,
			is_starter: row.isStarter === 1 ? true : undefined,
		};
		metadataCache.set(row.cardId, map[row.cardId]);
	}

	allMetadataCache = map;
	return map;
}

export function clearMetadataCache(): void {
	metadataCache.clear();
	allMetadataCache = null;
}

export const CARD_TYPE_CONFIG: Record<
	string,
	{ icon: string; color: string; label: string }
> = {
	Attack: { icon: "⚔", color: "#e74c3c", label: "Attack" },
	Skill: { icon: "🛡", color: "#3498db", label: "Skill" },
	Power: { icon: "⚡", color: "#f39c12", label: "Power" },
	Status: { icon: "⬢", color: "#95a5a6", label: "Status" },
	Curse: { icon: "🔒", color: "#8e44ad", label: "Curse" },
	Quest: { icon: "❓", color: "#2ecc71", label: "Quest" },
};

export const RARITY_CONFIG: Record<string, { color: string; label: string }> = {
	Basic: { color: "#bdc3c7", label: "Basic" },
	Common: { color: "#95a5a6", label: "Common" },
	Uncommon: { color: "#2ecc71", label: "Uncommon" },
	Rare: { color: "#f1c40f", label: "Rare" },
	Ancient: { color: "#e67e22", label: "Ancient" },
	Event: { color: "#9b59b6", label: "Event" },
	Token: { color: "#7f8c8d", label: "Token" },
	Status: { color: "#7f8c8d", label: "Status" },
	Curse: { color: "#c0392b", label: "Curse" },
	Quest: { color: "#27ae60", label: "Quest" },
};

export const CHARACTER_FRAME_COLORS: Record<string, string> = {
	ironclad: "#e74c3c",
	silent: "#2ecc71",
	defect: "#3498db",
	regent: "#e67e22",
	necrobinder: "#e91e90",
	colorless: "#95a5a6",
	curse: "#8e44ad",
	status: "#7f8c8d",
	quest: "#27ae60",
	token: "#7f8c8d",
	event: "#9b59b6",
};
