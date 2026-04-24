/**
 * ESLint flat config for Star Freight Tycoon.
 *
 * Scope: custom lint rules only (no stylistic / recommended preset noise).
 * Custom rules are wired in via the local `sft` plugin in
 * `tools/eslint-rules/`.
 */
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "e2e/**",
      "scripts/**",
      "packages/*/dist/**",
      "public/**",
      "coverage/**",
      ".claude/**",
      ".hive/**",
      ".playwright-mcp/**",
    ],
  },
  {
    files: ["src/**/*.ts", "packages/*/src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // Custom rules are added in follow-up commits.
    },
  },
];
