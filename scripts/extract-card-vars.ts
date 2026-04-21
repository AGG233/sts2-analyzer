// 从反编译的 C# 源码中提取卡牌和遗物的 DynamicVar 数据（基础值 + 升级加成）
// 用法: npx tsx scripts/extract-card-vars.ts [game-src-dir] [version]
// 默认版本: 从 release_info.json 自动检测，回退到 v0.15

import * as fs from "node:fs";
import * as path from "node:path";
import { detectBuildVersion } from "./lib/version-extract";

const HOME = process.env.HOME;
const GAME_SRC =
	process.argv[2] ||
	(HOME ? path.join(HOME, "src/Slay the Spire 2") : "~/src/Slay the Spire 2");
const VERSION = detectBuildVersion(GAME_SRC, process.argv[3]);

const CARD_DIR = path.join(GAME_SRC, "src/MegaCrit.Sts2.Core.Models.Cards");
const RELIC_DIR = path.join(GAME_SRC, "src/MegaCrit.Sts2.Core.Models.Relics");

// PowerVar<T> 的默认名称映射：类型参数 → DynamicVar.Name
const POWER_TYPE_TO_NAME: Record<string, string> = {
	VulnerablePower: "VulnerablePower",
	WeakPower: "WeakPower",
	PoisonPower: "PoisonPower",
	StrengthPower: "StrengthPower",
	DexterityPower: "DexterityPower",
	FrailPower: "FrailPower",
	RitualPower: "RitualPower",
	ThornsPower: "ThornsPower",
	RegenerationPower: "RegenerationPower",
	VenomPower: "VenomPower",
	SlowPower: "SlowPower",
	EntangledPower: "EntangledPower",
	NoDrawPower: "NoDrawPower",
	MalleablePower: "MalleablePower",
	CombustPower: "CombustPower",
	PlatedArmorPower: "PlatedArmorPower",
	FlameBarrierPower: "FlameBarrierPower",
	BrutalityPower: "BrutalityPower",
	MagnetismPower: "MagnetismPower",
	FocusPower: "FocusPower",
	FrozenPower: "FrozenPower",
	DrawPower: "DrawPower",
	EnergyPower: "EnergyPower",
	IntangiblePower: "IntangiblePower",
	BerserkPower: "BerserkPower",
	DemonFormPower: "DemonFormPower",
	RagePower: "RagePower",
	ShacklePower: "ShacklePower",
	WraithPower: "WraithPower",
	MetallicizePower: "MetallicizePower",
	NextTurnBlockPower: "NextTurnBlockPower",
	ArtifactPower: "ArtifactPower",
	JuggernautPower: "JuggernautPower",
	EvolvePower: "EvolvePower",
	BiasedCognitionPower: "BiasedCognitionPower",
	EquilibriumPower: "EquilibriumPower",
	ConsumePower: "ConsumePower",
	FireBreathingPower: "FireBreathingPower",
	IceBarrierPower: "IceBarrierPower",
	AirbornePower: "AirbornePower",
	LockOnPower: "LockOnPower",
	StaticDischargePower: "StaticDischargePower",
	HealingPower: "HealingPower",
	ReboundPower: "ReboundPower",
	ThunderStrikePower: "ThunderStrikePower",
	BufferPower: "BufferPower",
	LoopPower: "LoopPower",
	PhantasmalPower: "PhantasmalPower",
	SuperconductorPower: "SuperconductorPower",
	ArcaneShieldPower: "ArcaneShieldPower",
	OverloadPower: "OverloadPower",
	AmplifyPower: "AmplifyPower",
	ConductivityPower: "ConductivityPower",
	FrostbitePower: "FrostbitePower",
	OrbChannelPower: "OrbChannelPower",
	BarragePower: "BarragePower",
	LambdaPower: "LambdaPower",
	StranglePower: "StranglePower",
	ChaosPower: "ChaosPower",
	WisdomPower: "WisdomPower",
	ViolencePower: "ViolencePower",
};

interface ExtractedVar {
	name: string;
	type: string;
	base_value: number;
}

interface CardVarEntry {
	vars: ExtractedVar[];
	upgrades: Record<string, number>;
	energy_upgrade?: number;
}

