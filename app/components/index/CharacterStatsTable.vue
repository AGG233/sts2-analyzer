<script setup lang="ts">
import type { CharacterWinRate } from "~/data/analytics";
import { useGameI18n } from "~/locales/lookup";

const props = defineProps<{
	stats: CharacterWinRate[];
}>();

const { t } = useI18n();
const { characterName } = useGameI18n();

function getWinRateSeverity(rate: number): "success" | "warn" | "danger" {
	if (rate >= 0.5) return "success";
	if (rate >= 0.25) return "warn";
	return "danger";
}
</script>

<template>
  <div class="character-stats">
    <h2>{{ t('home.characterStats') }}</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="text-left bg-white/5">
          <tr>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.character') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.wins') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.losses') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.total') }}</th>
            <th class="px-4 py-3 font-medium text-gray-200">{{ t('home.winRate') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          <tr v-for="stat in stats" :key="stat.character" class="hover:bg-white/5 transition-colors">
            <td class="px-4 py-3">{{ characterName(stat.character) }}</td>
            <td class="px-4 py-3">
              <AppTag severity="success">{{ stat.wins }}</AppTag>
            </td>
            <td class="px-4 py-3">
              <AppTag severity="danger">{{ stat.losses }}</AppTag>
            </td>
            <td class="px-4 py-3">{{ stat.total }}</td>
            <td class="px-4 py-3">
              <AppTag :severity="getWinRateSeverity(stat.winRate)">
                {{ `${(stat.winRate * 100).toFixed(1)}%` }}
              </AppTag>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.character-stats {
  h2 {
    font-size: 1.1rem;
    margin: $space-xl 0 $space-md;
    color: $text-primary;
  }
}
</style>
