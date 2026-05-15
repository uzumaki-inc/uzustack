/**
 * Learnings resolver — skill 横断の学習記憶
 *
 * 学習は project 単位で ~/.uzustack/projects/{slug}/learnings.jsonl に保存。
 * 各 entry は JSONL 行: ts, skill, type, key, insight, confidence,
 * source, branch, commit, files[]。
 *
 * 保存は append-only。重複（同一 key+type）は read 時に
 * uzustack-learnings-search が解決（key+type ごとの最新が勝つ）。
 *
 * cross-project 探索は opt-in。初回のみ AskUserQuestion で確認し、
 * uzustack-config に設定を永続化する。
 */
import type { TemplateContext } from './types';

export function generateLearningsSearch(ctx: TemplateContext): string {
  if (ctx.host === 'codex') {
    // Codex: simpler version, no cross-project, uses $UZUSTACK_BIN
    return `## 過去の学習

前回のセッションから関連する学習を検索する:

\`\`\`bash
$UZUSTACK_BIN/uzustack-learnings-search --limit 10 2>/dev/null || true
\`\`\`

学習が見つかった場合、分析に取り込む。review finding が過去の学習に一致したら、
明記する: "過去の学習を適用: [key] (confidence N, [date] より)"`;
  }

  return `## 過去の学習

前回のセッションから関連する学習を検索する:

\`\`\`bash
_CROSS_PROJ=$(${ctx.paths.binDir}/uzustack-config get cross_project_learnings 2>/dev/null || echo "unset")
echo "CROSS_PROJECT: $_CROSS_PROJ"
if [ "$_CROSS_PROJ" = "true" ]; then
  ${ctx.paths.binDir}/uzustack-learnings-search --limit 10 --cross-project 2>/dev/null || true
else
  ${ctx.paths.binDir}/uzustack-learnings-search --limit 10 2>/dev/null || true
fi
\`\`\`

\`CROSS_PROJECT\` が \`unset\`（初回）の場合: AskUserQuestion を使う:

> uzustack はこのマシン上の他プロジェクトの学習を検索して、
> ここで役立つパターンを見つけることができます。データはローカルに留まります
> （マシン外に出ることはありません）。
> 個人開発者・少人数チームに推奨。複数クライアントのコードベースを扱っていて
> 学習の混入が懸念される場合はスキップしてください。

選択肢:
- A) cross-project 学習を有効化する（推奨）
- B) 学習を現プロジェクト限定にする

A の場合: \`${ctx.paths.binDir}/uzustack-config set cross_project_learnings true\` を実行
B の場合: \`${ctx.paths.binDir}/uzustack-config set cross_project_learnings false\` を実行

設定後、適切なフラグで検索を再実行する。

学習が見つかった場合、分析に取り込む。review finding が過去の学習に一致したら、
表示する:

**"過去の学習を適用: [key] (confidence N/10, [date] より)"**

蓄積の可視化が目的。uzustack がコードベースについて賢くなっていく過程を
ユーザーが実感できるようにする。`;
}

export function generateLearningsLog(ctx: TemplateContext): string {
  const binDir = ctx.host === 'codex' ? '$UZUSTACK_BIN' : ctx.paths.binDir;

  return `## 学習の記録

このセッションで発見した非自明なパターン、落とし穴、アーキテクチャ上の知見があれば、
将来のセッション向けに記録する:

\`\`\`bash
${binDir}/uzustack-learnings-log '{"skill":"${ctx.skillName}","type":"TYPE","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"source":"SOURCE","files":["path/to/relevant/file"]}'
\`\`\`

**Types:** \`pattern\`（再利用可能なアプローチ）、\`pitfall\`（やってはいけないこと）、\`preference\`
（ユーザーが明示）、\`architecture\`（構造的決定）、\`tool\`（ライブラリ / フレームワークの知見）、
\`operational\`（プロジェクト環境 / CLI / ワークフローの知識）。

**Sources:** \`observed\`（コード内で発見）、\`user-stated\`（ユーザーが伝達）、
\`inferred\`（AI の推論）、\`cross-model\`（Claude と Codex の両方が合意）。

**Confidence:** 1-10。正直に。コードで確認した observed パターンは 8-9。
自信のない推論は 4-5。ユーザーが明示した preference は 10。

**files:** 学習が参照する具体的なファイルパスを含める。これにより
陳腐化検出が可能になる: 対象ファイルが後で削除されたら、学習にフラグを立てられる。

**本当の発見だけを記録する。** 自明なことは記録しない。ユーザーが既に知っていることは記録しない。
良いテスト: この知見は将来のセッションで時間を節約するか？ もし yes なら記録する。`;
}
