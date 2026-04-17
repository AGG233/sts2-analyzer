import type { SimDeckCard } from "~/data/analytics";
import type { FloorPlayerStats } from "~/data/types";

interface MergedCard {
	id: string;
	name: string;
	status:
		| "choice-picked"
		| "choice-skipped"
		| "gained"
		| "transformed-from"
		| "transformed-to"
		| "upgraded"
		| "removed";
}

interface MergedRelic {
	id: string;
	name: string;
	status: "choice-picked" | "choice-skipped" | "gained" | "removed";
}

interface MergedPotion {
	id: string;
	name: string;
	status: "choice-picked" | "choice-skipped" | "used";
}

export function buildMergedCards(
	stats: FloorPlayerStats,
	cardName: (id: string) => string,
): MergedCard[] {
	const result: MergedCard[] = [];

	for (const choice of stats.card_choices ?? []) {
		result.push({
			id: choice.card.id,
			name: cardName(choice.card.id),
			status: choice.was_picked ? "choice-picked" : "choice-skipped",
		});
	}

	const pickedIds = new Set(
		(stats.card_choices ?? [])
			.filter((c) => c.was_picked)
			.map((c) => c.card.id),
	);
	for (const card of stats.cards_gained ?? []) {
		if (!pickedIds.has(card.id)) {
			result.push({
				id: card.id,
				name: cardName(card.id),
				status: "gained",
			});
		}
	}

	for (const ct of stats.cards_transformed ?? []) {
		result.push({
			id: ct.original_card.id,
			name: cardName(ct.original_card.id),
			status: "transformed-from",
		});
		result.push({
			id: ct.final_card.id,
			name: cardName(ct.final_card.id),
			status: "transformed-to",
		});
	}

	for (const cardId of stats.upgraded_cards ?? []) {
		result.push({
			id: cardId,
			name: cardName(cardId),
			status: "upgraded",
		});
	}

	for (const card of stats.cards_removed ?? []) {
		result.push({
			id: card.id,
			name: cardName(card.id),
			status: "removed",
		});
	}

	return result;
}

export function buildMergedRelics(
	stats: FloorPlayerStats,
	relicName: (id: string) => string,
): MergedRelic[] {
	const result: MergedRelic[] = [];
	for (const choice of stats.relic_choices ?? []) {
		result.push({
			id: choice.choice,
			name: relicName(choice.choice),
			status: choice.was_picked ? "choice-picked" : "choice-skipped",
		});
	}
	for (const relicId of stats.bought_relics ?? []) {
		result.push({
			id: relicId,
			name: relicName(relicId),
			status: "gained",
		});
	}
	for (const relicId of stats.relics_removed ?? []) {
		result.push({
			id: relicId,
			name: relicName(relicId),
			status: "removed",
		});
	}
	return result;
}

export function buildMergedPotions(
	stats: FloorPlayerStats,
	potionName: (id: string) => string,
): MergedPotion[] {
	const result: MergedPotion[] = [];

	for (const choice of stats.potion_choices ?? []) {
		result.push({
			id: choice.choice,
			name: potionName(choice.choice),
			status: choice.was_picked ? "choice-picked" : "choice-skipped",
		});
	}

	const pickedIds = new Set(
		(stats.potion_choices ?? [])
			.filter((c) => c.was_picked)
			.map((c) => c.choice),
	);
	for (const potion of stats.potion_used ?? []) {
		if (!pickedIds.has(potion)) {
			result.push({
				id: potion,
				name: potionName(potion),
				status: "used",
			});
		}
	}

	return result;
}

export function groupDeck(
	deck: SimDeckCard[],
	cardName: (id: string) => string,
) {
	const map = new Map<
		string,
		{ name: string; upgraded: number; count: number; floorAdded: number }
	>();
	for (const card of deck) {
		const key = `${card.id}|${card.upgradeLevel}`;
		if (!map.has(key)) {
			map.set(key, {
				name: cardName(card.id),
				upgraded: card.upgradeLevel,
				count: 1,
				floorAdded: card.floorAdded,
			});
		} else {
			const entry = map.get(key);
			if (entry) {
				entry.count++;
			}
		}
	}
	return Array.from(map.values());
}
