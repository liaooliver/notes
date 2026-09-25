module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // promote (staging -> main) 的 squash 標題用 release:，
    // config-conventional 的預設清單沒有這個 type。
    // subject 是中英混寫，開頭常常是一個大寫的英文專有名詞
    // （`docs(gitops): Phase 9 改寫成...`），會被判成 start-case 擋下來。
    // 這條規則對中文本來就沒有意義——中文沒有大小寫，它只會對開頭那個
    // 英文單字發作。關掉它，type / scope / 長度那些有意義的規則都還在。
    // 踩到的那次：run 36159446784，而且那顆 commit 已經在 staging 歷史裡，
    // 改不掉了——下一次 promote 會連它一起 lint，等於永遠過不了。
    'subject-case': [0],
    'type-enum': [2, 'always', [
      'build', 'chore', 'ci', 'docs', 'feat', 'fix',
      'perf', 'refactor', 'release', 'revert', 'style', 'test',
    ]],
  },
};
