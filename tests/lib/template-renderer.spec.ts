import { describe, expect, it } from "vitest";
import type { RenderContext } from "~/lib/template-renderer";
import { renderSegments } from "~/lib/template-renderer";

function makeCtx(overrides: Partial<RenderContext> = {}): RenderContext {
	return {
		vars: {
			Damage: { base: 8, upgrade: 2 },
			Block: { base: 5, upgrade: 3 },
			VulnerablePower: { base: 2, upgrade: 1 },
			Cards: { base: 3 },
			Energy: { base: 1 },
			Stars: { base: 2 },
			Repeat: { base: 1 },
			Attacks: { base: 2 },
		},
		upgradeLevel: 0,
		...overrides,
	};
}

describe("renderSegments", () => {
	it("纯文本原样返回", () => {
		const result = renderSegments("Hello World", makeCtx());
		expect(result).toEqual([{ type: "text", value: "Hello World" }]);
	});

	it("\\n 转换为换行", () => {
		const result = renderSegments("Line1\\nLine2", makeCtx());
		expect(result).toEqual([{ type: "text", value: "Line1\nLine2" }]);
	});

	describe("diff() 变量解析", () => {
		it("基础等级显示基础值", () => {
			const result = renderSegments("Deal {Damage:diff()} damage.", makeCtx());
			expect(result).toContainEqual({
				type: "variable",
				name: "Damage",
				value: 8,
				upgraded: false,
			});
		});

		it("升级后显示升级值", () => {
			const result = renderSegments(
				"Deal {Damage:diff()} damage.",
				makeCtx({ upgradeLevel: 1 }),
			);
			expect(result).toContainEqual({
				type: "variable",
				name: "Damage",
				value: 10,
				upgraded: true,
			});
		});

		it("未知变量显示问号", () => {
			const result = renderSegments("Deal {Unknown:diff()} damage.", makeCtx());
			expect(result).toContainEqual({ type: "text", value: "?" });
		});
	});

	describe("裸变量", () => {
		it("解析裸变量数值", () => {
			const result = renderSegments("Lose {HpLoss} HP.", {
				...makeCtx(),
				vars: { HpLoss: { base: 6 } },
			});
			expect(result).toContainEqual({
				type: "variable",
				name: "HpLoss",
				value: 6,
				upgraded: false,
			});
		});
	});

	describe("Power 后缀回退", () => {
		it("Vulnerable 回退到 VulnerablePower", () => {
			const result = renderSegments(
				"Apply {Vulnerable:diff()} [gold]Vulnerable[/gold].",
				makeCtx(),
			);
			expect(result).toContainEqual({
				type: "variable",
				name: "Vulnerable",
				value: 2,
				upgraded: false,
			});
		});

		it("升级后 VulnerablePower 正确", () => {
			const result = renderSegments(
				"Apply {VulnerablePower:diff()} [gold]Vulnerable[/gold].",
				makeCtx({ upgradeLevel: 1 }),
			);
			expect(result).toContainEqual({
				type: "variable",
				name: "VulnerablePower",
				value: 3,
				upgraded: true,
			});
		});
	});

	describe("IfUpgraded:show", () => {
		it("未升级时选择普通分支", () => {
			const result = renderSegments(
				"{IfUpgraded:show:ALL cards|a card}",
				makeCtx(),
			);
			expect(result).toContainEqual({ type: "text", value: "a card" });
			expect(result).not.toContainEqual(
				expect.objectContaining({ value: "ALL cards" }),
			);
		});

		it("升级后选择升级分支", () => {
			const result = renderSegments(
				"{IfUpgraded:show:ALL cards|a card}",
				makeCtx({ upgradeLevel: 1 }),
			);
			expect(result).toContainEqual({ type: "text", value: "ALL cards" });
		});

		it("空分支处理", () => {
			const result = renderSegments(
				"Gain {Block:diff()} Block.{IfUpgraded:show: twice|}",
				makeCtx(),
			);
			expect(result).not.toContainEqual(
				expect.objectContaining({ value: " twice" }),
			);
		});
	});

	describe("plural 复数", () => {
		it("值为1时用单数", () => {
			const result = renderSegments(
				"{Cards:diff()} {Cards:plural:card|cards}",
				{ ...makeCtx(), vars: { Cards: { base: 1 } } },
			);
			expect(result).toContainEqual({ type: "text", value: "card" });
		});

		it("值大于1时用复数", () => {
			const result = renderSegments(
				"{Cards:diff()} {Cards:plural:card|cards}",
				{ ...makeCtx(), vars: { Cards: { base: 3 } } },
			);
			expect(result).toContainEqual({ type: "text", value: "cards" });
		});
	});

	describe("cond 条件", () => {
		it("大于阈值选真分支", () => {
			const result = renderSegments(
				"{Attacks:cond:>1?{Attacks:diff()} Attacks are|Attack is}",
				makeCtx(),
			);
			expect(result).toContainEqual({
				type: "variable",
				name: "Attacks",
				value: 2,
				upgraded: false,
			});
			expect(result).toContainEqual({
				type: "text",
				value: " Attacks are",
			});
		});

		it("不大于阈值选假分支", () => {
			const result = renderSegments(
				"{Attacks:cond:>1?{Attacks:diff()} Attacks are|Attack is}",
				{ ...makeCtx(), vars: { Attacks: { base: 1 } } },
			);
			expect(result).toContainEqual({
				type: "text",
				value: "Attack is",
			});
		});

		it("存在性检查：变量存在显示文本", () => {
			const result = renderSegments("{Violence: extra damage|}", {
				...makeCtx(),
				vars: { Violence: { base: 1 } },
			});
			expect(result).toContainEqual({
				type: "text",
				value: " extra damage",
			});
		});

		it("存在性检查：变量不存在显示回退", () => {
			const result = renderSegments("{Violence: extra damage|}", makeCtx());
			expect(result).not.toContainEqual(
				expect.objectContaining({ value: " extra damage" }),
			);
		});
	});

	describe("InCombat", () => {
		it("非战斗状态隐藏 InCombat 内容", () => {
			const result = renderSegments(
				"Deal damage.{InCombat:\\n(Hits {CalculatedDamage:diff()})|}",
				makeCtx(),
			);
			const hasHits = result.some(
				(s) => s.type === "text" && s.value.includes("Hits"),
			);
			expect(hasHits).toBe(false);
		});
	});

	describe("energyIcons", () => {
		it("能量图标段", () => {
			const result = renderSegments("Gain {Energy:energyIcons()}.", makeCtx());
			expect(result).toContainEqual({ type: "energy", value: 1 });
		});

		it("energyPrefix 被移除", () => {
			const result = renderSegments(
				"Cost 0{energyPrefix:energyIcons(1)}.",
				makeCtx(),
			);
			expect(result).not.toContainEqual(
				expect.objectContaining({ type: "energy" }),
			);
		});
	});

	describe("starIcons", () => {
		it("星星图标段", () => {
			const result = renderSegments("Spend {Stars:starIcons()}.", makeCtx());
			expect(result).toContainEqual({ type: "stars", value: 2 });
		});

		it("singleStarIcon", () => {
			const result = renderSegments("Spend {singleStarIcon}.", makeCtx());
			expect(result).toContainEqual({ type: "stars", value: 1 });
		});
	});

	describe("BBCode 颜色标签", () => {
		it("[gold] 标签产生嵌套颜色段", () => {
			const result = renderSegments(
				"Gain {Block:diff()} [gold]Block[/gold].",
				makeCtx(),
			);
			const colorSeg = result.find(
				(s) => s.type === "color" && s.tag === "gold",
			);
			expect(colorSeg).toBeDefined();
			if (colorSeg && colorSeg.type === "color") {
				expect(colorSeg.children).toContainEqual({
					type: "text",
					value: "Block",
				});
			}
		});

		it("[blue] 标签", () => {
			const result = renderSegments(
				"Gain [blue]{Block:diff()}[/blue] block.",
				makeCtx(),
			);
			const colorSeg = result.find(
				(s) => s.type === "color" && s.tag === "blue",
			);
			expect(colorSeg).toBeDefined();
		});

		it("[green] 标签", () => {
			const result = renderSegments("Heal [green]{Heal}[/green] HP.", {
				...makeCtx(),
				vars: { Heal: { base: 6 } },
			});
			expect(result).toContainEqual(
				expect.objectContaining({ type: "color", tag: "green" }),
			);
		});

		it("[red] 标签", () => {
			const result = renderSegments("Deal [red]damage[/red].", makeCtx());
			expect(result).toContainEqual(
				expect.objectContaining({ type: "color", tag: "red" }),
			);
		});

		it("[purple] 标签", () => {
			const result = renderSegments("[purple]enchanted[/purple]", makeCtx());
			expect(result).toContainEqual(
				expect.objectContaining({ type: "color", tag: "purple" }),
			);
		});

		it("动画标签只保留文本", () => {
			const result = renderSegments("[jitter]shaking[/jitter]", makeCtx());
			expect(result).toContainEqual({
				type: "text",
				value: "shaking",
			});
		});

		it("[sine] 标签只保留文本", () => {
			const result = renderSegments("[sine]wavy[/sine]", makeCtx());
			expect(result).toContainEqual({
				type: "text",
				value: "wavy",
			});
		});

		it("[b] 标签产生粗体段", () => {
			const result = renderSegments("Deal [b]damage[/b]", makeCtx());
			expect(result).toContainEqual(
				expect.objectContaining({
					type: "bold",
					children: [{ type: "text", value: "damage" }],
				}),
			);
		});

		it("BBCode 标签带属性只解析标签名", () => {
			const result = renderSegments("[gold size=12]Block[/gold]", makeCtx());
			expect(result).toContainEqual(
				expect.objectContaining({ type: "color", tag: "gold" }),
			);
		});
	});

	describe("choose 选择", () => {
		it("根据 cardType 选择对应分支", () => {
			const result = renderSegments(
				"{Damage:choose(Attack|Skill):{Damage:diff()} dmg|{Damage:diff()} blk}",
				{ ...makeCtx(), cardType: "Skill" },
			);
			expect(result).toContainEqual({
				type: "variable",
				name: "Damage",
				value: 8,
				upgraded: false,
			});
			expect(
				result.some((s) => s.type === "text" && s.value.includes("blk")),
			).toBe(true);
		});

		it("无 cardType 时默认选第一个分支", () => {
			const result = renderSegments(
				"{Damage:choose(Attack|Skill):{Damage:diff()} dmg|{Damage:diff()} blk}",
				makeCtx(),
			);
			expect(
				result.some((s) => s.type === "text" && s.value.includes("dmg")),
			).toBe(true);
		});
	});

	describe("未知占位符", () => {
		it("无法识别的占位符返回问号", () => {
			const result = renderSegments("{unknownPattern!!!}", makeCtx());
			expect(result).toContainEqual({ type: "text", value: "?" });
		});
	});

	describe("未识别 BBCode 标签", () => {
		it("未识别标签只保留内部文本", () => {
			const result = renderSegments("[unknown]kept[/unknown]", makeCtx());
			expect(result).toContainEqual({ type: "text", value: "kept" });
		});
	});

	describe("完整卡牌描述", () => {
		it("Bash 基础描述", () => {
			const template =
				"Deal {Damage:diff()} damage.\\nApply {VulnerablePower:diff()} [gold]Vulnerable[/gold].";
			const result = renderSegments(template, makeCtx());
			// 应包含 Damage=8
			expect(result).toContainEqual({
				type: "variable",
				name: "Damage",
				value: 8,
				upgraded: false,
			});
			// 应包含 VulnerablePower=2
			expect(result).toContainEqual({
				type: "variable",
				name: "VulnerablePower",
				value: 2,
				upgraded: false,
			});
			// 应包含 [gold] 颜色段
			expect(result).toContainEqual(
				expect.objectContaining({ type: "color", tag: "gold" }),
			);
		});

		it("Bash 升级描述", () => {
			const template =
				"Deal {Damage:diff()} damage.\\nApply {VulnerablePower:diff()} [gold]Vulnerable[/gold].";
			const result = renderSegments(template, makeCtx({ upgradeLevel: 1 }));
			expect(result).toContainEqual({
				type: "variable",
				name: "Damage",
				value: 10,
				upgraded: true,
			});
			expect(result).toContainEqual({
				type: "variable",
				name: "VulnerablePower",
				value: 3,
				upgraded: true,
			});
		});

		it("Anger 描述", () => {
			const result = renderSegments(
				"Deal {Damage:diff()} damage.\\nAdd a copy of this card to your discard pile.",
				makeCtx(),
			);
			expect(result).toContainEqual({
				type: "variable",
				name: "Damage",
				value: 8,
				upgraded: false,
			});
		});
	});
});
