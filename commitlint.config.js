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
    // 同一類問題的第二次：squash merge 的 body 是 GitHub 幫你串出來的一整行，
    // 不會自己折行；中文又不像英文有空白可以讓編輯器斷句，一段正常長度的說明
    // 就會超過 100 字元。錯誤本身不影響任何東西，但它會跟著進 staging 歷史，
    // 下一次 promote 到 main 時被整串 lint 一遍，變成永遠過不了的閘。
    // 降成 warning（action 預設 failOnWarnings: false，所以不會擋），
    // 提醒還在、但不會把自己鎖在門外。踩到的那次：run 36164538568。
    'body-max-line-length': [1, 'always', 100],
    'type-enum': [2, 'always', [
      'build', 'chore', 'ci', 'docs', 'feat', 'fix',
      'perf', 'refactor', 'release', 'revert', 'style', 'test',
    ]],
  },
};
