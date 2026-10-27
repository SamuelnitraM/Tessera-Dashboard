import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['out', 'dist', 'node_modules', '**/dist', '**/node_modules', '.claude/worktrees']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: [
      'src/main/**/*.ts',
      'src/preload/**/*.ts',
      '*.config.{js,ts}',
      'build/**/*.mjs',
      'tests/**/*.{cjs,mjs}'
    ],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}', 'plugins/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite]
  },
  // SDK des modules tiers : code du bloc (navigateur) et outils de construction (Node.js)
  {
    files: ['packages/module-sdk/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    extends: [reactHooks.configs.flat.recommended]
  },
  {
    files: ['packages/module-sdk/bin/*.js'],
    languageOptions: { globals: globals.node }
  },
  // Modèle de module et exemples (projets de modules tiers)
  {
    files: ['templates/**/*.{ts,tsx}', 'examples/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite]
  },
  // Toujours en dernier : désactive les règles de style gérées par Prettier
  prettier
])
