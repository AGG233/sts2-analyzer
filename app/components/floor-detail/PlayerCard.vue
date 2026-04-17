<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight, X } from "@lucide/vue";
import type { SimDeckCard } from "~/data/analytics";
import { getCharacterColor } from "~/data/characters";
import type { FloorPlayerStats } from "~/data/types";
import { useGameI18n } from "~/locales/lookup";
import type { MergedCard, MergedPotion, MergedRelic } from "./merge-utils";

const props = defineProps<{
	playerIndex: number;
	stats: FloorPlayerStats;
	character: string;
	cards: MergedCard[];
	relics: MergedRelic[];
	potions: MergedPotion[];
	deck: SimDeckCard[];
	floorRelics: { id: string; name: string; floor: number }[];
	isExpanded: boolean;
}>();

const emit = defineEmits<(e: "toggle", playerIndex: number) => void>();

const { characterName, restSiteChoiceName } = useGameI18n();

function getPlayerColor(characterId: string): string {
	return getCharacterColor(characterId);
}

function getCardSeverity(
	status: string,
): "success" | "secondary" | "info" | "warn" | "danger" | undefined {
	switch (status) {
		case "choice-picked":
			return "success";
		case "choice-skipped":
			return "secondary";
		case "gained":
			return "success";
		case "transformed-from":
			return "danger";
		case "transformed-to":
			return "success";
		case "upgraded":
			return "warn";
		case "removed":
			return "danger";
		default:
			return undefined;
	}
}

function getCardStatusPrefix(
	status: MergedCard["status"],
): typeof ArrowUpRight | typeof ArrowDownRight | typeof X | null {
	switch (status) {
		case "transformed-from":
			return ArrowUpRight;
		case "transformed-to":
			return ArrowDownRight;
		case "removed":
			return X;
		default:
			return null;
	}
}

function getRelicStatusPrefix(status: MergedRelic["status"]): typeof X | null {
	if (status === "removed") return X;
	return null;
}

function onToggle() {
	emit("toggle", props.playerIndex);
}

// Transition hooks for smooth height animation
function onExpandEnter(el: Element, done: () => void) {
	const htmlEl = el as HTMLElement;
	htmlEl.style.height = "0";
	htmlEl.style.opacity = "0";
	htmlEl.style.overflow = "hidden";
	htmlEl.getBoundingClientRect(); // force reflow
	htmlEl.style.transition = "height 0.3s ease-out, opacity 0.3s ease-out";
	htmlEl.style.height = `${htmlEl.scrollHeight}px`;
	htmlEl.style.opacity = "1";
	htmlEl.addEventListener(
		"transitionend",
		() => {
			htmlEl.style.height = "";
			htmlEl.style.overflow = "";
			htmlEl.style.transition = "";
			done();
		},
		{ once: true },
	);
}

function onExpandLeave(el: Element, done: () => void) {
	const htmlEl = el as HTMLElement;
	htmlEl.style.height = `${htmlEl.scrollHeight}px`;
	htmlEl.style.overflow = "hidden";
	htmlEl.getBoundingClientRect(); // force reflow
	htmlEl.style.transition = "height 0.25s ease-in, opacity 0.25s ease-in";
	htmlEl.style.height = "0";
	htmlEl.style.opacity = "0";
	htmlEl.addEventListener(
		"transitionend",
		() => {
			htmlEl.style.transition = "";
			done();
		},
		{ once: true },
	);
}
</script>

