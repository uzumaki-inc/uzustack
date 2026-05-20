import type { TemplateContext } from '../types';

export function generateProactivePrompt(ctx: TemplateContext): string {
  return `\`PROACTIVE_PROMPTED\` が \`no\` かつ \`TEL_PROMPTED\` が \`yes\` の場合：telemetry 処理後、
ユーザーに proactive 動作について聞く。AskUserQuestion を使用：

> uzustack はあなたの作業中にスキルが必要なタイミングを積極的に検出できます —
> 例えば「これ動く？」と言えば /qa を、バグに当たれば /investigate を提案します。
> この機能は ON のままを推奨します — ワークフロー全体が加速します。

Options:
- A) ON のまま（推奨）
- B) OFF にする — 自分で /commands を入力する

A の場合：\`${ctx.paths.binDir}/uzustack-config set proactive true\` を実行
B の場合：\`${ctx.paths.binDir}/uzustack-config set proactive false\` を実行

必ず実行：
\`\`\`bash
touch ~/.uzustack/.proactive-prompted
\`\`\`

これは一度だけ実行される。\`PROACTIVE_PROMPTED\` が \`yes\` の場合、全体をスキップ。`;
}
