import { defineConfig } from 'vite-plus'
import { standardRules, standardStyleRules } from './lint/standard.ts'

export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true
  },
  test: {
    include: ['test/**/*.ts'],
    // The search tests play full games and compare against a plain minimax. They take
    // 1 to 3 s on a quiet machine and several times that on a busy one, and the default
    // 5 s limit made them fail on load alone.
    testTimeout: 30_000
  },
  lint: {
    ignorePatterns: ['dist/**'],
    env: { node: true, browser: true, es2022: true },
    plugins: ['oxc', 'typescript', 'import', 'node', 'promise'],
    jsPlugins: ['@stylistic/eslint-plugin'],
    // the type escape hatches stay closed: no any, no @ts-ignore
    rules: {
      ...standardRules,
      ...standardStyleRules,
      'typescript/no-explicit-any': 'error',
      'typescript/ban-ts-comment': 'error'
    },
    options: { typeAware: true, typeCheck: true }
  },
  check: {
    // oxfmt only formats prettier style, which would rewrite the standard style
    fmt: false
  }
})
