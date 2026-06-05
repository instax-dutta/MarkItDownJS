import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-undef": "off",
    },
  },
  {
    files: ["packages/cli/**/*.ts", "packages/api/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["packages/core/src/registry.ts"],
    rules: {
      "no-console": "off",
    },
  },
  prettierConfig,
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.js",
      "**/*.cjs",
      "**/*.mjs",
      "coverage/**",
      ".turbo/**",
    ],
  },
];
