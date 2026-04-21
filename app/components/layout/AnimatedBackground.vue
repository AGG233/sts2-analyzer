<script setup lang="ts">
import type { Spine } from "@esotericsoftware/spine-pixi-v8";
import type { Application, Container } from "pixi.js";
import { onMounted, onUnmounted, ref } from "vue";

const containerRef = ref<HTMLDivElement | null>(null);
let app: Application | null = null;
let resizeObserver: ResizeObserver | null = null;

const loadSpineBackground = async () => {
	if (!containerRef.value) return;

	// Dynamically import all dependencies
	const [pixiModule, spinePixiModule, spineCoreModule] = await Promise.all([
		import("pixi.js"),
		import("@esotericsoftware/spine-pixi-v8"),
		import("@esotericsoftware/spine-core"),
	]);

	const { Application, Assets } = pixiModule;
	const { Spine, SpineTexture } = spinePixiModule;
	const { SkeletonBinary, TextureAtlas, AtlasAttachmentLoader } =
		spineCoreModule;

	// Initialize PixiJS Application with transparent background
	app = new Application();
	await app.init({
		width: globalThis.innerWidth,
		height: globalThis.innerHeight,
		backgroundAlpha: 0,
		antialias: true,
		resolution: globalThis.devicePixelRatio || 1,
		autoDensity: true,
	});

	// Append canvas to our container
	const canvas = app.canvas as HTMLCanvasElement;
	canvas.style.position = "absolute";
	canvas.style.top = "0";
	canvas.style.left = "0";
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	canvas.style.pointerEvents = "none";
	if (!containerRef.value) {
		app.destroy(true);
		app = null;
		return;
	}
	containerRef.value.appendChild(canvas);

	// Spine asset paths
	const spineBasePath = new URL(
		"spine/mainmenu",
		globalThis.location?.href ?? "/",
	).href;
	const layers = [
		{ dir: "bottom", name: "main_menu_bottom", scale: 0.66 },
		{ dir: "top", name: "main_menu_top", scale: 0.66 },
		{ dir: "logo", name: "main_menu_logo", scale: 0.45 },
	];

	const stage = app.stage as Container;

	// Helper function to load a spine layer
	const loadSpineLayer = async (
		dir: string,
		name: string,
		scale: number,
	): Promise<Spine> => {
		const basePath = `${spineBasePath}/${dir}`;

		const [skelBuffer, atlasText] = await Promise.all([
			fetch(`${basePath}/${name}.skel`).then((r) => r.arrayBuffer()),
			fetch(`${basePath}/${name}.atlas`).then((r) => r.text()),
		]);

		// Parse atlas (constructor only takes one arg — texture binding done separately)
		const atlas = new TextureAtlas(atlasText);

		// Bind textures to each page via page.setTexture(), which propagates to all regions
		for (const page of atlas.pages) {
			const texAsset = await Assets.load(`${basePath}/${page.name}`);
			page.setTexture(SpineTexture.from(texAsset.source));
		}

		// Parse skeleton — regions now have textures, so AtlasAttachmentLoader works correctly
		const attachmentLoader = new AtlasAttachmentLoader(atlas);
		const skelBinary = new SkeletonBinary(attachmentLoader);
		skelBinary.scale = scale;
		const skeletonData = skelBinary.readSkeletonData(
			new Uint8Array(skelBuffer),
		);

		// Don't pass scale to Spine constructor — skelBinary.scale already handles it
		const spine = new Spine({ skeletonData, autoUpdate: true });

		return spine;
	};

	// Scale spine to cover the entire screen (like CSS background-size: cover)
	const coverSpine = (spine: Spine) => {
		if (!app) return;
		const bounds = spine.getLocalBounds();
		if (bounds.width <= 0 || bounds.height <= 0) return;

		// 计算覆盖整个屏幕的缩放比例，考虑宽高比
		const screenAspect = app.screen.width / app.screen.height;
		const spineAspect = bounds.width / bounds.height;

		let coverScale: number;

		// 确保Spine覆盖整个屏幕，考虑宽高比
		if (screenAspect > spineAspect) {
			coverScale = app.screen.width / bounds.width;
		} else {
			coverScale = app.screen.height / bounds.height;
		}

		// 增加安全系数，确保边缘无撕裂
		coverScale *= 1.05;

		spine.scale.set(coverScale);

		// 居中
		spine.position.set(
			app.screen.width / 2 - (bounds.x + bounds.width / 2) * coverScale,
			app.screen.height / 2 - (bounds.y + bounds.height / 2) * coverScale,
		);
	};

	// Position logo layer — smaller scale, centered at top portion of screen
	const positionLogo = (spine: Spine, scale: number) => {
		if (!app) return;
		const bounds = spine.getLocalBounds();
		if (bounds.width <= 0 || bounds.height <= 0) return;

		spine.scale.set(scale);

		// Center horizontally, position in upper portion of screen
		spine.position.set(
			app.screen.width / 2 - (bounds.x + bounds.width / 2) * scale,
			app.screen.height * 0.3 - (bounds.y + bounds.height / 2) * scale,
		);
	};

	for (const layer of layers) {
		try {
			const spine = await loadSpineLayer(layer.dir, layer.name, layer.scale);

			// Add to stage first, then position based on visual bounds
			stage.addChild(spine);

			// Use different positioning for logo vs background layers
			if (layer.dir === "logo") {
				positionLogo(spine, layer.scale);
			} else {
				coverSpine(spine);
			}

			// Start animation - use first available animation
			const state = spine.state;
			if (state?.data?.animations?.length > 0) {
				state.setAnimation(0, state.data.animations[0].name, true);
			}
		} catch (error) {
			console.warn(`Failed to load spine layer: ${layer.name}`, error);
		}
	}

	// Handle resize
	resizeObserver = new ResizeObserver(() => {
		if (app) {
			app.renderer.resize(globalThis.innerWidth, globalThis.innerHeight);
			// Re-position spines after resize
			stage.children.forEach((child: Container, index: number) => {
				const layer = layers[index];
				if (!layer) return;
				if (layer.dir === "logo") {
					positionLogo(child as Spine, layer.scale);
				} else {
					coverSpine(child as Spine);
				}
			});
		}
	});
	resizeObserver.observe(document.body);
};

onMounted(async () => {
	await new Promise((resolve) => setTimeout(resolve, 0));
	if (containerRef.value) {
		try {
			await loadSpineBackground();
		} catch (error) {
			console.warn("Failed to load animated background:", error);
		}
	}
});

onUnmounted(() => {
	resizeObserver?.disconnect();
	if (app) {
		app.destroy(true, { children: true, texture: true });
		app = null;
	}
});
</script>

<template>
  <div class="animated-bg">
    <!-- CSS gradient fallback background -->
    <div class="bg-gradient" />

    <!-- Spine canvas container -->
    <div ref="containerRef" class="spine-container" />
  </div>
</template>

<style scoped lang="scss">
.animated-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    #030610 0%,
    #060d1f 20%,
    #0a1628 50%,
    #0d1f3c 75%,
    #101e38 100%
  );
}

.spine-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;

  :deep(canvas) {
    display: block;
  }
}
</style>