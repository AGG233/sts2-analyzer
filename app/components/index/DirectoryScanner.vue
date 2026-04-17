<script setup lang="ts">
import { FolderOpen, RefreshCw } from "@lucide/vue";
import { onMounted, ref } from "vue";
import {
	batchParseRunFiles,
	filterRunFiles,
	scanDirectoryHandle,
} from "~/data/parser";
import { useRunStore } from "~/stores/runStore";

const { t } = useI18n();
const store = useRunStore();

const scanning = ref(false);
const scanResult = ref<{ count: number } | null>(null);
const error = ref<string | null>(null);
const supportsDirectoryPicker =
	import.meta.client && "showDirectoryPicker" in window;

async function onPickDirectory() {
	if (!supportsDirectoryPicker) return;
	scanning.value = true;
	error.value = null;
	scanResult.value = null;

	try {
		const dirHandle = await (
			window as unknown as {
				showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
			}
		).showDirectoryPicker();
		const files = await scanDirectoryHandle(dirHandle);
		const parsed = await batchParseRunFiles(files);
		scanResult.value = { count: parsed.length };
		await store.setDirHandle(dirHandle);
		await store.addRuns(parsed.map((r) => r.data));
		// 触发通知
		window.dispatchEvent(
			new CustomEvent("notification", {
				detail: {
					severity: "success",
					summary: "扫描完成",
					detail: `找到 ${parsed.length} 个存档文件`,
					life: 3000,
				},
			}),
		);
	} catch (e) {
		if ((e as DOMException)?.name === "AbortError") {
			// User cancelled the picker
		} else {
			error.value = e instanceof Error ? e.message : String(e);
		}
	} finally {
		scanning.value = false;
	}
}

async function onUpdate() {
	scanning.value = true;
	error.value = null;
	try {
		const count = await store.rescan();
		scanResult.value = { count };
		// 触发通知
		window.dispatchEvent(
			new CustomEvent("notification", {
				detail: {
					severity: "success",
					summary: "更新完成",
					detail: `找到 ${count} 个存档文件`,
					life: 3000,
				},
			}),
		);
	} catch (e) {
		error.value = e instanceof Error ? e.message : String(e);
	} finally {
		scanning.value = false;
	}
}

async function onFallbackInput(event: Event) {
	const input = event.target as HTMLInputElement;
	if (!input.files) return;

	scanning.value = true;
	error.value = null;

	try {
		const files = filterRunFiles(Array.from(input.files));
		const parsed = await batchParseRunFiles(files);
		scanResult.value = { count: parsed.length };
		await store.addRuns(parsed.map((r) => r.data));
		// 触发通知
		window.dispatchEvent(
			new CustomEvent("notification", {
				detail: {
					severity: "success",
					summary: "扫描完成",
					detail: `找到 ${parsed.length} 个存档文件`,
					life: 3000,
				},
			}),
		);
	} catch (e) {
		error.value = e instanceof Error ? e.message : String(e);
	} finally {
		scanning.value = false;
	}
}

// Auto-rescan on mount if we have a stored directory handle
onMounted(async () => {
	if (store.dirHandle) {
		try {
			const handle = store.dirHandle as FileSystemDirectoryHandle & {
				queryPermission: (desc: { mode: string }) => Promise<PermissionState>;
			};
			const perm = await handle.queryPermission({ mode: "read" });
			if (perm === "granted") {
				await onUpdate();
			}
		} catch {
			// Permission not available, user can click Update manually
		}
	}
});
</script>

<template>
  <div class="scanner">
    <div class="btn-group">
      <template v-if="supportsDirectoryPicker">
        <AppButton
          :loading="scanning"
          @click="onPickDirectory"
        >
          <FolderOpen class="w-4 h-4" />
          {{ scanning ? t('home.scanning') : (store.dirHandle ? t('home.changeDir') : t('home.selectDir')) }}
        </AppButton>
        <AppButton
          v-if="store.dirHandle"
          variant="outlined"
          :loading="scanning"
          @click="onUpdate"
        >
          <RefreshCw class="w-4 h-4" />
          {{ t('home.update') }}
        </AppButton>
      </template>
      <template v-else>
        <label class="fallback-label">
          <AppButton
            :loading="scanning"
          >
            <FolderOpen class="w-4 h-4" />
            {{ scanning ? t('home.scanning') : t('home.selectDir') }}
          </AppButton>
          <input type="file" webkitdirectory :disabled="scanning" @change="onFallbackInput">
        </label>
      </template>
    </div>

    <AppMessage v-if="scanResult" severity="success" class="scan-message">
      {{ t('home.foundRuns', { count: scanResult.count }) }}
    </AppMessage>
    <AppMessage v-if="error" severity="error" class="scan-message">
      {{ error }}
    </AppMessage>
  </div>
</template>

<style scoped lang="scss">
.scanner {
  text-align: center;
  padding: $space-2xl;
}

.btn-group {
  display: inline-flex;
  gap: $space-md;
}

.fallback-label {
  position: relative;
  display: inline-block;

  input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
}

.scan-message {
  margin-top: $space-md;
}
</style>
