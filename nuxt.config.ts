// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2024-04-03",
	devtools: { enabled: false },
	modules: ["@nuxtjs/i18n", "@pinia/nuxt", "@nuxtjs/tailwindcss"],
	css: ["~/assets/css/main.css"],
	ssr: true,
	components: [
		{ path: "~/components/shared", pathPrefix: false },
		{ path: "~/components/layout", pathPrefix: false },
		{ path: "~/components/run-detail", pathPrefix: false },
		{ path: "~/components/charts", pathPrefix: false },
		"~/components",
	],
	experimental: {},
	vite: {
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: '@use "~/assets/scss/_variables.scss" as *;',
				},
			},
		},
		build: {
			minify: "terser",
			terserOptions: {
				compress: {
					drop_console: true,
					drop_debugger: true,
				},
			},
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						if (id.includes("echarts") || id.includes("vue-echarts"))
							return "echarts";
						if (id.includes("@nuxtjs/i18n") && id.includes("node_modules"))
							return "i18n";
					},
				},
			},
		},
		optimizeDeps: {
			include: ["sql.js", "vue", "vue-router", "pinia"],
		},
	},
	nitro: {
		compressPublicAssets: true,
		minify: true,
		prerender: {
			crawlLinks: true,
		},
	},
	routeRules: {
		"/": { prerender: true },
	},
	app: {
		head: {
			title: "STS2 Analyzer",
			meta: [
				{ charset: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{
					name: "description",
					content: "Slay the Spire 2 Run History Analyzer",
				},
			],
		},
	},
	i18n: {
		locales: [
			{ code: "en", name: "English", file: "en.json" },
			{ code: "zh", name: "中文", file: "zh.json" },
			{ code: "ja", name: "日本語", file: "ja.json" },
			{ code: "ko", name: "한국어", file: "ko.json" },
			{ code: "de", name: "Deutsch", file: "de.json" },
			{ code: "fr", name: "Français", file: "fr.json" },
			{ code: "es", name: "Español", file: "es.json" },
			{ code: "it", name: "Italiano", file: "it.json" },
			{ code: "pl", name: "Polski", file: "pl.json" },
			{ code: "pt", name: "Português", file: "pt.json" },
			{ code: "ru", name: "Русский", file: "ru.json" },
			{ code: "tr", name: "Türkçe", file: "tr.json" },
			{ code: "th", name: "ไทย", file: "th.json" },
		],
		lazy: true,
		langDir: "app/locales",
		defaultLocale: "en",
		strategy: "no_prefix",
		vueI18n: "./i18n/i18n.config.ts",
	},
	tailwindcss: {
		configPath: "tailwind.config.ts",
	},
});
