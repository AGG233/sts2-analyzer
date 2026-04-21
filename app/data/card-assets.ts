const BASE = `${import.meta.env.BASE_URL}cards`;

export function getPortraitPath(
	characterId: string,
	cardBareId: string,
): string {
	return `${BASE}/portraits/${characterId}/${cardBareId.toLowerCase()}.png`;
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
