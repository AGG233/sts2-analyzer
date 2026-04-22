// 游戏描述模板渲染引擎
// 将游戏源码中的 SmartFormat 模板语法解析为结构化 Segment 数组

export type Segment =
	| { type: "text"; value: string }
	| { type: "variable"; name: string; value: number; upgraded: boolean }
	| { type: "energy"; value: number }
	| { type: "stars"; value: number }
	| { type: "color"; tag: string; children: Segment[] }
	| { type: "bold"; children: Segment[] };

export interface RenderContext {
	vars: Record<string, { base: number; upgrade?: number }>;
	upgradeLevel: number;
	cardType?: string;
}

function isWordChar(ch: string): boolean {
	const code = ch.codePointAt(0) ?? 0;
	return (
		(code >= 97 && code <= 122) || // a-z
		(code >= 65 && code <= 90) || // A-Z
		(code >= 48 && code <= 57) || // 0-9
		ch === "_"
	);
}

function resolveVar(
	ctx: RenderContext,
	name: string,
): { value: number; upgraded: boolean } | undefined {
	const lookup = (n: string) => ctx.vars[n];
	const entry = lookup(name);
	if (entry) {
		const upgraded = ctx.upgradeLevel > 0 && entry.upgrade !== undefined;
		return {
			value: upgraded ? entry.base + (entry.upgrade ?? 0) : entry.base,
			upgraded,
		};
	}
	if (!name.endsWith("Power")) {
		const powerEntry = lookup(`${name}Power`);
		if (powerEntry) {
			const upgraded = ctx.upgradeLevel > 0 && powerEntry.upgrade !== undefined;
			return {
				value: upgraded
					? powerEntry.base + (powerEntry.upgrade ?? 0)
					: powerEntry.base,
				upgraded,
			};
		}
	}
	return undefined;
}

function splitBranches(text: string, count: number): string[] {
	const result: string[] = [];
	let depth = 0;
	let current = "";

	for (const ch of text) {
		if (ch === "{") depth++;
		else if (ch === "}") depth--;
		else if (ch === "|" && depth === 0) {
			result.push(current);
			current = "";
			if (result.length >= count - 1) {
				result.push(text.slice(text.indexOf(ch) + 1));
				return result;
			}
			continue;
		}
		current += ch;
	}
	result.push(current);
	return result;
}

function splitBranch(text: string): [string, string] {
	const branches = splitBranches(text, 2);
	return [branches[0] ?? "", branches[1] ?? ""];
}

function makeVarSegment(name: string, ctx: RenderContext): Segment {
	const resolved = resolveVar(ctx, name);
	if (resolved) {
		return {
			type: "variable",
			name,
			value: resolved.value,
			upgraded: resolved.upgraded,
		};
	}
	return { type: "text", value: "?" };
}

function resolveMethodCall(
	varName: string,
	method: string,
	ctx: RenderContext,
): Segment[] | undefined {
	if (method === "diff()") {
		return [makeVarSegment(varName, ctx)];
	}
	if (method === "inverseDiff()") {
		const resolved = resolveVar(ctx, varName);
		if (resolved) {
			const upgradeDelta = ctx.vars[varName]?.upgrade ?? 0;
			return [
				{
					type: "variable",
					name: varName,
					value: resolved.upgraded ? -upgradeDelta : 0,
					upgraded: resolved.upgraded,
				},
			];
		}
		return [{ type: "text", value: "?" }];
	}
	if (method === "energyIcons()") {
		const resolved = resolveVar(ctx, varName);
		return [{ type: "energy", value: resolved?.value ?? 0 }];
	}
	if (method === "starIcons()") {
		const resolved = resolveVar(ctx, varName);
		return [{ type: "stars", value: resolved?.value ?? 0 }];
	}
	if (method.startsWith("plural:")) {
		const resolved = resolveVar(ctx, varName);
		const value = resolved?.value ?? 0;
		const branches = splitBranch(method.slice("plural:".length));
		const chosen = value === 1 ? branches[0] : branches[1];
		if (chosen === undefined) return [];
		return renderSegments(chosen, ctx);
	}
	return undefined;
}

function resolveCondition(
	varName: string,
	condition: string,
	ctx: RenderContext,
): Segment[] {
	const gtRegex = /^>(\d+)\?(.*)$/;
	const gtMatch = gtRegex.exec(condition);
	if (gtMatch) {
		const threshold = Number.parseInt(gtMatch[1], 10);
		const branches = splitBranches(gtMatch[2], 2);
		const resolved = resolveVar(ctx, varName);
		const value = resolved?.value ?? 0;
		const chosen = value > threshold ? branches[0] : branches[1];
		return renderSegments(chosen, ctx);
	}

	const resolved = resolveVar(ctx, varName);
	const branches = splitBranch(condition);
	if (resolved) return renderSegments(branches[0], ctx);
	return renderSegments(branches[1], ctx);
}

