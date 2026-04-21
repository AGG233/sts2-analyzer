// 从游戏源码或构建产物中自动检测 build 版本号（如 v0103.2）
// 检测顺序：release_info.json → CLI 参数 → 默认值

import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_VERSION = "v0.15";

export function detectBuildVersion(
	gameSrcDir: string,
	cliVersion?: string,
): string {
	if (cliVersion) return normalize(cliVersion);

	// 尝试从 release_info.json 读取（游戏构建产物中的版本文件）
	const releaseInfoPath = path.join(gameSrcDir, "release_info.json");
	if (fs.existsSync(releaseInfoPath)) {
		try {
			const raw = JSON.parse(fs.readFileSync(releaseInfoPath, "utf-8"));
			if (typeof raw.version === "string" && raw.version) {
				return normalize(raw.version);
			}
		} catch {
			// 解析失败，继续尝试其他方式
		}
	}

	return DEFAULT_VERSION;
}

function normalize(version: string): string {
	const match = version.match(/v\d+(?:\.\d+)*/i);
	if (match) return match[0].toLowerCase();

	const fallback = version.match(/\d+\.\d+(?:\.\d+)?/);
	return fallback ? `v${fallback[0]}` : DEFAULT_VERSION;
}