<template>
  <div
    class="player-card"
    :style="{ borderTopColor: getPlayerColor(props.character) }"
  >
    <!-- Summary Row (always visible) -->
    <div class="card-header-row" @click="onToggle">
      <div class="player-identity">
        <span
          class="player-color-dot"
          :style="{ background: getPlayerColor(props.character) }"
        />
        <span class="player-name">{{ characterName(props.character) }}</span>
      </div>

      <div class="card-stats-inline">
        <!-- HP -->
        <span class="stat-item-inline">
          <Heart class="stat-icon lucide-icon text-danger" />
          <span class="stat-value-inline">
            <span class="value">{{ props.stats.current_hp }}</span>
            <span class="separator">/</span>
            <span class="value">{{ props.stats.max_hp }}</span>
          </span>
          <AppTag v-if="props.stats.damage_taken > 0" severity="danger" class="change-tag">-{{ props.stats.damage_taken }}</AppTag>
          <AppTag v-if="props.stats.hp_healed > 0" severity="success" class="change-tag">+{{ props.stats.hp_healed }}</AppTag>
        </span>

        <!-- Gold -->
        <span class="stat-item-inline">
          <Coins class="stat-icon lucide-icon text-warn" />
          <span class="stat-value-inline">
            <span class="value">{{ props.stats.current_gold }}g</span>
          </span>
          <AppTag v-if="props.stats.gold_gained > 0" severity="success" class="change-tag">+{{ props.stats.gold_gained }}</AppTag>
          <AppTag v-if="props.stats.gold_spent > 0" severity="danger" class="change-tag">-{{ props.stats.gold_spent }}</AppTag>
        </span>

        <!-- Potions -->
        <span v-if="props.potions.length > 0" class="stat-item-inline">
          <FlaskConical class="stat-icon lucide-icon text-info" />
          <AppTag
            v-for="pot in props.potions"
            :key="pot.id"
            :severity="pot.status === 'choice-picked' ? 'success' : pot.status === 'used' ? 'secondary' : undefined"
            :class="{ 'tag-strikethrough': pot.status === 'choice-skipped' || pot.status === 'used' }"
            class="potion-tag"
          >{{ pot.name }}</AppTag>
        </span>

        <!-- Rest Site Choice -->
        <span v-if="props.stats.rest_site_choices?.length" class="stat-item-inline">
          <span class="stat-label-inline">{{ t('run.restSiteChoice') }}:</span>
          <AppTag>{{ props.stats.rest_site_choices.map(restSiteChoiceName).join(', ') }}</AppTag>
        </span>

        <!-- Event Choices -->
        <span v-if="props.stats.event_choices?.length" class="stat-item-inline">
          <span class="stat-label-inline">{{ t('run.eventChoices') }}:</span>
          <AppTag
            v-for="(choice, index) in props.stats.event_choices"
            :key="index"
            severity="info"
          >{{ choice.title?.key ? t(`game.${choice.title.table}.${choice.title.key}`) : '' }}</AppTag>
        </span>

        <!-- Relic Changes -->
        <span v-if="props.relics.length > 0" class="stat-item-inline">
          <Gift class="stat-icon lucide-icon text-success" />
          <AppTag
            v-for="(relic, index) in props.relics"
            :key="index"
            :severity="relic.status === 'choice-picked' || relic.status === 'gained' ? 'success' : relic.status === 'removed' ? 'danger' : 'secondary'"
            :class="{ 'tag-strikethrough': relic.status === 'choice-skipped' || relic.status === 'removed' }"
            class="relic-tag"
          >
            <component v-if="getRelicStatusPrefix(relic.status)" :is="getRelicStatusPrefix(relic.status)" class="inline-icon" />
            {{ relic.name }}
          </AppTag>
        </span>

        <!-- Card Changes -->
        <span v-if="props.cards.length > 0" class="stat-item-inline">
          <span class="stat-icon card-icon"><Scroll class="w-4 h-4" /></span>
          <AppTag
            v-for="(item, index) in props.cards"
            :key="index"
            :severity="getCardSeverity(item.status)"
            :class="{ 'tag-strikethrough': item.status === 'choice-skipped' || item.status === 'transformed-from' || item.status === 'removed' }"
            class="card-tag"
          >
            <component v-if="getCardStatusPrefix(item.status)" :is="getCardStatusPrefix(item.status)" class="inline-icon" />
            {{ item.name }}
          </AppTag>
        </span>
      </div>

      <span class="expand-icon">
        <component :is="props.isExpanded ? ChevronUp : ChevronDown" class="w-4 h-4" />
      </span>
    </div>

    <!-- Expanded Details (with JS transition) -->
    <Transition :enter="onExpandEnter" :leave="onExpandLeave" :css="false">
      <div v-if="props.isExpanded">
        <PlayerExpandedDetail
          :deck="props.deck"
          :floor-relics="props.floorRelics"
          :gained-ids="new Set(props.relics.filter(r => r.status === 'choice-picked' || r.status === 'gained').map(r => r.id))"
          :removed-ids="new Set(props.relics.filter(r => r.status === 'removed').map(r => r.id))"
          :current-floor="0"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.player-card {
  background: rgba(15, 31, 53, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 3px solid transparent;
  border-radius: $radius-lg;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: box-shadow $transition-slow;

  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }
}

.card-header-row {
  display: flex;
  align-items: flex-start;
  gap: $space-sm;
  padding: 0.6rem $space-md;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.player-identity {
  display: flex;
  align-items: center;
  gap: $space-sm;
  flex-shrink: 0;
  padding-top: 0.2rem;
}

.player-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: $text-primary;
  white-space: nowrap;
}

.card-stats-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: $space-sm;
  flex: 1;
  min-width: 0;
}

.stat-item-inline {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.3rem 0.6rem;
  border-radius: $radius-md;
  border: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;

  .stat-label-inline {
    font-size: 0.8rem;
    font-weight: 600;
    color: $text-secondary;
  }
}

.stat-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.lucide-icon {
  width: 1rem;
  height: 1rem;
}

.inline-icon {
  width: 0.75rem;
  height: 0.75rem;
  display: inline-block;
  vertical-align: middle;
  margin-right: 0.15rem;
}

.card-icon {
  font-size: 0.9rem;
}

.stat-value-inline {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2rem;

  .value {
    font-weight: 700;
    font-size: 0.95rem;

    &:first-child {
      color: $danger;
    }

    &:last-child {
      color: $text-primary;
    }
  }
}

.separator {
  color: $text-muted;
  font-size: 0.85rem;
}

.change-tag,
.potion-tag,
.relic-tag,
.card-tag {
  font-size: 0.75rem;
}

.potion-tag,
.relic-tag,
.card-tag {
  font-size: 0.8rem;
}

.tag-strikethrough {
  text-decoration: line-through;
  opacity: 0.6;
}

.expand-icon {
  width: 24px;
  height: 24px;
  @include flex-center;
  color: $text-secondary;
  flex-shrink: 0;
  padding-top: 0.2rem;

  &:hover {
    color: $text-primary;
  }
}

.player-detail {
  padding: $space-md;
  max-height: 600px;
  overflow-y: auto;
  @include dark-scrollbar;
}
</style>
