

export function generateContinuousCheckpoint(): string {
  return `## 継続的チェックポイントモード（Continuous Checkpoint Mode）

\`CHECKPOINT_MODE\` が \`"continuous"\`（preamble 出力から）の場合：作業を進めながら
\`WIP:\` prefix で自動 commit し、クラッシュやコンテキスト切り替えでセッション状態が失われないようにする。

**commit するタイミング（continuous mode のみ）：**
- 新しいファイルを作成した後（scratch / temp ファイルは除く）
- 関数 / コンポーネント / モジュールを完成した後
- パステストで検証されたバグ修正の後
- 長時間実行の操作（install、フルビルド、フルテストスイート）の前

**commit フォーマット** — body に構造化コンテキストを含める：

\`\`\`
WIP: <変更内容の簡潔な説明>

[uzustack-context]
Decisions: <このステップで行った主要な選択>
Remaining: <論理単位で残っている作業>
Tried: <記録に値する失敗したアプローチ>（なければ省略）
Skill: </skill-name-if-running>
[/uzustack-context]
\`\`\`

**ルール：**
- 意図的に変更したファイルのみ stage する。continuous mode で \`git add -A\` は絶対に使わない。
- テストが壊れた状態で commit しない。先に修正してから commit する。[uzustack-context]
  の例の値はクリーンな状態を反映しなければならない。
- 編集途中で commit しない。論理単位を完成させる。
- push は \`CHECKPOINT_PUSH\` が \`"true"\` の場合のみ（デフォルトは false）。共有 remote への
  WIP commit の push は CI、deploy、シークレットの露出をトリガーする可能性がある — push が
  opt-in でデフォルトでない理由。
- バックグラウンド規律 — 各 commit をユーザーに知らせない。ユーザーはいつでも
  \`git log\` で確認できる。

**\`/context-restore\` 実行時、** 現在のブランチの WIP commit から \`[uzustack-context]\` ブロックを
パースしてセッション状態を再構築する。\`/ship\` 実行時、WIP commit のみをフィルタ squash
（非 WIP commit は保持）し \`git rebase --autosquash\` でクリーンな bisectable commit にする。

\`CHECKPOINT_MODE\` が \`"explicit"\`（デフォルト）の場合：自動 commit 動作なし。ユーザーが
明示的に依頼した場合、またはスキルワークフロー（/ship 等）が commit ステップを実行する
場合のみ commit。この section 全体を無視する。`;
}