// 识别占位符类型并分派到对应的解析函数
type PlaceholderKind =
	| { kind: "singleStar" }
	| { kind: "energyPrefix" }
	| { kind: "methodCall"; varName: string; method: string }
	| { kind: "ifUpgraded"; content: string }
	| { kind: "inCombat"; content: string }
	| { kind: "choose"; varName: string; options: string[]; branches: string }
	| { kind: "cond"; varName: string; condition: string }
	| { kind: "existence"; varName: string; branches: string }
	| { kind: "bareVar"; varName: string }
	| { kind: "unknown" };

function classifyPlaceholder(inner: string): PlaceholderKind {
	if (/^energyPrefix:energyIcons\(\d+\)$/.test(inner)) {
		return { kind: "energyPrefix" };
	}

	const singleStarMatch = /^singleStarIcon$/.exec(inner);
	if (singleStarMatch) {
		return { kind: "singleStar" };
	}

	// 方法调用: VarName:method(rest)
	const colonIdx = inner.indexOf(":");
	if (colonIdx > 0) {
		const varName = inner.slice(0, colonIdx);
		const afterColon = inner.slice(colonIdx + 1);
		const openParen = afterColon.indexOf("(");
		const closeParen = afterColon.lastIndexOf(")");
		if (
			openParen > 0 &&
			closeParen === afterColon.length - 1 &&
			openParen < closeParen
		) {
			const methodName = afterColon.slice(0, openParen);
			const rest = afterColon.slice(openParen + 1, closeParen);
			let valid = true;
			for (const c of varName) {
				if (!isWordChar(c)) {
					valid = false;
					break;
				}
			}
			for (const c of methodName) {
				if (!isWordChar(c) && c !== "(" && c !== ")") {
					valid = false;
					break;
				}
			}
			if (
				valid &&
				varName.length > 0 &&
				methodName.length > 0 &&
				isWordChar(methodName[0] as string)
			) {
				return {
					kind: "methodCall",
					varName,
					method: `${methodName}(${rest})`,
				};
			}
		}
	}

	// VarName:plural:singular|plural（参数包含管道符，不被上面的 () 正则捕获）
	const pluralRegex = /^(\w+):plural:(.+)$/;
	const pluralMatch = pluralRegex.exec(inner);
	if (pluralMatch) {
		return {
			kind: "methodCall",
			varName: pluralMatch[1],
			method: `plural:${pluralMatch[2]}`,
			rest: pluralMatch[2],
		};
	}

	if (inner.startsWith("IfUpgraded:show:")) {
		return {
			kind: "ifUpgraded",
			content: inner.slice("IfUpgraded:show:".length),
		};
	}

	if (inner.startsWith("InCombat:")) {
		return { kind: "inCombat", content: inner.slice("InCombat:".length) };
	}

	const chooseRegex = /^(\w+):choose\(([^)]+)\):(.*)$/;
	const chooseMatch = chooseRegex.exec(inner);
	if (chooseMatch) {
		return {
			kind: "choose",
			varName: chooseMatch[1],
			options: chooseMatch[2].split("|"),
			branches: chooseMatch[3],
		};
	}

	const condRegex = /^(\w[\w.]*):cond:(.+)$/;
	const condMatch = condRegex.exec(inner);
	if (condMatch) {
		return { kind: "cond", varName: condMatch[1], condition: condMatch[2] };
	}

	// VarName:text|fallback（无括号的存在性检查）
	const existenceRegex = /^(\w+):([^()]+)$/;
	const existenceMatch = existenceRegex.exec(inner);
	if (existenceMatch) {
		return {
			kind: "existence",
			varName: existenceMatch[1],
			branches: existenceMatch[2],
		};
	}

	const bareRegex = /^(\w+)$/;
	const bareMatch = bareRegex.exec(inner);
	if (bareMatch) {
		return { kind: "bareVar", varName: bareMatch[1] };
	}

	return { kind: "unknown" };
}

