<script setup lang="ts">
import { ArrowDown, ArrowUp, ArrowUpDown } from "@lucide/vue";

type RowData = Record<string, unknown>;

interface Column {
	field?: string;
	header: string;
	sortable?: boolean;
	body?: (data: RowData) => unknown;
	class?: string;
}

interface Props {
	value: RowData[];
	sortMode?: "single" | "multiple";
	removableSort?: boolean;
	rowHover?: boolean;
	paginator?: boolean;
	rows?: number;
	class?: string;
}

const props = withDefaults(defineProps<Props>(), {
	sortMode: "single",
	removableSort: false,
	rowHover: false,
	paginator: false,
	rows: 20,
	class: "",
});

const emit = defineEmits<(e: "row-click", data: { data: RowData }) => void>();

const _slots = defineSlots<{
	default(props: { columns: Column[] }): unknown;
}>();

const sortField = ref<string | null>(null);
const sortOrder = ref<1 | -1>(1);
const currentPage = ref(1);

const sortedValue = computed(() => {
	let result = [...props.value];
	if (sortField.value) {
		result.sort((a, b) => {
			const aVal = a[sortField.value as keyof typeof a];
			const bVal = b[sortField.value as keyof typeof b];
			if (aVal < bVal) return sortOrder.value === 1 ? -1 : 1;
			if (aVal > bVal) return sortOrder.value === 1 ? 1 : -1;
			return 0;
		});
	}
	return result;
});

const paginatedValue = computed(() => {
	if (!props.paginator) return sortedValue.value;
	const start = (currentPage.value - 1) * props.rows;
	return sortedValue.value.slice(start, start + props.rows);
});

const totalPages = computed(() => {
	if (!props.paginator) return 1;
	return Math.ceil(props.value.length / props.rows);
});

function _toggleSort(field: string) {
	if (sortField.value === field) {
		if (sortOrder.value === 1) {
			sortOrder.value = -1;
		} else if (props.removableSort) {
			sortField.value = null;
		} else {
			sortOrder.value = 1;
		}
	} else {
		sortField.value = field;
		sortOrder.value = 1;
	}
}

function _getSortIcon(
	field: string,
): typeof ArrowUpDown | typeof ArrowUp | typeof ArrowDown {
	if (sortField.value !== field) return ArrowUpDown;
	return sortOrder.value === 1 ? ArrowUp : ArrowDown;
}
</script>

<template>
  <div :class="['app-data-table', props.class]">
    <div class="table-container overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-white/5">
            <!-- SonarQube S5256: slot receives th elements from parent -->
            <slot name="header" />
            <th v-if="!$slots.header" class="px-4 py-3 font-medium text-gray-200" scope="col" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in paginatedValue"
            :key="idx"
            class="border-t border-white/5 transition-colors"
            :class="{ 'hover:bg-white/5': rowHover, 'cursor-pointer': $emit('row-click') }"
            @click="$emit('row-click', { data: row })"
          >
            <slot name="body" :data="row" :index="idx" />
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="paginator && totalPages > 1" class="paginator flex items-center justify-center gap-2 mt-4">
      <button
        :disabled="currentPage === 1"
        @click="currentPage--"
        class="px-3 py-1 rounded disabled:opacity-50"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <span class="text-sm text-gray-400">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <button
        :disabled="currentPage === totalPages"
        @click="currentPage++"
        class="px-3 py-1 rounded disabled:opacity-50"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-data-table {
  background: rgba(255, 255, 255, 0.02);
  border-radius: $radius-lg;
}

table {
  font-size: 0.9rem;
}

thead th {
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: $text-primary;
  padding: $space-md $space-lg;
  text-align: left;
  font-weight: 500;
}

tbody td {
  padding: $space-md $space-lg;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: $text-primary;
}
</style>
