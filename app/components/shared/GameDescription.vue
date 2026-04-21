<script setup lang="ts">
import type { Segment } from "~/lib/template-renderer";

defineProps<{ segments: Segment[] }>();
</script>

<template>
	<span class="game-desc">
		<template v-for="(seg, i) in segments" :key="i">
			<span v-if="seg.type === 'text'">{{ seg.value }}</span>
			<span
				v-else-if="seg.type === 'variable'"
				:class="{ 'var-upgraded': seg.upgraded, 'var-value': true }"
			>{{ seg.value }}</span>
			<span v-else-if="seg.type === 'energy'" class="energy-icon">{{
				seg.value
			}}</span>
			<span v-else-if="seg.type === 'stars'" class="star-icon">{{
				seg.value
			}}</span>
			<span
				v-else-if="seg.type === 'color'"
				:class="`bbcode-${seg.tag}`"
			>
				<GameDescription :segments="seg.children" />
			</span>
			<span v-else-if="seg.type === 'bold'" class="font-bold">
				<GameDescription :segments="seg.children" />
			</span>
		</template>
	</span>
</template>

<style scoped>
.game-desc {
	display: contents;
}

.var-value {
	color: #6cb4ee;
}

.var-upgraded {
	color: #7fff7f;
}

.energy-icon {
	color: #ffeb3b;
}

.star-icon {
	color: #ffd700;
}

.bbcode-gold {
	color: #ffd700;
}

.bbcode-blue {
	color: #6cb4ee;
}

.bbcode-green {
	color: #7fff7f;
}

.bbcode-red {
	color: #ff6464;
}

.bbcode-purple {
	color: #c77dff;
}

.bbcode-orange {
	color: #ff8c00;
}

.bbcode-aqua {
	color: #00e5ff;
}
</style>
