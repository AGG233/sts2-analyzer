type Platform = "windows" | "macos" | "linux" | "unknown";

export type { Platform };

export function detectPlatform(): Platform {
	if (typeof navigator === "undefined") return "unknown";
	const ua = navigator.userAgent.toLowerCase();
	if (ua.includes("win")) return "windows";
	if (ua.includes("mac")) return "macos";
	if (ua.includes("linux")) return "linux";
	return "unknown";
}

export function getSavePathHint(platform: Platform): string {
	switch (platform) {
		case "windows":
			return "%APPDATA%\\SlayTheSpire2\\steam\\<SteamID>\\profile1\\saves\\history\\";
		case "macos":
			return "~/Library/Application Support/SlayTheSpire2/steam/<SteamID>/profile1/saves/history/";
		case "linux":
			return "~/.local/share/SlayTheSpire2/steam/<SteamID>/profile1/saves/history/";
		default:
			return "";
	}
}