interface ExtractOutput {
	version: string;
	cards: Record<string, CardVarEntry>;
	relics: Record<string, CardVarEntry>;
}

function pascalToScreamingSnake(str: string): string {
	return str
		.replace(/([A-Z])/g, "_$1")
		.toUpperCase()
		.replace(/^_/, "");
}

// 移除 ValueProp.Move 等 ValueProp 参数，只保留数值部分
function stripValueProp(args: string): string {
	return args.replace(/,\s*ValueProp\.\w+$/, "").trim();
}

// 解析 "name, value" 或 "value" 格式的参数
function parseNameAndValue(args: string): {
	name?: string;
	value?: number;
} | null {
	const cleaned = stripValueProp(args);
	const regex = /^\s*(?:"([^"]+)"\s*,\s*)?(-?\d+(?:\.\d+)?)m?\s*$/;
	const match = regex.exec(cleaned);
	if (!match) return null;
	return { name: match[1] || undefined, value: Number.parseFloat(match[2]) };
}

// 根据变量类型获取默认名称
function getDefaultVarName(varType: string): string | undefined {
	const defaults: Record<string, string> = {
		DamageVar: "Damage",
		BlockVar: "Block",
		CardsVar: "Cards",
		EnergyVar: "Energy",
		RepeatVar: "Repeat",
		StarsVar: "Stars",
		SummonVar: "Summon",
		HpLossVar: "HpLoss",
		ForgeVar: "Forge",
		GoldVar: "Gold",
		HealVar: "Heal",
		MaxHpVar: "MaxHp",
		ExtraDamageVar: "ExtraDamage",
		CalculationBaseVar: "CalculationBase",
		CalculationExtraVar: "CalculationExtra",
		OstyDamageVar: "OstyDamage",
		IntVar: "Int",
	};
	return defaults[varType];
}

// 解析特殊变量类型（无数值参数或特殊格式）
function parseSpecialVar(
	varType: string,
	genericArg: string | undefined,
	argsStr: string,
): { name: string; base_value: number } | undefined {
	if (varType === "CalculatedDamageVar" || varType === "CalculatedBlockVar") {
		const name =
			varType === "CalculatedDamageVar"
				? "CalculatedDamage"
				: "CalculatedBlock";
		return { name, base_value: 0 };
	}

	if (varType === "CalculatedVar") {
		const regex = /^\s*"([^"]+)"\s*$/;
		const match = regex.exec(argsStr);
		if (match) return { name: match[1], base_value: 0 };
		return undefined;
	}

	if (varType === "BoolVar") {
		const regex = /^\s*"([^"]+)"(?:\s*,\s*(true|false))?\s*$/;
		const match = regex.exec(argsStr);
		if (match)
			return { name: match[1], base_value: match[2] === "true" ? 1 : 0 };
		return undefined;
	}

	if (varType === "StringVar") {
		const regex = /^\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?\s*$/;
		const match = regex.exec(argsStr);
		if (match) return { name: match[1], base_value: 0 };
		return undefined;
	}

	if (varType === "PowerVar" && genericArg) {
		const parsed = parseNameAndValue(argsStr);
		if (parsed && parsed.value !== undefined) {
			const name = parsed.name || POWER_TYPE_TO_NAME[genericArg] || genericArg;
			return { name, base_value: parsed.value };
		}
		return undefined;
	}

	return undefined;
}

// 解析通用变量类型（DamageVar, BlockVar, CardsVar 等）
function parseGenericVar(
	varType: string,
	argsStr: string,
): { name: string; base_value: number } | undefined {
	const parsed = parseNameAndValue(argsStr);
	if (parsed?.value == null) return undefined;
	const name = parsed.name || getDefaultVarName(varType);
	if (!name) return undefined;
	return { name, base_value: parsed.value };
}

