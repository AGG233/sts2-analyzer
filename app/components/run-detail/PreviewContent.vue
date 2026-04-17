<script setup lang="ts">
import type {
	DeckChange,
	GoldPoint,
	HpPoint,
	SimDeckCard,
} from "~/data/analytics";

interface RelicInfo {
	id: string;
	name: string;
}

const _props = defineProps<{
	hpData: HpPoint[];
	goldData: GoldPoint[];
	deckData: DeckChange[];
	allPlayersHpData: HpPoint[][];
	allPlayersGoldData: GoldPoint[][];
	allPlayersDeckData: DeckChange[][];
	playerCount: number;
	currentDeck: SimDeckCard[];
	currentRelics: RelicInfo[];
}>();

const emit = defineEmits<(e: "hoverFloor", floor: number | null) => void>();

const { t } = useI18n();

const hoveredFloor = ref<number | null>(null);

const handleHoverFloor = (floor: number | null) => {
	hoveredFloor.value = floor;
	emit("hoverFloor", floor);
};
</script>

<template>
  <div class="preview-content">
    <!-- Deck and Relics -->
    <DeckRelicsSection
      :deck="currentDeck"
      :relics="currentRelics"
      :hovered-floor="hoveredFloor"
    />

    <!-- Preview Mode: Timeline charts -->
    <div class="preview-content-inner">
      <section class="chart-section">
        <h2>{{ t('run.timeline') }}</h2>
        <CombinedTimelineChart
          :hp-data="hpData"
          :gold-data="goldData"
          :deck-data="deckData"
          :all-players-hp-data="allPlayersHpData"
          :all-players-gold-data="allPlayersGoldData"
          :all-players-deck-data="allPlayersDeckData"
          @hover-floor="handleHoverFloor"
        />
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.preview-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-content-inner {
  flex: 1;
  overflow-y: auto;
  @include dark-scrollbar;
}

.chart-section {
  margin-bottom: $space-2xl;

  h2 {
    font-size: 1.1rem;
    margin-bottom: $space-md;
    color: $text-primary;
  }
}
</style>
