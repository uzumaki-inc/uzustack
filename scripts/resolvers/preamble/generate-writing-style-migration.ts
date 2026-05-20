import type { TemplateContext } from '../types';

export function generateWritingStyleMigration(ctx: TemplateContext): string {
  return `\`WRITING_STYLE_PENDING\` が \`yes\` の場合：uzustack v1 へのアップグレード後の最初のスキル実行で、
新しいデフォルトの writing style について一度だけユーザーに聞く。AskUserQuestion を使用：

> v1 の prompt はよりシンプルになった。技術用語は初回使用時に一文で意味を補足し、
> 質問はアウトカムの観点で構成し、文はより短く。
>
> 新しいデフォルトを維持するか、以前のタイトな prose に戻すか？

Options:
- A) 新しいデフォルトを維持（推奨 — 良い文章はすべての人を助ける）
- B) V0 prose に戻す — \`explain_level: terse\` を設定

A の場合：\`explain_level\` は未設定のまま（デフォルトの \`default\` が適用）。
B の場合：\`${ctx.paths.binDir}/uzustack-config set explain_level terse\` を実行。

選択に関わらず必ず実行：
\`\`\`bash
rm -f ~/.uzustack/.writing-style-prompt-pending
touch ~/.uzustack/.writing-style-prompted
\`\`\`

これは一度だけ実行される。\`WRITING_STYLE_PENDING\` が \`no\` の場合、全体をスキップ。`;
}
