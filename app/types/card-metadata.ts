export interface CardMetadataEntry {
	cost: number;
	type: string;
	rarity: string;
	target: string;
	tags: string[];
	character_id?: string;
	is_starter?: boolean;
}

export interface CardMetadataRaw {
	version: string;
	cards: Record&lt;string, CardMetadataEntry&gt;;
}
