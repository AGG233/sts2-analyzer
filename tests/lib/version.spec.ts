import { describe, expect, it } from "vitest";
import { normalizeBuildVersion } from "~/lib/version";

describe("normalizeBuildVersion", () => {
	it("标准 v 前缀格式", () => {
		expect(normalizeBuildVersion("v0103.2")).toBe("v0103.2");
	});

	it("大写 V 前缀转为小写", () => {
		expect(normalizeBuildVersion("V0103.2")).toBe("v0103.2");
	});

	it("含完整三段版本号", () => {
		expect(normalizeBuildVersion("v0103.2.1")).toBe("v0103.2.1");
	});

	it("纯数字点分版本回退到点分匹配", () => {
		expect(normalizeBuildVersion("0103.2")).toBe("0103.2");
	});

	it("从更长字符串中提取版本号", () => {
		expect(normalizeBuildVersion("build_v0103.2_final")).toBe("v0103.2");
	});

	it("无匹配时返回原值", () => {
		expect(normalizeBuildVersion("unknown")).toBe("unknown");
	});

	it("语义版本带 v 前缀", () => {
		expect(normalizeBuildVersion("v0.15.0")).toBe("v0.15.0");
	});

	it("仅纯数字返回原值", () => {
		expect(normalizeBuildVersion("42")).toBe("42");
	});
});
