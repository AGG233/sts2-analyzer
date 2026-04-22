// Vite dev 的 BASE_URL 包含 _nuxt/ 后缀，但 public/ 文件通过 app baseURL 根路径提供
const BASE = `${import.meta.env.BASE_URL.replace(/\/_nuxt\/$/, "/")}cards`;

export function getPortraitPath(
	characterId: string,
	cardBareId: string,
): string {
	const bare = cardBareId.toLowerCase();
	// 基础牌（Strike/Defend）按角色分不同文件名
	const filename =
		bare === "strike" || bare === "defend" ? `${bare}_${characterId}` : bare;
	return `${BASE}/portraits/${characterId}/${filename}.png`;
}

export function getFramePath(type: string): string {
	const mapped = FRAME_TYPE_MAP[type] ?? "attack";
	return `${BASE}/frames/${mapped}.png`;
}

export function getEnergyPath(characterId: string): string {
	return `${BASE}/energy/${characterId}.png`;
}

export function getBorderPath(type: string): string {
	const mapped = BORDER_TYPE_MAP[type] ?? "plaque";
	return `${BASE}/borders/${mapped}.png`;
}

export function getBannerPath(rarity: string): string {
	if (rarity === "Ancient") return `${BASE}/banners/ancient_banner.png`;
	return `${BASE}/banners/banner.png`;
}

// card type → frame 文件名映射
const FRAME_TYPE_MAP: Record<string, string> = {
	Attack: "attack",
	Skill: "skill",
	Power: "power",
	Quest: "quest",
	Ancient: "ancient",
};

// card type → border 文件名映射
const BORDER_TYPE_MAP: Record<string, string> = {
	Attack: "attack",
	Skill: "skill",
	Power: "power",
	Status: "plaque",
	Curse: "plaque",
	Quest: "plaque",
	Event: "plaque",
	Token: "plaque",
};
