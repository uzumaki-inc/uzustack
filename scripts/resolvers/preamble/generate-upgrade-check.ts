import type { TemplateContext } from '../types';

export function generateUpgradeCheck(ctx: TemplateContext): string {
  return `\`PROACTIVE\` が \`"false"\` の場合、uzustack スキルの積極的な提案をせず、会話コンテキストに
基づくスキルの自動起動もしない。ユーザーが明示的に入力したスキルのみ実行する
（例：/qa、/ship）。自動起動するところだった場合は、代わりに簡潔に：
「/skillname が役立ちそうです — 実行しますか？」と言って確認を待つ。
ユーザーは proactive 動作を opt-out している。

\`SKILL_PREFIX\` が \`"true"\` の場合、ユーザーはスキル名を名前空間化している。他の
uzustack スキルを提案または起動する際、\`/uzustack-\` prefix を使う（例：\`/qa\` ではなく
\`/uzustack-qa\`、\`/ship\` ではなく \`/uzustack-ship\`）。ディスクパスは影響なし — スキル
ファイルの読み取りには常に \`${ctx.paths.skillRoot}/[skill-name]/SKILL.md\` を使う。

出力に \`UPGRADE_AVAILABLE <old> <new>\` が表示された場合：\`${ctx.paths.skillRoot}/uzustack-upgrade/SKILL.md\` を読んで「Inline upgrade flow」に従う（設定されていれば auto-upgrade、そうでなければ 4 つの option の AskUserQuestion、辞退時は snooze state を書き込む）。

出力に \`JUST_UPGRADED <from> <to>\` が表示され、かつ \`SPAWNED_SESSION\` が設定されていない場合：
ユーザーに「uzustack v{to} で実行中（アップデート完了！）」と伝え、新機能を紹介する。
以下の各機能マーカーについて、マーカーファイルがなく、かつその機能がユーザーにとって
有用そうであれば、AskUserQuestion で試用を促す。機能ごとユーザーごとに一度だけ起動、
アップグレードごとではない。

**spawn された session（\`SPAWNED_SESSION\` = "true"）では：機能探索を全スキップ。**
「uzustack v{to} で実行中」とだけ表示して続行。orchestrator はサブ session からの
対話的 prompt を望まない。

**機能探索マーカーと prompt**（一度に一つ、session あたり最大一つ）：

1. \`${ctx.paths.skillRoot}/.feature-prompted-continuous-checkpoint\` →
   Prompt：「継続的チェックポイントは作業を \`WIP:\` prefix で自動 commit し、
   クラッシュで進捗を失わないようにします。デフォルトではローカルのみ — どこにも
   push しません（明示的に ON にしない限り）。試しますか？」
   Options：A) continuous mode を有効にする、B) まず見せて（preamble の
   Continuous Checkpoint Mode section を表示）、C) スキップ。
   A の場合：\`${ctx.paths.binDir}/uzustack-config set checkpoint_mode continuous\` を実行。
   常に：\`touch ${ctx.paths.skillRoot}/.feature-prompted-continuous-checkpoint\`

2. \`${ctx.paths.skillRoot}/.feature-prompted-model-overlay\` →
   通知のみ（prompt なし）：「Model overlay が有効です。preamble 出力の
   \`MODEL_OVERLAY: {model}\` がどの behavioral patch が適用されているかを示します。
   スキル再生成時に \`--model\` で override できます（例：\`bun run gen:skill-docs
   --model gpt-5.4\`）。デフォルトは claude。」
   常に：\`touch ${ctx.paths.skillRoot}/.feature-prompted-model-overlay\`

JUST_UPGRADED 処理後（prompt 完了またはスキップ）、スキルワークフローを続行する。`;
}
