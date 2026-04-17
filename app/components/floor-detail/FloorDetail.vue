<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { SimDeckCard } from "~/data/analytics";
import {
	getDeckAtFloor,
	getFloorTimeline,
	getRelicsAtFloor,
} from "~/data/analytics";
import type { FloorPlayerStats, RunFile } from "~/data/types";
import { useGameI18n } from "~/locales/lookup";
import type { MergedCard, MergedPotion, MergedRelic } from "./merge-utils";
import {
	buildMergedCards,
	buildMergedPotions,
	buildMergedRelics,
	groupDeck,
} from "./merge-utils";

const props = defineProps<{
	run: RunFile;
	floor?: number;
}>();

const { t } = useI18n();
const { cardName, relicName, potionName } = useGameI18n();

const floors = computed(() => getFloorTimeline(props.run));

const currentFloor = computed(() => {
	if (props.floor === undefined) return null;
	return floors.value.find((f) => f.globalFloor === props.floor) ?? null;
});

interface PlayerDetail {
	playerIndex: number;
	stats: FloorPlayerStats;
	character: string;
	cards: MergedCard[];
	relics: MergedRelic[];
	potions: MergedPotion[];
	deck: SimDeckCard[];
	groupedDeck: {
		name: string;
		upgraded: number;
		count: number;
		floorAdded: number;
	}[];
	floorRelics: { id: string; name: string; floor: number }[];
}

const playerDetails = computed<PlayerDetail[]>(() => {
	const f = currentFloor.value;
	if (!f) return [];
	const floor = props.floor;

	return f.playerStats
		.map((stats, i) => {
			const deck = getDeckAtFloor(props.run, floor, i);
			const relics = getRelicsAtFloor(props.run, floor, i);
			return {
				playerIndex: i,
				stats,
				character: props.run.players[i]?.character ?? "",
				cards: buildMergedCards(stats, cardName),
				relics: buildMergedRelics(stats, relicName),
				potions: buildMergedPotions(stats, potionName),
				deck,
				groupedDeck: groupDeck(deck, cardName),
				floorRelics: relics.map((r) => ({
					id: r.id,
					name: relicName(r.id),
					floor: r.floor_added_to_deck,
				})),
			};
		})
		.filter((d) => d.stats);
});

const expandedPlayers = reactive<Record<number, boolean>>({});

const togglePlayer = (playerIndex: number) => {
	expandedPlayers[playerIndex] = !expandedPlayers[playerIndex];
};

const isPlayerExpanded = (playerIndex: number): boolean => {
	return expandedPlayers[playerIndex] ?? false;
};

watch(
	playerDetails,
	(details) => {
		if (details.length === 1 && !expandedPlayers[0]) {
			expandedPlayers[0] = true;
		}
	},
	{ immediate: true },
);
</script>

<template>
  <div v-if="currentFloor && playerDetails.length" class="floor-detail">
    <!-- Shared Floor Header -->
    <FloorHeader :floor="currentFloor" />

    <!-- Per-Player Character Cards -->
    <div class="player-cards-grid" :class="{ single: playerDetails.length === 1 }">
      <PlayerCard
        v-for="detail in playerDetails"
        :key="detail.playerIndex"
        :player-index="detail.playerIndex"
        :stats="detail.stats"
        :character="detail.character"
        :cards="detail.cards"
        :relics="detail.relics"
        :potions="detail.potions"
        :deck="detail.deck"
        :floor-relics="detail.floorRelics"
        :is-expanded="isPlayerExpanded(detail.playerIndex)"
        @toggle="togglePlayer"
      />
    </div>
  </div>

  <div v-else class="floor-detail-empty">
    <p>{{ t('run.selectFloorToView') }}</p>
  </div>
</template>

<style scoped>
.floor-detail {
  padding: 1rem;
}

.floor-detail-empty {
  padding: 2rem;
  text-align: center;
  color: #5a7a9a;
}

/* Player Cards Grid */
.player-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.player-cards-grid.single {
  grid-template-columns: 1fr;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .player-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
