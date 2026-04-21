export interface ExtractedVar {
	name: string;
	type: string;
	base_value: number;
}

export interface CardVarEntry {
	vars: ExtractedVar[];
	upgrades: Record<string, number>;
	energy_upgrade?: number;
}
