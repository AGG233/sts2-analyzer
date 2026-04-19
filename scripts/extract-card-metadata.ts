// Extract card metadata (cost, type, rarity, target, tags) from decompiled C# source.
// Usage: npx tsx scripts/extract-card-metadata.ts [game-src-dir] [version]
// Default game-src-dir: ~/src/Slay the Spire 2
// Default version: 0.15

import * as fs from "node:fs";
import * as path from "node:path";

const HOME = process.env.HOME;
const GAME_SRC =
	process.argv[2] ||
	(HOME ? path.join(HOME, "src/Slay the Spire 2") : "~/src/Slay the Spire 2");
const VERSION = process.argv[3] || "0.15";

const CARD_DIR = path.join(
	GAME_SRC,
	"src/MegaCrit.Sts2.Core.Models.Cards",
);
const CARD_POOLS_PATH = path.join(
	import.meta.dirname ?? ".",
	"..",
	"data",
	`card-pools-v${VERSION}.json`,
);

function pascalToScreamingSnake(str: string): string {
	return str
		.replace(/([A-Z])/g, "_$1")
		.toUpperCase()
		.replace(/^_/, "");
}

interface CardPoolEntry {
	card_id: string;
	character_id: string;
	is_starter: boolean;
	game_version: string;
}

interface CardMetadata {
	cost: number;
	type: string;
	rarity: string;
	target: string;
	tags: string[];
	character_id?: string;
	is_starter?: boolean;
}

interface ExtractOutput {
	version: string;
	cards: Record<string, CardMetadata>;
}

function extractMetadata(content: string): {
	cost: number;
	type: string;
	rarity: string;
	target: string;
} | null {
	const match = content.match(
		/base\(\s*(-?\d+)\s*,\s*CardType\.(\w+)\s*,\s*CardRarity\.(\w+)\s*,\s*TargetType\.(\w+)\s*\)/,
	);
	if (!match) return null;
	return {
		cost: Number.parseInt(match[1], 10),
		type: match[2],
		rarity: match[3],
		target: match[4],
	};
}

function extractTags(content: string): string[] {
	const tags: string[] = [];
	const tagRegex = /CardTag\.(\w+)/g;
	let match;
	while ((match = tagRegex.exec(content)) !== null) {
		const tag = match[1];
		if (!tags.includes(tag)) tags.push(tag);
	}
	return tags;
}

function main() {
	console.log(`Game source: ${GAME_SRC}`);
	console.log(`Version:      ${VERSION}`);

	let poolEntries: CardPoolEntry[] = [];
	if (fs.existsSync(CARD_POOLS_PATH)) {
		const poolData = JSON.parse(fs.readFileSync(CARD_POOLS_PATH, "utf-8"));
		poolEntries = poolData.card_pools ?? [];
		console.log(`Loaded ${poolEntries.length} card-pool entries`);
	} else {
		console.warn(`SKIP: ${CARD_POOLS_PATH} not found`);
	}

	const poolMap = new Map<string, { character_id: string; is_starter: boolean }>();
	for (const entry of poolEntries) {
		poolMap.set(entry.card_id, {
			character_id: entry.character_id,
			is_starter: entry.is_starter,
		});
	}

	const files = fs.readdirSync(CARD_DIR).filter((f) => f.endsWith(".cs"));
	console.log(`Found ${files.length} card files`);

	const output: ExtractOutput = {
		version: VERSION,
		cards: {},
	};

	let matched = 0;
	let skipped = 0;

	for (const file of files) {
		const className = path.basename(file, ".cs");
		const cardId = pascalToScreamingSnake(className);
		const content = fs.readFileSync(path.join(CARD_DIR, file), "utf-8");

		const meta = extractMetadata(content);
		if (!meta) {
			skipped++;
			continue;
		}

		const tags = extractTags(content);
		const poolInfo = poolMap.get(cardId);

		output.cards[cardId] = {
			...meta,
			tags,
			...(poolInfo
				? { character_id: poolInfo.character_id, is_starter: poolInfo.is_starter }
				: {}),
		};
		matched++;
	}

	const missingFromSource: string[] = [];
	for (const entry of poolEntries) {
		if (!output.cards[entry.card_id]) {
			missingFromSource.push(entry.card_id);
			output.cards[entry.card_id] = {
				cost: -1,
				type: "Unknown",
				rarity: "Unknown",
				target: "None",
				tags: [],
				character_id: entry.character_id,
				is_starter: entry.is_starter,
			};
		}
	}

	const outPath = path.join(
		import.meta.dirname ?? ".",
		"..",
		"data",
		`card-metadata-v${VERSION}.json`,
	);
	fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

	console.log(`\nMatched:  ${matched}`);
	console.log(`Skipped:  ${skipped}`);
	console.log(
		`Missing from source: ${missingFromSource.length} ${missingFromSource.length > 0 ? `(${missingFromSource.slice(0, 10).join(", ")}${missingFromSource.length > 10 ? "..." : ""})` : ""}`,
	);
	console.log(`Total:    ${Object.keys(output.cards).length}`);
	console.log(`\n→ ${outPath}`);
}

main();