function parseCanonicalVars(content: string): ExtractedVar[] {
	const vars: ExtractedVar[] = [];
	const varPattern = /new\s+(\w+Var)(?:<(\w+)>)?\s*\(([^)]*)\)/g;

	for (let i = 0; i < content.length; ) {
		const match = varPattern.exec(content);
		if (!match) break;

		const varType = match[1];
		const genericArg = match[2];
		const argsStr = match[3].trim();

		const special = parseSpecialVar(varType, genericArg, argsStr);
		const result = special || parseGenericVar(varType, argsStr);

		if (result) {
			vars.push({
				name: result.name,
				type: varType,
				base_value: result.base_value,
			});
		}

		// 确保 exec 从上次匹配结束的位置继续
		if (varPattern.lastIndex === i) break;
		i = varPattern.lastIndex;
	}

	return vars;
}

function parseOnUpgrade(content: string): {
	upgrades: Record<string, number>;
	energy_upgrade?: number;
} {
	const upgrades: Record<string, number> = {};
	let energy_upgrade: number | undefined;

	// base.DynamicVars.VarName.UpgradeValueBy(Nm)
	const namedUpgrade =
		/base\.DynamicVars\.(\w+)\.UpgradeValueBy\((-?\d+(?:\.\d+)?)m\)/g;
	for (let i = 0; i < content.length; ) {
		const m = namedUpgrade.exec(content);
		if (!m) break;
		upgrades[m[1]] = Number.parseFloat(m[2]);
		if (namedUpgrade.lastIndex === i) break;
		i = namedUpgrade.lastIndex;
	}

	// base.DynamicVars["CustomName"].UpgradeValueBy(Nm)
	const indexedUpgrade =
		/base\.DynamicVars\["([^"]+)"\]\.UpgradeValueBy\((-?\d+(?:\.\d+)?)m\)/g;
	for (let i = 0; i < content.length; ) {
		const m = indexedUpgrade.exec(content);
		if (!m) break;
		upgrades[m[1]] = Number.parseFloat(m[2]);
		if (indexedUpgrade.lastIndex === i) break;
		i = indexedUpgrade.lastIndex;
	}

	// base.EnergyCost.UpgradeBy(N)
	const energyRegex = /base\.EnergyCost\.UpgradeBy\((-?\d+)\)/;
	const energyMatch = energyRegex.exec(content);
	if (energyMatch) {
		energy_upgrade = Number.parseInt(energyMatch[1], 10);
	}

	return { upgrades, energy_upgrade };
}

function extractFromDir(
	dir: string,
	entityLabel: string,
): Record<string, CardVarEntry> {
	const result: Record<string, CardVarEntry> = {};
	if (!fs.existsSync(dir)) {
		console.warn(`目录不存在: ${dir}`);
		return result;
	}

	const files = fs.readdirSync(dir).filter((f) => f.endsWith(".cs"));
	console.log(`  ${entityLabel}: ${files.length} 个源文件`);

	let matched = 0;
	let noVars = 0;

	for (const file of files) {
		const className = path.basename(file, ".cs");
		const id = pascalToScreamingSnake(className);
		const content = fs.readFileSync(path.join(dir, file), "utf-8");

		const vars = parseCanonicalVars(content);
		if (vars.length === 0) {
			noVars++;
			continue;
		}

		const { upgrades, energy_upgrade } = parseOnUpgrade(content);
		result[id] = {
			vars,
			upgrades,
			...(energy_upgrade !== undefined ? { energy_upgrade } : {}),
		};
		matched++;
	}

	console.log(`    有变量: ${matched}, 无变量: ${noVars}`);
	return result;
}

function main() {
	console.log(`游戏源码: ${GAME_SRC}`);
	console.log(`版本: ${VERSION}\n`);

	const output: ExtractOutput = {
		version: VERSION,
		cards: {},
		relics: {},
	};

	console.log("提取卡牌变量...");
	output.cards = extractFromDir(CARD_DIR, "卡牌");

	console.log("\n提取遗物变量...");
	output.relics = extractFromDir(RELIC_DIR, "遗物");

	const outPath = path.join(
		import.meta.dirname ?? ".",
		"..",
		"data",
		`card-vars-v${VERSION}.json`,
	);
	fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

	console.log(
		`\n总计: ${Object.keys(output.cards).length} 卡牌, ${Object.keys(output.relics).length} 遗物`,
	);
	console.log(`→ ${outPath}`);
}

main();
