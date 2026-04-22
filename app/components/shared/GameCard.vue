<script setup lang="ts">
import { computed } from "vue";
import {
	getBannerPath,
	getEnergyPath,
	getFramePath,
	getPortraitPath,
} from "~/data/card-assets";
import { CHARACTER_FRAME_COLORS } from "~/data/card-metadata";
import type { Segment } from "~/lib/template-renderer";

interface Props {
	cardId: string;
	name: string;
	cost: number;
	type: string;
	rarity: string;
	characterId: string;
	upgraded: boolean;
	count?: number;
	descriptionSegments?: Segment[];
}

const props = withDefaults(defineProps<Props>(), {
	count: undefined,
});

const bareId = computed(() => props.cardId.replace("CARD.", ""));

const portraitSrc = computed(() =>
	getPortraitPath(props.characterId, bareId.value),
);
const frameSrc = computed(() => getFramePath(props.type));
const bannerSrc = computed(() => getBannerPath(props.rarity));
const energySrc = computed(() => getEnergyPath(props.characterId));

const frameColor = computed(
	() => CHARACTER_FRAME_COLORS[props.characterId] ?? "#95a5a6",
);

const bannerFilter = computed(() => {
	const filters: Record<string, string> = {
		Basic: "none",
		Common: "none",
		Uncommon: "hue-rotate(200deg) saturate(1.5)",
		Rare: "hue-rotate(350deg) saturate(0.8)",
		Ancient: "hue-rotate(30deg) saturate(1.3)",
		Curse: "hue-rotate(100deg) saturate(1.3) brightness(0.85)",
		Event: "hue-rotate(270deg) saturate(0.8)",
	};
	return filters[props.rarity] ?? "none";
});
</script>

<template>
	<div class="game-card">
		<!-- z-1: 卡牌边框底图（灰度模板） -->
		<img class="card-frame" :src="frameSrc" alt="" aria-hidden="true" />
		<!-- z-2: 角色色叠加层（mix-blend-mode 模拟 HSV shader） -->
		<div
			class="card-tint"
			:style="{ background: frameColor }"
			aria-hidden="true"
		/>
		<!-- z-3: 标题横幅（稀有度着色） -->
		<img
			class="card-banner"
			:src="bannerSrc"
			alt=""
			:style="{ filter: bannerFilter }"
			aria-hidden="true"
		/>
		<!-- z-4: 卡牌肖像 -->
		<img
			class="card-portrait"
			:src="portraitSrc"
			:alt="name"
			loading="lazy"
		/>
		<!-- z-5: 卡牌名称 -->
		<span class="card-title" :class="{ upgraded }">
			{{ name }}
		</span>
		<!-- z-6: 能量图标 -->
		<img
			class="card-energy"
			:src="energySrc"
			alt=""
			aria-hidden="true"
		/>
		<!-- z-7: 费用数字 -->
		<span class="card-cost">{{ cost }}</span>
		<!-- z-9: 卡牌描述（居中） -->
		<div v-if="descriptionSegments" class="card-desc-area">
			<GameDescription class="card-desc" :segments="descriptionSegments" />
		</div>
		<!-- z-10: 卡牌类型标签 -->
		<span class="card-type">{{ type }}</span>
		<!-- z-11: 数量角标 -->
		<span v-if="count && count > 1" class="card-count">x{{ count }}</span>
	</div>
</template>

<style scoped lang="scss">
.game-card {
	position: relative;
	width: clamp(100px, 10vw, 180px);
	aspect-ratio: 108 / 180;
	border-radius: clamp(5px, 0.6vw, 10px);
	overflow: hidden;
	flex-shrink: 0;
	filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
}

// z-1: 卡牌边框底图
.card-frame {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	z-index: 1;
}

// z-2: 角色色叠加
.card-tint {
	position: absolute;
	inset: 0;
	z-index: 2;
	mix-blend-mode: multiply;
	opacity: 0.45;
}

// z-3: 标题横幅（顶部区域）
.card-banner {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 20%;
	object-fit: cover;
	z-index: 3;
}

// z-4: 卡牌肖像（中部区域）
.card-portrait {
	position: absolute;
	top: 12%;
	left: 8%;
	width: 84%;
	height: 30%;
	object-fit: cover;
	object-position: center 10%;
	z-index: 4;
	border-radius: 3px;
}

// z-5: 卡牌名称（横幅上）
.card-title {
	position: absolute;
	top: 2%;
	left: 50%;
	transform: translateX(-50%);
	width: 70%;
	text-align: center;
	font-size: clamp(8px, 1vw, 15px);
	font-weight: 700;
	color: #ffe5c8;
	z-index: 5;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.4;

	&.upgraded {
		color: #7fff7f;
	}
}

// z-6: 能量图标（左上角）
.card-energy {
	position: absolute;
	top: 0;
	left: 1%;
	width: clamp(15px, 1.8vw, 28px);
	height: clamp(15px, 1.8vw, 28px);
	z-index: 6;
}

// z-7: 费用数字
.card-cost {
	position: absolute;
	top: 0;
	left: 1%;
	width: clamp(15px, 1.8vw, 28px);
	height: clamp(15px, 1.8vw, 28px);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: clamp(8px, 1vw, 15px);
	font-weight: 900;
	color: #4eff4e;
	z-index: 7;
	text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
}

// z-9: 卡牌描述区域（居中）
.card-desc-area {
	position: absolute;
	top: 46%;
	bottom: 12%;
	left: 0;
	right: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 clamp(8px, 1vw, 16px);
	z-index: 9;
}

.card-desc {
	text-align: center;
	font-size: clamp(7px, 0.85vw, 14px);
	line-height: 1.6;
	color: #d4cfc0;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
	word-break: break-word;
}

// z-10: 卡牌类型标签
.card-type {
	position: absolute;
	bottom: 5%;
	left: 50%;
	transform: translateX(-50%);
	z-index: 10;
	font-size: clamp(5px, 0.65vw, 10px);
	font-weight: 600;
	color: rgba(255, 255, 255, 0.5);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	white-space: nowrap;
}

// z-11: 数量角标
.card-count {
	position: absolute;
	top: 1px;
	right: 3px;
	font-size: clamp(7px, 0.85vw, 13px);
	font-weight: 700;
	color: #fff;
	background: rgba(0, 0, 0, 0.6);
	padding: 1px 4px;
	border-radius: 3px;
	z-index: 11;
	line-height: 1.2;
}
</style>
