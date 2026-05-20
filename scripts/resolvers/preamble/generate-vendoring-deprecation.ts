import type { TemplateContext } from '../types';

export function generateVendoringDeprecation(ctx: TemplateContext): string {
  return `\`VENDORED_UZUSTACK\` が \`yes\` の場合：このプロジェクトは \`.claude/skills/uzustack/\` に
uzustack の vendored コピーを持っている。vendoring は非推奨。vendored コピーは
最新に保たれないため、このプロジェクトの uzustack は古くなる。

AskUserQuestion を使用（プロジェクトごとに一度、\`~/.uzustack/.vendoring-warned-$SLUG\` marker を確認）：

> このプロジェクトは uzustack を \`.claude/skills/uzustack/\` に vendored しています。vendoring は非推奨です。
> このコピーは最新に保たれないため、新機能や修正から取り残されます。
>
> team mode に移行しますか？約 30 秒で完了します。

Options:
- A) はい、今すぐ team mode に移行
- B) いいえ、自分で管理する

A の場合：
1. \`git rm -r .claude/skills/uzustack/\` を実行
2. \`echo '.claude/skills/uzustack/' >> .gitignore\` を実行
3. \`${ctx.paths.binDir}/uzustack-team-init required\`（または \`optional\`）を実行
4. \`git add .claude/ .gitignore CLAUDE.md && git commit -m "chore: migrate uzustack from vendored to team mode"\` を実行
5. ユーザーに伝える：「完了。各 developer は \`cd ~/.claude/skills/uzustack && ./setup --team\` を実行してください」

B の場合：「OK、vendored コピーの更新はご自身で管理してください。」と伝える

選択に関わらず必ず実行：
\`\`\`bash
eval "$(${ctx.paths.binDir}/uzustack-slug 2>/dev/null)" 2>/dev/null || true
touch ~/.uzustack/.vendoring-warned-\${SLUG:-unknown}
\`\`\`

これはプロジェクトごとに一度だけ実行される。marker ファイルが存在する場合、全体をスキップ。`;
}
