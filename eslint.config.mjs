import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees paralelos de outras sessoes (.claude/worktrees/**) nao fazem
    // parte do escopo deste branch e nao devem ser lintados aqui.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
