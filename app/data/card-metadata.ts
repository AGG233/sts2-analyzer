import type { CardMetadataRaw } from "~/types/card-metadata";

let metadataCache: CardMetadataRaw | null = null;

async function loadMetadata(): Promise<CardMetadataRaw> {
	if (metadataCache) return metadataCache;
	const res = await fetch("/card-metadata-v0.15.json");
	metadataCache = (await res.json()) as CardMetadataRaw;
	return metadataCache;
}

export async function getCardMetadata(
	cardId: string,
): Promise&lt;CardMetadataRaw["cards"][string] | undefined&gt; {
	const bare = cardId.replace("CARD.", "");
	const data = await loadMetadata();
	return data.cards[bare];
}

export async function getAllCardMetadata(): Promise&lt;CardMetadataRaw&gt; {
	return loadMetadata();
}

// 类型配置：图标字符 + 颜色
export const CARD_TYPE_CONFIG: Record&lt;
	string,
	{ icon: string; color: string; label: string }
&gt; = {
	Attack: { icon: "\u2694", color: "#e74c3c", label: "Attack" },
	Skill: { icon: "\uD83D\uDEE1", color: "#3498db", label: "Skill" },
	Power: { icon: "\u26A1", color: "#f39c12", label: "Power" },
	Status: { icon: "\u2B22", color: "#95a5a6", label: "Status" },
	Curse: { icon: "\uD83D\uDD31", color: "#8e44ad", label: "Curse" },
	Quest: { icon: "\u2753", color: "#2ecc71", label: "Quest" },
};

// 稀有度边框颜色
export const RARITY_CONFIG: Record&lt;string, { color: string; label: string }&gt; = {
	Basic: { color: "#bdc3c7", label: "Basic" },
	Common: { color: "#95a5a6", label: "Common" },
	Uncommon: { color: "#2ecc71", label: "Uncommon" },
	Rare: { color: "#f1c40f", label: "Rare" },
	Ancient: { color: "#e67e22", label: "Ancient" },
	Event: { color: "#9b59b6", label: "Event" },
	Token: { color: "#7f8c8d", label: "Token" },
	Status: { color: "#7f8c8d", label: "Status" },
	Curse: { color: "#c0392b", label: "Curse" },
	Quest: { color: "#27ae60", label: "Quest" },
};

// 角色边框颜色
export const CHARACTER_FRAME_COLORS: Record&lt;string, string&gt; = {
	ironclad: "#e74c3c",
	silent: "#2ecc71",
	defect: "#3498db",
	regent: "#e67e22",
	necrobinder: "#e91e90",
	colorless: "#95a5a6",
	curse: "#8e44ad",
	status: "#7f8c8d",
	quest: "#27ae60",
	token: "#7f8c8d",
	event: "#9b59b6",
};
