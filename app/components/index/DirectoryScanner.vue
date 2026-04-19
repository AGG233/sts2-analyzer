<script setup lang="ts">
import {
	AlertTriangle,
	CheckCircle2,
	FolderOpen,
	Info,
	RefreshCw,
} from "@lucide/vue";
import { onMounted, ref } from "vue";
import {
	batchParseRunFiles,
	filterRunFiles,
	scanDirectoryHandle,
} from "~/data/parser";
import { detectPlatform, getSavePathHint } from "~/lib/save-paths";
import { useRunStore } from "~/stores/runStore";

const { t } = useI18n();
const store = useRunStore();

const scanning = ref(false);
const scanResult = ref<{ count: number } | null>(null);
const error = ref<string | null>(null);
const supportsDirectoryPicker =
	import.meta.client && "showDirectoryPicker" in globalThis;

const platform = detectPlatform();
const savePathHint = getSavePathHint(platform);

type PermStatus = "granted" | "prompt" | "denied" | null;
const permissionStatus = ref<PermStatus>(null);

async function onPickDirectory() {
	if (!supportsDirectoryPicker) return;
	scanning.value = true;
	error.value = null;
	scanResult.value = null;

	try {
		const dirHandle = await (
			globalThis as unknown as {
				showDirectoryPicker: (opts?: {
					id?: string;
					startIn?: FileSystemHandle | string;
				}) => Promise<FileSystemDirectoryHandle>;
			}
		).showDirectoryPicker({
			id: "sts2-saves",
			startIn: store.dirHandle ?? "documents",
		});
		const files = await scanDirectoryHandle(dirHandle);
		const parsed = await batchParseRunFiles(files);
		scanResult.value = { count: parsed.length };
		permissionStatus.value = "granted";
		await store.setDirHandle(dirHandle);
		await store.addRuns(parsed.map((r) => r.data));
		globalThis.dispatchEvent(
			new CustomEvent("notification", {
				detail: {
					severity: "success",
					summary: t("home.scanComplete"),
					detail: t("home.foundRuns", { count: parsed.length }),
					life: 3000,
				},
			}),
		);
	} catch (e) {
		if ((e as DOMException)?.name === "AbortError") return;
		error.value = e instanceof Error ? e.message : String(e);
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
		permissionStatus.value = "granted";
		globalThis.dispatchEvent(
			new CustomEvent("notification", {
				detail: {
					severity: "success",
					summary: t("home.scanComplete"),
					detail: t("home.foundRuns", { count }),
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
		globalThis.dispatchEvent(
			new CustomEvent("notification", {
				detail: {
					severity: "success",
					summary: t("home.scanComplete"),
					detail: t("home.foundRuns", { count: parsed.length }),
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

onMounted(async () => {
	if (!store.dirHandle) return;

	const handle = store.dirHandle as FileSystemDirectoryHandle & {
		queryPermission: (desc: { mode: string }) => Promise<PermissionState>;
		requestPermission: (desc: { mode: string }) => Promise<PermissionState>;
	};

	try {
		const perm = await handle.queryPermission({ mode: "read" });
		if (perm === "granted") {
			permissionStatus.value = "granted";
			await onUpdate();
			return;
		}

		if (perm === "prompt") {
			const req = await handle.requestPermission({ mode: "read" });
			if (req === "granted") {
				permissionStatus.value = "granted";
				await onUpdate();
				return;
			}
		}

		permissionStatus.value = "denied";
	} catch {
		permissionStatus.value = null;
	}
});
</script>

<template>
  <div class="scanner">
    <!-- Save path hint (shown when no directory connected) -->
    <div v-if="!store.dirHandle && savePathHint" class="save-path-hint">
      <Info class="w-4 h-4" />
      <span>{{ t('home.savePathHint') }}</span>
      <code class="path-code">{{ savePathHint }}</code>
    </div>

    <!-- Connection status (shown when directory is connected) -->
    <div v-if="store.dirHandle" class="connection-status" :class="permissionStatus ?? ''">
      <CheckCircle2 v-if="permissionStatus === 'granted'" class="w-4 h-4 status-icon granted" />
      <AlertTriangle v-else-if="permissionStatus === 'denied'" class="w-4 h-4 status-icon denied" />
      <span v-if="permissionStatus === 'granted'" class="status-text">
        {{ scanResult ? t('home.foundRuns', { count: scanResult.count }) : t('home.connected') }}
      </span>
      <span v-else-if="permissionStatus === 'denied'" class="status-text">
        {{ t('home.permissionDenied') }}
      </span>
    </div>

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

.save-path-hint {
  display: flex;
  align-items: center;
  gap: $space-sm;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: $text-muted;
  margin-bottom: $space-md;
  padding: $space-sm $space-md;
  background: rgba(255, 255, 255, 0.03);
  border-radius: $radius-sm;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.path-code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.75rem;
  color: $accent;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 3px;
  word-break: break-all;
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-sm;
  font-size: 0.8rem;
  margin-bottom: $space-md;
  padding: $space-xs $space-sm;
  border-radius: $radius-sm;
}

.connection-status.granted {
  color: $success;
}

.connection-status.denied {
  color: $warn;
}

.status-text {
  font-size: 0.8rem;
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
