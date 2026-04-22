export function normalizeBuildVersion(buildId: string): string {
	const vMatch = /v[\d.]+/i.exec(buildId);
	if (vMatch) return vMatch[0].toLowerCase();

	const numMatch = /[\d.]+/.exec(buildId);
	if (numMatch) {
		const s = numMatch[0];
		if (s.includes(".")) return s;
	}
	return buildId;
}
