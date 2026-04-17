<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { MapNode } from "~/data/map";
import { generateMapData, getNodeConnections, typeColors } from "~/data/map";
import type { RunFile } from "~/data/types";
import { useGameI18n } from "~/locales/lookup";

const props = defineProps<{
	run: RunFile;
	selectedFloor?: number;
}>();

const emit = defineEmits<(e: "selectFloor", floor: number) => void>();

const { actName, mapTypeName } = useGameI18n();

const mapData = computed(() => generateMapData(props.run));
const connections = computed(() => getNodeConnections(mapData.value));

const nodeRadius = 16;
const verticalSpacing = 50;
const horizontalPadding = 40;
const topPadding = 40;
const bottomPadding = 40;

const mapContainerRef = ref<HTMLDivElement | null>(null);
const containerHeight = ref<number>(0);
const svgWidth = computed(() => 280);
const svgHeight = computed(() => {
	// 计算地图内容需要的高度
	const totalNodes = mapData.value.totalFloors;
	const actGaps = mapData.value.acts.length - 1;
	const contentHeight =
		topPadding +
		totalNodes * verticalSpacing +
		actGaps * 1.5 * verticalSpacing +
		bottomPadding;

	// 额外空间：确保底层节点可以滚到底部
	const extraPadding =
		containerHeight.value > 0 ? containerHeight.value - verticalSpacing : 0;
	// 如果内容高度超过容器高度，使用内容高度（允许滚动）
	// 否则使用容器高度（填满空间）
	return containerHeight.value > 0
		? Math.max(contentHeight + extraPadding, containerHeight.value)
		: contentHeight;
});

function nodeX(x: number): number {
	return horizontalPadding + x * (svgWidth.value - horizontalPadding * 2);
}

function nodeY(y: number): number {
	return topPadding + y * verticalSpacing;
}

// 计算最大Y值，用于反转地图方向
const maxY = computed(() => {
	let max = 0;
	for (const act of mapData.value.acts) {
		if (act.endY > max) {
			max = act.endY;
		}
	}
	return max;
});

// 反转后的Y坐标（最底层是第1层）
function reversedNodeY(y: number): number {
	return nodeY(maxY.value - y);
}

function handleNodeClick(node: MapNode) {
	emit("selectFloor", node.floor);
}

// Get all floors sorted (exposed for parent wheel handling)
function getAllFloorsSorted(): number[] {
	const floors: number[] = [];
	for (const act of mapData.value.acts) {
		for (const node of act.nodes) {
			floors.push(node.floor);
		}
	}
	return floors.sort((a, b) => a - b);
}

defineExpose({ getAllFloorsSorted });

function getNodeColor(node: MapNode): string {
	return typeColors[node.type] ?? typeColors.unknown;
}

function isNodeSelected(node: MapNode): boolean {
	return props.selectedFloor === node.floor;
}

// 根据楼层号找到对应的节点
function findNodeByFloor(floor: number): MapNode | null {
	for (const act of mapData.value.acts) {
		for (const node of act.nodes) {
			if (node.floor === floor) {
				return node;
			}
		}
	}
	return null;
}

// 滚动到指定楼层
function scrollToFloor(floor: number) {
	const targetNode = findNodeByFloor(floor);
	if (targetNode && mapContainerRef.value) {
		nextTick(() => {
			if (mapContainerRef.value) {
				const nodeYPos = reversedNodeY(targetNode.y);
				const containerHeight = mapContainerRef.value.clientHeight;
				const svgHeightValue = svgHeight.value;
				const maxScrollTop = svgHeightValue - containerHeight;

				// 当前楼层固定在底部
				const scrollTop =
					nodeYPos - containerHeight + bottomPadding + nodeRadius;

				// 限制在有效范围内
				const safeScrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop));

				mapContainerRef.value.scrollTo({
					top: safeScrollTop,
					behavior: "smooth",
				});
			}
		});
	}
}