function resolvePlaceholder(inner: string, ctx: RenderContext): Segment[] {
	const kind = classifyPlaceholder(inner);

	switch (kind.kind) {
		case "energyPrefix":
			return [];
		case "singleStar":
			return [{ type: "stars", value: 1 }];
		case "methodCall":
			return resolveMethodCall(kind.varName, kind.method, ctx);
		case "ifUpgraded": {
			const branch = splitBranch(kind.content);
			const chosen = ctx.upgradeLevel > 0 ? branch[0] : branch[1];
			if (chosen === undefined) return [];
			return renderSegments(chosen, ctx);
		}
		case "inCombat": {
			const branch = splitBranch(kind.content);
			return branch[1] === "" ? [] : renderSegments(branch[1], ctx);
		}
		case "choose": {
			const branches = splitBranches(kind.branches, kind.options.length);
			const idx = ctx.cardType ? kind.options.indexOf(ctx.cardType) : 0;
			const chosen =
				idx >= 0 && idx < branches.length ? branches[idx] : branches[0];
			return renderSegments(chosen, ctx);
		}
		case "cond":
			return resolveCondition(kind.varName, kind.condition, ctx);
		case "existence": {
			const branches = splitBranch(kind.branches);
			const resolved = resolveVar(ctx, kind.varName);
			if (resolved) return renderSegments(branches[0], ctx);
			return renderSegments(branches[1], ctx);
		}
		case "bareVar":
			return [makeVarSegment(kind.varName, ctx)];
		default:
			return [{ type: "text", value: "?" }];
	}
}

function parsePlaceholder(
	template: string,
	pos: number,
	ctx: RenderContext,
): { segments: Segment[]; consumed: number } {
	let depth = 1;
	let i = pos + 1;
	while (i < template.length && depth > 0) {
		if (template[i] === "{") depth++;
		else if (template[i] === "}") depth--;
		if (depth > 0) i++;
	}
	const inner = template.slice(pos + 1, i);
	const consumed = i - pos + 1;
	return { segments: resolvePlaceholder(inner, ctx), consumed };
}

const ANIMATION_TAGS = new Set(["jitter", "sine", "rainbow"]);
const COLOR_TAGS = new Set([
	"gold",
	"blue",
	"green",
	"red",
	"purple",
	"orange",
	"aqua",
]);

function parseBBCodeTag(
	template: string,
	pos: number,
	ctx: RenderContext,
): { segments: Segment[]; consumed: number } | undefined {
	if (template[pos] !== "[") return undefined;

	// Parse tag name: word chars after [
	let i = pos + 1;
	let tagName = "";
	while (i < template.length && isWordChar(template[i] as string)) {
		tagName += template[i];
		i++;
	}
	if (tagName.length === 0) return undefined;

	// Skip optional attributes until ]
	while (i < template.length && template[i] !== "]") {
		i++;
	}
	if (i >= template.length || template[i] !== "]") return undefined;

	const tagEnd = i + 1;
	const closingTag = `[/${tagName}]`;
	const closeIdx = template.indexOf(closingTag, tagEnd);
	if (closeIdx < 0) return undefined;

	const innerText = template.slice(tagEnd, closeIdx);
	const totalConsumed = closeIdx - pos + closingTag.length;

	if (ANIMATION_TAGS.has(tagName)) {
		return {
			segments: renderSegments(innerText, ctx),
			consumed: totalConsumed,
		};
	}

	if (COLOR_TAGS.has(tagName)) {
		return {
			segments: [
				{
					type: "color",
					tag: tagName,
					children: renderSegments(innerText, ctx),
				},
			],
			consumed: totalConsumed,
		};
	}

	if (tagName === "b") {
		return {
			segments: [{ type: "bold", children: renderSegments(innerText, ctx) }],
			consumed: totalConsumed,
		};
	}

	return { segments: renderSegments(innerText, ctx), consumed: totalConsumed };
}

export function renderSegments(
	template: string,
	ctx: RenderContext,
): Segment[] {
	const text = template.replaceAll(String.raw`\n`, "\n");
	const segments: Segment[] = [];
	let i = 0;

	while (i < text.length) {
		if (text[i] === "[") {
			const tagResult = parseBBCodeTag(text, i, ctx);
			if (tagResult) {
				segments.push(...tagResult.segments);
				i += tagResult.consumed;
				continue;
			}
		}

		if (text[i] === "{") {
			const result = parsePlaceholder(text, i, ctx);
			segments.push(...result.segments);
			i += result.consumed;
			continue;
		}

		let end = i + 1;
		while (end < text.length && text[end] !== "{" && text[end] !== "[") {
			end++;
		}
		const value = text.slice(i, end);
		if (value) segments.push({ type: "text", value });
		i = end;
	}

	return segments;
}
