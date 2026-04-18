// =============================================================================
// Slay the Spire 2 — Analysis Engine
// =============================================================================

export type {
	AscensionStat,
	CardPickRateOptions,
	CardPickStat,
	CharacterWinRate,
	DeathCauseStat,
	RelicPickStat,
	RunSummary,
} from "./aggregate";
export {
	getAscensionStats,
	getCardPickRate,
	getCardPickRateByCharacter,
	getDeathCauseStats,
	getFloorTypeDistribution,
	getRelicPickRate,
	getRunSummary,
	getWinRateByCharacter,
} from "./aggregate";
export type { DeckChange, SimDeckCard } from "./deck-history";
export {
	getDeckAtFloor,
	getDeckEvolution,
	getDeckHistory,
} from "./deck-history";
export type { FlatFloor } from "./floors";
export {
	flattenFloors,
	getFloorTimeline,
	getPlayerStatsForFloor,
	getStablePlayerIds,
	getTotalFloorCount,
	iterateRunFloors,
} from "./floors";
export type { SimRelic } from "./relic-history";
export { getRelicsAtFloor } from "./relic-history";
export type { EncounterRecord, GoldPoint, HpPoint } from "./timelines";
export {
	getEncounterStats,
	getGoldTimeline,
	getHpTimeline,
} from "./timelines";
