// 从 STS2 游戏源码 atlas PNG 中裁剪卡牌纹理到 public/cards/
// Usage: npx tsx scripts/extract-card-textures.ts [game-src-dir]
// Default game-src-dir: ~/src/Slay the Spire 2

import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

const HOME = process.env.HOME;
const GAME_SRC =
	process.argv[2] ||
	(HOME ? path.join(HOME, "src/Slay the Spire 2") : "~/src/Slay the Spire 2");

const ATLASES_DIR = path.join(GAME_SRC, "images/atlases");
const OUTPUT_DIR = path.join(
	import.meta.dirname ?? ".",
	"..",
	"public",
	"cards",
);

// atlas 缓存
const atlasCache = new Map<string, sharp.Sharp>();

async function loadAtlas(name: string): Promise<sharp.Sharp> {
	const cached = atlasCache.get(name);
	if (cached) return cached;
	const img = sharp(path.join(ATLASES_DIR, name));
	atlasCache.set(name, img);
	return img;
}

// 解析 .tres 文件获取 region 和 atlas 引用
interface TresData {
	region: { x: number; y: number; w: number; h: number };
	atlas: string;
}

function parseTres(filePath: string): TresData | null {
	const content = fs.readFileSync(filePath, "utf-8");
	const regionMatch = content.match(
		/region\s*=\s*Rect2\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/,
	);
	if (!regionMatch) return null;

	// 查找 atlas 引用
	const atlasMatch = content.match(
		/path\s*=\s*"res:\/\/images\/atlases\/([^"]+)"/,
	);
	if (!atlasMatch) return null;

	return {
		region: {
			x: Number.parseInt(regionMatch[1], 10),
			y: Number.parseInt(regionMatch[2], 10),
			w: Number.parseInt(regionMatch[3], 10),
			h: Number.parseInt(regionMatch[4], 10),
		},
		atlas: atlasMatch[1],
	};
}

async function cropAndSave(
	atlasName: string,
	region: { x: number; y: number; w: number; h: number },
	outputPath: string,
): Promise<void> {
	const atlas = await loadAtlas(atlasName);
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	await atlas
		.clone()
		.extract({
			left: region.x,
			top: region.y,
			width: region.w,
			height: region.h,
		})
		.png()
		.toFile(outputPath);
}

// UI 纹理硬编码坐标
const UI_TEXTURES: Array<{
	output: string;
	atlas: string;
	x: number;
	y: number;
	w: number;
	h: number;
}> = [
	// frames
	{
		output: "frames/attack.png",
		atlas: "ui_atlas_0.png",
		x: 1320,
		y: 83,
		w: 598,
		h: 844,
	},
	{
		output: "frames/skill.png",
		atlas: "ui_atlas_0.png",
		x: 1221,
		y: 929,
		w: 598,
		h: 844,
	},
	{
		output: "frames/power.png",
		atlas: "ui_atlas_0.png",
		x: 621,
		y: 929,
		w: 598,
		h: 844,
	},
	{
		output: "frames/quest.png",
		atlas: "ui_atlas_0.png",
		x: 719,
		y: 83,
		w: 599,
		h: 844,
	},
	{
		output: "frames/ancient.png",
		atlas: "ui_atlas_0.png",
		x: 1,
		y: 901,
		w: 618,
		h: 862,
	},
	// banners
	{
		output: "banners/banner.png",
		atlas: "ui_atlas_1.png",
		x: 674,
		y: 1,
		w: 653,
		h: 145,
	},
	{
		output: "banners/ancient_banner.png",
		atlas: "ui_atlas_1.png",
		x: 1,
		y: 1,
		w: 671,
		h: 182,
	},
	// borders
	{
		output: "borders/attack.png",
		atlas: "ui_atlas_1.png",
		x: 1329,
		y: 1,
		w: 551,
		h: 420,
	},
	{
		output: "borders/skill.png",
		atlas: "ui_atlas_1.png",
		x: 1313,
		y: 423,
		w: 551,
		h: 420,
	},
	{
		output: "borders/power.png",
		atlas: "ui_atlas_1.png",
		x: 674,
		y: 148,
		w: 551,
		h: 420,
	},
	{
		output: "borders/plaque.png",
		atlas: "ui_atlas_0.png",
		x: 197,
		y: 1948,
		w: 123,
		h: 75,
	},
	// energy
	{
		output: "energy/ironclad.png",
		atlas: "ui_atlas_0.png",
		x: 1440,
		y: 1948,
		w: 74,
		h: 74,
	},
];

async function main() {
	console.log(`Game source: ${GAME_SRC}`);
	console.log(`Output:      ${OUTPUT_DIR}`);

	if (!fs.existsSync(ATLASES_DIR)) {
		console.error(`ERROR: ${ATLASES_DIR} not found`);
		process.exit(1);
	}

	// 1. 裁剪 UI 纹理（硬编码坐标）
	console.log("\n--- UI textures ---");
	for (const tex of UI_TEXTURES) {
		const outputPath = path.join(OUTPUT_DIR, tex.output);
		await cropAndSave(
			tex.atlas,
			{ x: tex.x, y: tex.y, w: tex.w, h: tex.h },
			outputPath,
		);
		console.log(`  ${tex.output} (${tex.w}×${tex.h})`);
	}

	// 2. 裁剪 energy 图标（遍历 .tres）
	console.log("\n--- Energy icons ---");
	const energyDir = path.join(ATLASES_DIR, "ui_atlas.sprites", "card");
	const energyFiles = fs
		.readdirSync(energyDir)
		.filter((f) => f.startsWith("energy_") && f.endsWith(".tres"));

	for (const file of energyFiles) {
		const charName = file.replace("energy_", "").replace(".tres", "");
		const data = parseTres(path.join(energyDir, file));
		if (!data) {
			console.warn(`  SKIP: ${file} (parse failed)`);
			continue;
		}
		const outputPath = path.join(OUTPUT_DIR, "energy", `${charName}.png`);
		await cropAndSave(data.atlas, data.region, outputPath);
		console.log(`  energy/${charName}.png (${data.region.w}×${data.region.h})`);
	}

	// 3. 裁剪 portrait（遍历 card_atlas.sprites/{character}/*.tres）
	console.log("\n--- Card portraits ---");
	const cardSpritesDir = path.join(ATLASES_DIR, "card_atlas.sprites");
	const charDirs = fs.readdirSync(cardSpritesDir).filter((d) => {
		const p = path.join(cardSpritesDir, d);
		return fs.statSync(p).isDirectory();
	});

	let portraitCount = 0;
	let skippedCount = 0;

	for (const charDir of charDirs) {
		const dirPath = path.join(cardSpritesDir, charDir);
		const tresFiles = fs
			.readdirSync(dirPath)
			.filter((f) => f.endsWith(".tres"));

		for (const file of tresFiles) {
			const data = parseTres(path.join(dirPath, file));
			if (!data) {
				skippedCount++;
				continue;
			}
			const cardName = file.replace(".tres", "");
			const outputPath = path.join(
				OUTPUT_DIR,
				"portraits",
				charDir,
				`${cardName}.png`,
			);
			await cropAndSave(data.atlas, data.region, outputPath);
			portraitCount++;
		}
	}

	console.log(
		`\nPortraits: ${portraitCount} extracted, ${skippedCount} skipped`,
	);
	console.log(`\n→ ${OUTPUT_DIR}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
