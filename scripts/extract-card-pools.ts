// Extract card pool data from decompiled Slay the Spire 2 C# source.
// Usage: npx tsx scripts/extract-card-pools.ts [game-src-dir] [version]
// Default game-src-dir: ~/src/Slay the Spire 2
// Default version: auto-detected from release_info.json or v0.15

import * as fs from "node:fs";
import * as path from "node:path";
import { detectBuildVersion } from "./lib/version-extract";

const HOME = process.env.HOME;
const GAME_SRC =
	process.argv[2] ||
	(HOME ? path.join(HOME, "src/Slay the Spire 2") : "~/src/Slay the Spire 2");
const VERSION = detectBuildVersion(GAME_SRC, process.argv[3]);

const CARD_POOL_DIR = path.join(
	GAME_SRC,
	"src/MegaCrit.Sts2.Core.Models.CardPools",
);
const CHARACTER_DIR = path.join(
	GAME_SRC,
	"src/MegaCrit.Sts2.Core.Models.Characters",
);

const POOL_CHARACTERS: Record<string, string> = {
	IroncladCardPool: "ironclad",
	SilentCardPool: "silent",
	DefectCardPool: "defect",
	RegentCardPool: "regent",
	NecrobinderCardPool: "necrobinder",
	ColorlessCardPool: "colorless",
	CurseCardPool: "curse",
	StatusCardPool: "status",
	QuestCardPool: "quest",
	TokenCardPool: "token",
	EventCardPool: "event",
};

const CHARACTERS: Record<string, string> = {
	Ironclad: "ironclad",
	Silent: "silent",
	Defect: "defect",
	Regent: "regent",
	Necrobinder: "necrobinder",
};

function pascalToScreamingSnake(str: string): string {
	return str
		.replace(/([A-Z])/g, "_$1")
		.toUpperCase()
		.replace(/^_/, "");
}

function extractCardsFromPool(filePath: string): string[] {
	const content = fs.readFileSync(filePath, "utf-8");
	const regex = /ModelDb\.Card<(\w+)>\(\)/g;
	const cards: string[] = [];
	let match: RegExpExecArray | null = regex.exec(content);
	while (match !== null) {
		cards.push(match[1]);
		match = regex.exec(content);
	}
	return cards;
}

function extractStarterCards(filePath: string): Map<string, number> {
	const content = fs.readFileSync(filePath, "utf-8");
	const deckMatch = content.match(/StartingDeck[^{]*\{([^}]+)\}/s);
	if (!deckMatch) return new Map();

	const regex = /ModelDb\.Card<(\w+)>\(\)/g;
	const counts = new Map<string, number>();
	let match: RegExpExecArray | null = regex.exec(deckMatch[1]);
	while (match !== null) {
		const cardType = match[1];
		counts.set(cardType, (counts.get(cardType) || 0) + 1);
		match = regex.exec(deckMatch[1]);
	}
	return counts;
}

interface CardPoolEntry {
	card_id: string;
	character_id: string;
	is_starter: boolean;
	game_version: string;
}

interface ExtractOutput {
	version: string;
	display_name: string;
	card_pools: CardPoolEntry[];
}

function main() {
	console.log(`Game source: ${GAME_SRC}`);
	console.log(`Version:      ${VERSION}`);

	const output: ExtractOutput = {
		version: VERSION,
		display_name: `Early Access ${VERSION}`,
		card_pools: [],
	};

	const starterCards = new Map<string, Set<string>>();
	for (const [fileName, charId] of Object.entries(CHARACTERS)) {
		const filePath = path.join(CHARACTER_DIR, `${fileName}.cs`);
		if (!fs.existsSync(filePath)) {
			console.warn(`SKIP: ${filePath} not found`);
			continue;
		}
		const counts = extractStarterCards(filePath);
		const starters = new Set<string>();
		for (const [cardType] of counts) {
			starters.add(cardType);
		}
		starterCards.set(charId, starters);
		console.log(
			`  ${charId} starters: ${[...starters].map(pascalToScreamingSnake).join(", ")}`,
		);
	}

	for (const [poolFile, charId] of Object.entries(POOL_CHARACTERS)) {
		const filePath = path.join(CARD_POOL_DIR, `${poolFile}.cs`);
		if (!fs.existsSync(filePath)) {
			console.warn(`SKIP: ${poolFile}.cs not found`);
			continue;
		}

		const cardTypes = extractCardsFromPool(filePath);
		const starters = starterCards.get(charId);

		for (const cardType of cardTypes) {
			output.card_pools.push({
				card_id: pascalToScreamingSnake(cardType),
				character_id: charId,
				is_starter: starters?.has(cardType) ?? false,
				game_version: VERSION,
			});
		}

		console.log(`  ${poolFile} (${charId}): ${cardTypes.length} cards`);
	}

	const outPath = path.join(
		import.meta.dirname ?? ".",
		"..",
		"data",
		`card-pools-v${VERSION}.json`,
	);
	fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
	console.log(`\n→ ${outPath} (${output.card_pools.length} entries)`);
}

main();
