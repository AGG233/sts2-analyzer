import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [vue()],
	test: {
		globals: true,
		environment: "jsdom",
		include: ["tests/**/*.{test,spec}.{js,ts}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			include: ["app/**/*.{ts,vue}"],
		},
	},
	resolve: {
		alias: {
			"~": fileURLToPath(new URL("./app", import.meta.url)),
			"vue-i18n": fileURLToPath(
				new URL("./tests/mocks/vue-i18n.ts", import.meta.url),
			),
		},
	},
});
