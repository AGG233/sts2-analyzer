export interface CardMetadataEntry {
	cost: number;
	type: string;
	rarity: string;
	target: string;
	tags: string[];
	character_id?: string;
	is_starter?: boolean;
}
