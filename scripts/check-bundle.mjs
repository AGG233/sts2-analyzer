import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientOutputDir = path.join(projectRoot, ".output", "public", "_nuxt");
const i18nOutputDir = path.join(projectRoot, ".output", "public", "_i18n");
const localeSourceDir = path.join(projectRoot, "app", "locales");

const chunkExtensions = new Set([".js", ".css"]);
const compressedExtensions = [".br", ".gz"];

async function main() {
	const outputExists = await exists(clientOutputDir);
	if (!outputExists) {
		throw new Error("未找到 .output/public/_nuxt，请先运行 pnpm build");
	}

	const [assetRows, outputLocaleRows, sourceLocaleRows] = await Promise.all([
		collectTopLevelAssets(clientOutputDir),
		collectOutputLocales(i18nOutputDir),
		collectLocaleSources(localeSourceDir),
	]);

	if (assetRows.length === 0) {
		throw new Error("未找到可分析的前端构建产物");
	}

	const sortedAssets = [...assetRows].sort((left, right) => right.size - left.size);
	const sortedOutputLocales = [...outputLocaleRows].sort(
		(left, right) => right.size - left.size,
	);
	const sortedSourceLocales = [...sourceLocaleRows].sort(
		(left, right) => right.size - left.size,
	);
	const largestAsset = sortedAssets[0];
	const totalJsBytes = sumBy(
		sortedAssets.filter((asset) => path.extname(asset.name) === ".js"),
		(asset) => asset.size,
	);
	const totalCssBytes = sumBy(
		sortedAssets.filter((asset) => path.extname(asset.name) === ".css"),
		(asset) => asset.size,
	);
	const totalOutputLocaleBytes = sumBy(
		sortedOutputLocales,
		(asset) => asset.size,
	);
	const totalLocaleSourceBytes = sumBy(
		sortedSourceLocales,
		(asset) => asset.size,
	);

	console.log("Bundle summary");
	console.log(`- largest chunk: ${largestAsset.name} (${formatBytes(largestAsset.size)})`);
	console.log(`- total js chunks: ${formatBytes(totalJsBytes)}`);
	console.log(`- total css chunks: ${formatBytes(totalCssBytes)}`);
	console.log(`- lazy locale payload: ${formatBytes(totalOutputLocaleBytes)}`);
	console.log(`- locale source total: ${formatBytes(totalLocaleSourceBytes)}`);
	console.log("");
	console.log("Top 10 chunks");
	for (const asset of sortedAssets.slice(0, 10)) {
		console.log(`- ${asset.name}: ${formatBytes(asset.size)}`);
	}

	if (sortedOutputLocales.length > 0) {
		console.log("");
		console.log("Lazy locale payloads");
		for (const locale of sortedOutputLocales) {
			console.log(`- ${locale.name}: ${formatBytes(locale.size)}`);
		}
	}

	if (sortedSourceLocales.length > 0) {
		console.log("");
		console.log("Locale source sizes");
		for (const locale of sortedSourceLocales) {
			console.log(`- ${locale.name}: ${formatBytes(locale.size)}`);
		}
	}
}

async function collectTopLevelAssets(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const assets = [];

	for (const entry of entries) {
		if (!entry.isFile()) {
			continue;
		}

		if (compressedExtensions.some((extension) => entry.name.endsWith(extension))) {
			continue;
		}

		if (!chunkExtensions.has(path.extname(entry.name))) {
			continue;
		}

		const fullPath = path.join(directory, entry.name);
		const fileStat = await stat(fullPath);
		assets.push({
			name: entry.name,
			size: fileStat.size,
		});
	}

	return assets;
}

async function collectLocaleSources(directory) {
	const directoryExists = await exists(directory);
	if (!directoryExists) {
		return [];
	}

	const entries = await readdir(directory, { withFileTypes: true });
	const locales = [];

	for (const entry of entries) {
		if (!entry.isFile() || path.extname(entry.name) !== ".json") {
			continue;
		}

		const fullPath = path.join(directory, entry.name);
		const contents = await readFile(fullPath, "utf8");
		locales.push({
			name: entry.name,
			size: Buffer.byteLength(contents),
		});
	}

	return locales;
}

async function collectOutputLocales(directory) {
	const directoryExists = await exists(directory);
	if (!directoryExists) {
		return [];
	}

	const rows = [];
	for (const hashedDirectory of await readdir(directory, { withFileTypes: true })) {
		if (!hashedDirectory.isDirectory()) {
			continue;
		}

		const hashDirPath = path.join(directory, hashedDirectory.name);
		for (const localeDirectory of await readdir(hashDirPath, { withFileTypes: true })) {
			if (!localeDirectory.isDirectory()) {
				continue;
			}

			const localeFilePath = path.join(
				hashDirPath,
				localeDirectory.name,
				"messages.json",
			);
			if (!(await exists(localeFilePath))) {
				continue;
			}

			const fileStat = await stat(localeFilePath);
			rows.push({
				name: `${localeDirectory.name}/messages.json`,
				size: fileStat.size,
			});
		}
	}

	return rows;
}

async function exists(targetPath) {
	try {
		await stat(targetPath);
		return true;
	} catch {
		return false;
	}
}

function sumBy(list, getValue) {
	return list.reduce((total, item) => total + getValue(item), 0);
}

function formatBytes(bytes) {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KiB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
