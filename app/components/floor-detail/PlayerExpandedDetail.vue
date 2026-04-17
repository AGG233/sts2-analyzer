<script setup lang="ts">
import { computed } from "vue";
import type { SimDeckCard } from "~/data/analytics";
import { useGameI18n } from "~/locales/lookup";

interface Props {
	deck: SimDeckCard[];
	floorRelics: Array<{
		id: string;
		name: string;
		floor: number;
	}>;
	gainedIds: Set<string>;
	removedIds: Set<string>;
	currentFloor?: number;
}

const props = defineProps<Props>();

const { t } = useI18n();
const { cardName } = useGameI18n();

const groupedDeck = computed(() => {
	const map = new Map<
		string,
		{ name: string; upgraded: number; count: number; floorAdded: number }
	>();
	for (const card of props.deck) {
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
});
</script>

<template>
  <div class="player-detail">
    <AppDisclosure :legend="`${t('run.relics')}: ${floorRelics.length}`">
      <RelicTags
        :relics="floorRelics"
        :gained-ids="gainedIds"
        :removed-ids="removedIds"
      />
    </AppDisclosure>

    <AppDisclosure :legend="`${t('run.deckSize')}: ${deck.length}`">
      <DeckTags
        :groups="groupedDeck"
        :current-floor="currentFloor"
      />
    </AppDisclosure>
  </div>
</template>

<style scoped lang="scss">
.player-detail {
  padding: $space-md;
  max-height: 600px;
  overflow-y: auto;
  @include dark-scrollbar;
}

.card-fieldset {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 200px;

  &:last-child {
    border-bottom: none;
  }
}
</style>
