import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  ignores: ['dist/**', 'scripts/**', 'GAME_SOURCE.md', 'src/locales/game/**', 'docs/**', '.playwright-mcp/**'],
  rules: {
    // 项目没有 linter 历史，先放宽部分规则
    'no-console': 'warn',
    'curly': 'off',
    'style/brace-style': 'off',
    'ts/no-explicit-any': 'warn',
  },
})
