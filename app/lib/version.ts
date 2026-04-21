export function normalizeBuildVersion(buildId: string): string {
	const match = buildId.match(/v\d+(?:\.\d+)*/i);
	if (match) return match[0].toLowerCase();

	const fallback = buildId.match(/\d+\.\d+(?:\.\d+)?/);
	return fallback ? fallback[0] : buildId;
}
