import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
	plugins: [vue()],
	test: {
		globals: true,
		environment: "jsdom",
		include: ["tests/**/*.{test,spec}.{js,ts}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
	},
	resolve: {
		alias: {
			"~": fileURLToPath(new URL("./app", import.meta.url)),
		},
	},
});
