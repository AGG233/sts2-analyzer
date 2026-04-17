import css from "@eslint/css";
import js from "@eslint/js";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"],
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: { globals: globals.browser },
	},
	tseslint.configs.recommended,
	pluginVue.configs["flat/essential"],
	{
		files: ["**/*.vue"],
		languageOptions: { parserOptions: { parser: tseslint.parser } },
	},
	{
		files: ["**/*.md"],
		plugins: { markdown },
		language: "markdown/commonmark",
		extends: ["markdown/recommended"],
	},
	{
		files: ["**/*.css"],
		plugins: { css },
		language: "css/css",
		extends: ["css/recommended"],
	},
]);
