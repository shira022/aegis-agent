import js from "@eslint/js";
import tseslint from "typescript-eslint";

const TARGET_FILES = ["**/*.{ts,tsx,mjs,js}"];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.turbo/**",
      "apps/desktop/src-tauri/**",
      "**/*.d.ts",
    ],
  },
  {
    files: TARGET_FILES,
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: TARGET_FILES,
  })),
  {
    // Test doubles frequently need loose `any` / `Function` shapes to stand in
    // for partial DOM, SDK, or child_process fakes. Disabling these two rules
    // only inside test directories keeps test-only ergonomics from leaking into
    // production code without weakening the assertions themselves.
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  },
);