onMounted(() => {
	// 确保容器高度被正确计算
	updateContainerHeight();
	window.addEventListener("resize", updateContainerHeight);

	// 默认滚动到底部（第一层）
	if (mapContainerRef.value) {
		mapContainerRef.value.scrollTop = mapContainerRef.value.scrollHeight;
	}
});

function updateContainerHeight() {
	if (mapContainerRef.value?.parentElement) {
		containerHeight.value = mapContainerRef.value.parentElement.clientHeight;
	}
}

// 监听地图数据变化，确保布局正确
watch(mapData, () => {
	// 延迟更新确保 DOM 已更新
	setTimeout(() => {
		if (mapContainerRef.value && props.selectedFloor === undefined) {
			mapContainerRef.value.scrollTop = mapContainerRef.value.scrollHeight;
		}
	}, 0);
});

// 监听 selectedFloor 变化，实现地图联动
watch(
	() => props.selectedFloor,
	(newFloor) => {
		if (newFloor !== undefined) {
			scrollToFloor(newFloor);
		}
	},
	{ immediate: true },
);
</script>

<template>
  <div ref="mapContainerRef" class="run-map">
    <svg
      :width="svgWidth"
      :height="svgHeight"
      class="map-svg"
    >
      <!-- Draw connections -->
      <g class="connections">
        <line
          v-for="(conn, index) in connections"
          :key="`conn-${index}`"
          :x1="nodeX(conn.from.x)"
          :y1="reversedNodeY(conn.from.y)"
          :x2="nodeX(conn.to.x)"
          :y2="reversedNodeY(conn.to.y)"
          class="connection-line"
        />
      </g>

      <!-- Draw nodes -->
      <g v-for="act in mapData.acts" :key="`act-${act.actIndex}`" class="act-group">
        <!-- Act label - reversed position -->
        <text
          :x="svgWidth / 2"
          :y="reversedNodeY(act.endY) + 35"
          text-anchor="middle"
          class="act-label"
        >
          {{ actName(act.actId) }}
        </text>

        <!-- Nodes in act -->
        <g v-for="node in act.nodes" :key="node.id" class="node-group">
          <!-- Node circle -->
          <circle
            :cx="nodeX(node.x)"
            :cy="reversedNodeY(node.y)"
            :r="nodeRadius"
            :fill="getNodeColor(node)"
            :class="{ 'node-selected': isNodeSelected(node) }"
            class="node-circle"
            @click="handleNodeClick(node)"
          />

          <!-- Floor number -->
          <text
            :x="nodeX(node.x)"
            :y="reversedNodeY(node.y) + 4"
            text-anchor="middle"
            class="floor-number"
          >
            {{ node.floor }}
          </text>

          <!-- Type label -->
          <text
            :x="nodeX(node.x) + nodeRadius + 8"
            :y="reversedNodeY(node.y) + 4"
            class="type-label"
          >
            {{ mapTypeName(node.type) }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.run-map {
  overflow-y: scroll;
  overflow-x: hidden;
  flex: 1;
  background: rgba(10, 22, 40, 0.6);
  border-radius: 8px;
  padding: 0.5rem;
  height: 0;
  min-height: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.run-map::-webkit-scrollbar {
  display: none;
}

.map-svg {
  display: block;
  flex-shrink: 0;
}

.connection-line {
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 2;
}

.node-circle {
  cursor: pointer;
  transition: all 0.2s;
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 3;
}

.node-circle:hover {
  opacity: 0.9;
  stroke: #f9a825;
  stroke-width: 4;
}

.node-selected {
  stroke: #f9a825;
  stroke-width: 5;
}

.floor-number {
  font-size: 11px;
  font-weight: 600;
  fill: white;
  pointer-events: none;
}

.type-label {
  font-size: 10px;
  fill: #8aa0b8;
  pointer-events: none;
}

.act-label {
  font-size: 12px;
  font-weight: 600;
  fill: #b0c0d0;
}
</style>
