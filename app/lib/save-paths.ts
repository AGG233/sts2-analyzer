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
			return String.raw`%APPDATA%\SlayTheSpire2\steam`;
		case "macos":
			return "~/Library/Application Support/SlayTheSpire2/steam";
		case "linux":
			return "~/.local/share/SlayTheSpire2/steam";
		default:
			return "";
	}
}
