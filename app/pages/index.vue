<script setup lang="ts">
import { BarChart3 } from "@lucide/vue";
import { computed, ref } from "vue";
import { getWinRateByCharacter } from "~/data/analytics";
import { useRunStore } from "~/stores/runStore";

const store = useRunStore();
const { t } = useI18n();
const selectedCharacter = ref<string>("");
const rightTab = ref<"chart" | "list">("chart");

const characterStats = computed(() => {
	return getWinRateByCharacter(store.runs);
});
</script>

<template>
  <div class="home">
    <!-- Left sidebar -->
    <aside class="left-panel">
      <div class="panel-header">
        <h1 class="app-title">
          <BarChart3 class="w-6 h-6" />
          {{ t('app.title') }}
        </h1>
      </div>

      <div class="panel-content">
        <ClientOnly fallback="Loading scanner...">
          <IndexDirectoryScanner />
        </ClientOnly>

        <IndexStatsOverview
          v-if="store.runs.length > 0"
          :total="store.runs.length"
          :wins="store.wins"
          :losses="store.losses"
        />

        <IndexCharacterStatsTable
          v-if="characterStats.length > 0"
          :stats="characterStats"
        />
      </div>

      <div class="panel-footer">
        <AppLanguageSwitch />
      </div>
    </aside>

    <!-- Right panel -->
    <main class="right-panel">
      <!-- Header: character filter + tabs on one row -->
      <div class="right-header" v-if="store.runs.length > 0 || characterStats.length > 0">
        <IndexCharacterFilter
          v-if="characterStats.length > 0"
          v-model="selectedCharacter"
          :character-stats="characterStats"
        />

        <IndexTabSwitcher
          v-if="store.runs.length > 0"
          v-model="rightTab"
        />
      </div>

      <!-- Card Pick Analysis -->
      <KeepAlive>
        <div v-show="rightTab === 'chart' && store.runs.length > 0" class="card-pick-section">
          <CardPickRateChart :character-id="selectedCharacter" />
        </div>
      </KeepAlive>

      <!-- Run List -->
      <KeepAlive>
        <div v-show="rightTab === 'list' && store.runs.length > 0" class="run-list-section">
          <IndexRunList :summaries="store.summaries" :character-filter="selectedCharacter" />
        </div>
      </KeepAlive>
    </main>
  </div>
</template>

<style scoped lang="scss">
.home {
  display: flex;
  gap: 0;
  height: 100vh;
  overflow: hidden;
}

.left-panel {
  flex: 0 0 320px;
  background: rgba(6, 13, 31, 0.92);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
  border-radius: 0;
  padding: $space-xl;
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex: 1;
  background: rgba(10, 22, 40, 0.75);
  border-radius: 0;
  padding: $space-xl;
  overflow-y: auto;
}

.right-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-xl;
}

.panel-header {
  margin-bottom: $space-xl;
}

.app-title {
  font-size: 1.2rem;
  color: $warn;
  display: flex;
  align-items: center;
  gap: $space-sm;
  margin: 0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  @include dark-scrollbar;
}

.panel-footer {
  margin-top: auto;
  padding-top: $space-lg;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.card-pick-section {
  h2 {
    font-size: 1.2rem;
    margin: $space-2xl 0 $space-lg;
    color: $text-primary;
  }
}
</style>
