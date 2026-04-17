import type { Config } from "tailwindcss";

export default {
	content: [
		"./app/**/*.{js,ts,vue}",
		"./components/**/*.{js,ts,vue}",
		"./pages/**/*.{js,ts,vue}",
	],
	theme: {
		extend: {
			colors: {
				// Game-themed color palette migrated from PrimeVue Aura theme
				primary: {
					DEFAULT: "#C9A84C",
					50: "#FDF8E7",
					100: "#FAEEBF",
					200: "#F5DE8C",
					300: "#EECB59",
					400: "#C9A84C",
					500: "#A3843F",
					600: "#7D6032",
					700: "#574C25",
					800: "#313818",
					900: "#0B240B",
				},
				surface: {
					DEFAULT: "#1A2E35",
					50: "#E8F0F2",
					100: "#CDE0E5",
					200: "#A1BFC7",
					300: "#749EA9",
					400: "#487D8B",
					500: "#1A2E35",
					600: "#15252B",
					700: "#101C21",
					800: "#0B1317",
					900: "#060A0D",
				},
				accent: {
					DEFAULT: "#4ECDC4",
					50: "#E8FAF8",
					100: "#C9F4F0",
					200: "#97E9E1",
					300: "#65DFD2",
					400: "#4ECDC4",
					500: "#3BAAA2",
					600: "#2D8780",
					700: "#20645E",
					800: "#13413C",
					900: "#061E1A",
				},
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"],
				game: ["Cinzel", "serif"],
			},
			animation: {
				"fade-in": "fadeIn 0.3s ease-out",
				"slide-up": "slideUp 0.4s ease-out",
				"scale-in": "scaleIn 0.2s ease-out",
				glow: "glow 2s ease-in-out infinite",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
				slideUp: {
					"0%": { opacity: "0", transform: "translateY(10px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				scaleIn: {
					"0%": { opacity: "0", transform: "scale(0.95)" },
					"100%": { opacity: "1", transform: "scale(1)" },
				},
				glow: {
					"0%, 100%": { boxShadow: "0 0 5px rgba(201, 168, 76, 0.5)" },
					"50%": { boxShadow: "0 0 20px rgba(201, 168, 76, 0.8)" },
				},
			},
		},
	},
	plugins: [],
} satisfies Config;
