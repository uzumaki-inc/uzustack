import type { TemplateContext } from '../types';

export function generateTelemetryPrompt(ctx: TemplateContext): string {
  return `\`TEL_PROMPTED\` が \`no\` かつ \`LAKE_INTRO\` が \`yes\` の場合：lake intro 処理後、
ユーザーに telemetry について聞く。AskUserQuestion を使用：

> uzustack の改善に協力してください！community mode では使用データ（使用したスキル、所要時間、
> クラッシュ情報）を安定した device ID とともに共有し、トレンドの追跡とバグ修正を加速します。
> コード、ファイルパス、リポジトリ名は一切送信されません。
> いつでも \`uzustack-config set telemetry off\` で変更できます。

Options:
- A) uzustack の改善に協力する！（推奨）
- B) いいえ

A の場合：\`${ctx.paths.binDir}/uzustack-config set telemetry community\` を実行

B の場合：follow-up の AskUserQuestion を聞く：

> anonymous mode はどうですか？*誰かが* uzustack を使ったことだけを記録します — 固有 ID なし、
> session を結びつける方法なし。誰かが使っているかを知るためのカウンターです。

Options:
- A) anonymous なら OK
- B) いいえ、完全にオフ

B→A の場合：\`${ctx.paths.binDir}/uzustack-config set telemetry anonymous\` を実行
B→B の場合：\`${ctx.paths.binDir}/uzustack-config set telemetry off\` を実行

必ず実行：
\`\`\`bash
touch ~/.uzustack/.telemetry-prompted
\`\`\`

これは一度だけ実行される。\`TEL_PROMPTED\` が \`yes\` の場合、全体をスキップ。`;
}
