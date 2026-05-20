

export function generateTestFailureTriage(): string {
  return `## テスト失敗の所有権トリアージ（Test Failure Ownership Triage）

テストが失敗したとき、すぐに止まらない。まず所有権を判定する：

### Step T1: 各失敗を分類

失敗したテストごとに：

1. **このブランチで変更されたファイルを取得：**
   \`\`\`bash
   git diff origin/<base>...HEAD --name-only
   \`\`\`

2. **失敗を分類：**
   - **In-branch**（ブランチ内）：失敗したテストファイル自体がこのブランチで変更された場合、またはテスト出力がブランチで変更されたコードを参照している場合、またはブランチ diff の変更まで失敗を追跡できる場合。
   - **Likely pre-existing**（既存の可能性）：テストファイルもテスト対象コードもこのブランチで変更されておらず、かつブランチの変更に無関係な失敗だと判断できる場合。
   - **曖昧な場合は in-branch をデフォルトにする。** 壊れたテストを ship するより、開発者を止める方が安全。既存と分類するのは確信がある場合のみ。

   この分類はヒューリスティック — diff とテスト出力を読んで判断する。プログラム的な依存グラフは持っていない。

### Step T2: in-branch の失敗を処理

**STOP。** これはあなたの失敗。表示して続行しない。開発者は ship する前に自分の壊れたテストを修正しなければならない。

### Step T3: pre-existing の失敗を処理

preamble 出力の \`REPO_MODE\` を確認する。

**REPO_MODE が \`solo\` の場合：**

AskUserQuestion を使用：

> これらのテスト失敗は既存のもの（あなたのブランチの変更が原因ではない）と思われます：
>
> [各失敗を file:line と簡潔なエラー説明でリスト]
>
> solo リポジトリなので、修正するのはあなただけです。
>
> RECOMMENDATION: A を選択 — コンテキストが新鮮なうちに今修正。Completeness: 9/10。
> A) 今すぐ調査して修正（human: ~2-4h / CC: ~15min）— Completeness: 10/10
> B) P0 TODO として追加 — このブランチが land した後に修正 — Completeness: 7/10
> C) スキップ — 知っている、このまま ship — Completeness: 3/10

**REPO_MODE が \`collaborative\` または \`unknown\` の場合：**

AskUserQuestion を使用：

> これらのテスト失敗は既存のもの（あなたのブランチの変更が原因ではない）と思われます：
>
> [各失敗を file:line と簡潔なエラー説明でリスト]
>
> collaborative リポジトリです — これらは他の人の責任かもしれません。
>
> RECOMMENDATION: B を選択 — 壊した人に assign して適切な人が修正。Completeness: 9/10。
> A) とにかく今すぐ調査して修正 — Completeness: 10/10
> B) Blame + GitHub issue を作者に assign — Completeness: 9/10
> C) P0 TODO として追加 — Completeness: 7/10
> D) スキップ — このまま ship — Completeness: 3/10

### Step T4: 選択したアクションを実行

**「今すぐ調査して修正」の場合：**
- /investigate のマインドセットに切り替え：根本原因を先に、それから最小限の修正。
- 既存の失敗を修正する。
- ブランチの変更とは別に修正を commit する：\`git commit -m "fix: pre-existing test failure in <test-file>"\`
- ワークフローを続行する。

**「P0 TODO として追加」の場合：**
- \`TODOS.md\` が存在する場合、\`review/TODOS-format.md\`（または \`.claude/skills/review/TODOS-format.md\`）のフォーマットに従ってエントリを追加。
- \`TODOS.md\` が存在しない場合、標準ヘッダーで作成しエントリを追加。
- エントリには含める：タイトル、エラー出力、気づいたブランチ、priority P0。
- ワークフローを続行する — 既存の失敗は non-blocking として扱う。

**「Blame + GitHub issue を assign」の場合（collaborative のみ）：**
- 誰が壊したか特定する。テストファイルとテスト対象のプロダクションコードの両方を確認：
  \`\`\`bash
  # 失敗したテストを最後に触ったのは誰？
  git log --format="%an (%ae)" -1 -- <failing-test-file>
  # テストがカバーするプロダクションコードを最後に触ったのは誰？（実際の破壊者であることが多い）
  git log --format="%an (%ae)" -1 -- <source-file-under-test>
  \`\`\`
  異なる人物の場合、プロダクションコードの作者を優先する — regression を導入した可能性が高い。
- その人に assign した issue を作成する（Step 0 で検出したプラットフォームを使用）：
  - **GitHub の場合：**
    \`\`\`bash
    gh issue create \\
      --title "Pre-existing test failure: <test-name>" \\
      --body "Found failing on branch <current-branch>. Failure is pre-existing.\\n\\n**Error:**\\n\`\`\`\\n<first 10 lines>\\n\`\`\`\\n\\n**Last modified by:** <author>\\n**Noticed by:** uzustack /ship on <date>" \\
      --assignee "<github-username>"
    \`\`\`
  - **GitLab の場合：**
    \`\`\`bash
    glab issue create \\
      -t "Pre-existing test failure: <test-name>" \\
      -d "Found failing on branch <current-branch>. Failure is pre-existing.\\n\\n**Error:**\\n\`\`\`\\n<first 10 lines>\\n\`\`\`\\n\\n**Last modified by:** <author>\\n**Noticed by:** uzustack /ship on <date>" \\
      -a "<gitlab-username>"
    \`\`\`
- どちらの CLI も利用できないか \`--assignee\`/\`-a\` が失敗した場合（ユーザーが org に属していない等）、assignee なしで issue を作成し、body に確認すべき人を記載する。
- ワークフローを続行する。

**「スキップ」の場合：**
- ワークフローを続行する。
- 出力に記載する：「Pre-existing test failure skipped: <test-name>」`;
}
