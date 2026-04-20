import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	{
		ignores: [
			".claude/**",
			".superpowers/**",
			".nuxt/**",
			".output/**",
			"dist/**",
			"docs/**",
			"node_modules/**",
		],
	},
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	tseslint.configs.recommended,
	...pluginVue.configs["flat/essential"].map((config) => ({
		...config,
		files: ["**/*.vue"],
		languageOptions: {
			...config.languageOptions,
			parserOptions: {
				...(config.languageOptions?.parserOptions ?? {}),
				parser: tseslint.parser,
			},
		},
		rules: {
			...(config.rules ?? {}),
			"no-undef": "off",
			"vue/multi-word-component-names": "off",
			"@typescript-eslint/no-unused-vars": "off",
		},
	})),
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
		rules: {
			"no-console": "off",
		},
	},
]);
