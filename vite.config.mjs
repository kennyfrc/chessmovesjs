import { defineConfig } from 'vite-plus'
import { standardRules, standardStyleRules } from './lint/standard.mjs'

export default defineConfig({
  pack: {
    entry: ['src/index.mjs'],
    format: ['esm', 'cjs']
  },
  test: {
    include: ['test/**/*.js'],
    globals: true
  },
  lint: {
    ignorePatterns: ['dist/**'],
    env: { node: true, browser: true, es2022: true },
    plugins: ['oxc', 'import', 'node', 'promise'],
    jsPlugins: ['@stylistic/eslint-plugin'],
    overrides: [{ files: ['test/**/*.js'], env: { vitest: true } }],
    rules: { ...standardRules, ...standardStyleRules }
  },
  check: {
    // oxfmt only formats prettier style, which would rewrite the standard style
    fmt: false
  }
})
