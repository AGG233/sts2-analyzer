<script setup lang="ts">
import {
	getDeckAtFloor,
	getDeckEvolution,
	getGoldTimeline,
	getHpTimeline,
	getRelicsAtFloor,
	getRunSummary,
} from "~/data/analytics";
import { useRunStore } from "~/stores/runStore";
import type RunMap from "./RunMap.vue";

const props = defineProps<{
	seed: string;
}>();

const store = useRunStore();
const { t } = useI18n();
const mapRef = ref<InstanceType<typeof RunMap> | null>(null);

const run = computed(() => store.getRunBySeed(props.seed));
const summary = computed(() => (run.value ? getRunSummary(run.value) : null));

const selectedPlayer = ref(0);
const selectedFloor = ref<number | undefined>(undefined);
const viewMode = ref<"preview" | "detail">("preview");

// 玩家显示名
const playerNames = ref<Map<string | number, string>>(new Map());

const getPlayerDisplayName = (playerIndex: number): string => {
	const s = summary.value;
	if (!s) return "Unknown Player";

	const player = s.players[playerIndex];
	if (!player) return "Unknown Player";

	return playerNames.value.get(player.playerId) || "Unknown Player";
};

const viewModeOptions = computed(() => [
	{ label: t("run.preview"), value: "preview" },
	{ label: t("run.detail"), value: "detail" },
]);

watch(
	() => viewMode.value,
	(newMode, oldMode) => {
		if (
			newMode === "detail" &&
			oldMode === "preview" &&
			selectedFloor.value === undefined
		) {
			selectedFloor.value = 1;
		}
	},
);

const handleSelectFloor = (floor: number) => {
	selectedFloor.value = floor;
	if (viewMode.value === "preview") {
		viewMode.value = "detail";
	}
};

const hoveredFloor = ref<number | null>(null);

const handleHoverFloor = (floor: number | null) => {
	hoveredFloor.value = floor;
};

const playerAnalytics = computed(() => {
	if (!run.value || !summary.value) return [];

	const data: {
		hp: ReturnType<typeof getHpTimeline>;
		gold: ReturnType<typeof getGoldTimeline>;
		deck: ReturnType<typeof getDeckEvolution>;
	}[] = [];

	for (let i = 0; i < summary.value.playerCount; i++) {
		data.push({
			hp: getHpTimeline(run.value, i),
			gold: getGoldTimeline(run.value, i),
			deck: getDeckEvolution(run.value, i),
		});
	}

	return data;
});

// 单个玩家数据
const hpData = computed(
	() => playerAnalytics.value[selectedPlayer.value]?.hp ?? [],
);
const goldData = computed(
	() => playerAnalytics.value[selectedPlayer.value]?.gold ?? [],
);
const deckData = computed(
	() => playerAnalytics.value[selectedPlayer.value]?.deck ?? [],
);

// 所有玩家数据（总览模式）
const allPlayersHpData = computed(() =>
	playerAnalytics.value.map((player) => player.hp),
);
const allPlayersGoldData = computed(() =>
	playerAnalytics.value.map((player) => player.gold),
);
const allPlayersDeckData = computed(() =>
	playerAnalytics.value.map((player) => player.deck),
);

const currentDeck = computed(() => {
	if (!run.value) return [];
	if (hoveredFloor.value !== null) {
		return getDeckAtFloor(run.value, hoveredFloor.value, selectedPlayer.value);
	}
	return run.value.players[selectedPlayer.value]?.deck ?? [];
});

const currentRelics = computed(() => {
	if (!run.value) return [];
	if (hoveredFloor.value !== null) {
		return getRelicsAtFloor(
			run.value,
			hoveredFloor.value,
			selectedPlayer.value,
		).map((r) => ({
			id: r.id,
			floor_added_to_deck: r.floor_added_to_deck,
		}));
	}
	return run.value.players[selectedPlayer.value]?.relics ?? [];
});
</script>

<template>
  <div v-if="run && summary" class="run-detail-page">
    <TopBar :run="run" />

    <div class="main-content" @wheel="handleMainWheel">
      <!-- Left: Map -->
      <div class="left-panel">
        <div class="left-overlay">
          <AppToggleButton
            v-model="viewMode"
            :options="viewModeOptions"
            size="small"
          />
        </div>
        <RunMap
          ref="mapRef"
          :run="run"
          :selected-floor="selectedFloor"
          @select-floor="handleSelectFloor"
        />
      </div>

      <!-- Right: Details -->
      <div class="right-panel">
        <div class="detail-content">
          <!-- Preview Mode -->
          <PreviewContent
            v-if="viewMode === 'preview'"
            :hp-data="hpData"
            :gold-data="goldData"
            :deck-data="deckData"
            :all-players-hp-data="allPlayersHpData"
            :all-players-gold-data="allPlayersGoldData"
            :all-players-deck-data="allPlayersDeckData"
            :player-count="summary.playerCount"
            :current-deck="currentDeck"
            :current-relics="currentRelics"
            @hover-floor="handleHoverFloor"
          />

          <!-- Detail Mode -->
          <DetailContent
            v-else
            :run="run"
            :selected-floor="selectedFloor"
          />
        </div>
      </div>
    </div>
  </div>

  <div v-else class="not-found">
    <p>
      {{ t('run.runNotFound') }} <router-link to="/">
        {{ t('run.goBack') }}
      </router-link>
    </p>
  </div>
</template>

<style scoped lang="scss">
.run-detail-page {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  width: 30%;
  min-width: 300px;
  max-width: 400px;
  @include glass-light;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.left-overlay {
  position: absolute;
  bottom: $space-sm;
  right: $space-sm;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: $space-sm;
}

.preview-player-selector {
  display: flex;
  gap: 0.4rem;
  margin-bottom: $space-sm;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  @include glass;
}

.detail-content {
  flex: 1;
}

.not-found {
  text-align: center;
  padding: $space-2xl;
  color: $text-secondary;
}
</style>
