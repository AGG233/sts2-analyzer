<script setup lang="ts">
import type { SimDeckCard } from "~/data/analytics";
import { getCardMetadata } from "~/data/card-metadata";
import { cleanCardDescription } from "~/lib/card-description";
import { useGameI18n } from "~/locales/lookup";
import type { CardMetadataEntry } from "~/types/card-metadata";

interface Props {
	deck: SimDeckCard[];
	relics: Array<{
		id: string;
		floor_added_to_deck: number;
	}>;
	hoveredFloor?: number | null;
}

const props = defineProps<Props>();

const { t } = useI18n();
const { cardName, cardDescription, relicName } = useGameI18n();

// 预加载所有卡牌 metadata
const metadataMap = ref(new Map<string, CardMetadataEntry>());

onMounted(async () => {
	const uniqueIds = [...new Set(props.deck.map((c) => c.id))];
	const entries = await Promise.all(
		uniqueIds.map(async (id) => {
			const meta = await getCardMetadata(id);
			return meta ? ([id, meta] as const) : null;
		}),
	);
	for (const entry of entries) {
		if (entry) metadataMap.value.set(entry[0], entry[1]);
	}
});

interface GroupedCard {
	id: string;
	name: string;
	upgraded: boolean;
	count: number;
	cost: number;
	type: string;
	rarity: string;
	characterId: string;
	description: string;
}

const groupedCurrentDeck = computed<GroupedCard[]>(() => {
	const map = new Map<string, GroupedCard>();
	for (const card of props.deck) {
		const lvl = card.upgradeLevel;
		const key = `${card.id}|${lvl}`;
		const meta = metadataMap.value.get(card.id);
		if (map.has(key)) {
			const entry = map.get(key);
			if (entry) entry.count++;
		} else {
			map.set(key, {
				id: card.id,
				name: cardName(card.id),
				upgraded: lvl > 0,
				count: 1,
				cost: meta?.cost ?? 0,
				type: meta?.type ?? "Attack",
				rarity: meta?.rarity ?? "Common",
				characterId: meta?.character_id ?? "colorless",
				description: cleanCardDescription(cardDescription(card.id)),
			});
		}
	}
	return Array.from(map.values());
});

const groupedCurrentRelics = computed(() => {
	const map = new Map<string, { name: string; count: number; floor: number }>();
	for (const relic of props.relics) {
		if (map.has(relic.id)) {
			const entry = map.get(relic.id);
			if (entry) entry.count++;
		} else {
			map.set(relic.id, {
				name: relicName(relic.id),
				count: 1,
				floor: relic.floor_added_to_deck ?? 1,
			});
		}
	}
	return Array.from(map.values());
});
</script>

<template>
	<div class="deck-relics-section">
		<!-- Deck -->
		<div class="items-section">
			<div class="items-row">
				<span class="items-label">
					{{
						hoveredFloor !== null
							? `${t("run.deckSize")} (F${hoveredFloor})`
							: t("run.finalDeck")
					}}:
					{{ deck.length }}
				</span>
			</div>
			<div class="cards-scroll">
				<GameCard
					v-for="(group, idx) in groupedCurrentDeck"
					:key="idx"
					:card-id="group.id"
					:name="group.name"
					:cost="group.cost"
					:type="group.type"
					:rarity="group.rarity"
					:character-id="group.characterId"
					:upgraded="group.upgraded"
					:count="group.count > 1 ? group.count : undefined"
					:description="group.description"
				/>
			</div>
		</div>

		<!-- Relics -->
		<div class="items-section">
			<div class="items-row">
				<span class="items-label"
					>{{ t("run.relics") }}: {{ relics.length }}</span
				>
			</div>
			<div class="items-container relics-container">
				<AppTag
					v-for="relic in groupedCurrentRelics"
					:key="relic.name"
					severity="secondary"
				>
					{{
						`${relic.name}${relic.count > 1 ? ` x${relic.count}` : ""} F${relic.floor}`
					}}
				</AppTag>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.deck-relics-section {
	margin-top: $space-lg;
}

.items-section {
	margin-top: $space-lg;
	padding-top: $space-lg;
	border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.items-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $space-sm;
}

.items-label {
	font-weight: 600;
	color: $text-primary;
}

.cards-scroll {
	display: flex;
	gap: 8px;
	overflow-x: auto;
	padding: 4px 0;
	@include dark-scrollbar;
}

.items-container {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem;
	max-height: 80px;
	overflow: hidden;
}
</style>
