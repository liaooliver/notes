module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // promote (staging -> main) 的 squash 標題用 release:，
    // config-conventional 的預設清單沒有這個 type。
    'type-enum': [2, 'always', [
      'build', 'chore', 'ci', 'docs', 'feat', 'fix',
      'perf', 'refactor', 'release', 'revert', 'style', 'test',
    ]],
  },
};
