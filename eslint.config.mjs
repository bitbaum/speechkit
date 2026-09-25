// Flat config. Recommended presets only: a bespoke rule set would be a second
// opinion to maintain for no benefit. The floor is "lint runs and can fail",
// not "lint encodes taste".
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
  },
);
