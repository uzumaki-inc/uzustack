/**
 * RESOLVERS record — maps {{PLACEHOLDER}} names to generator functions.
 * Each resolver takes a TemplateContext and returns the replacement string.
 *
 * Phase 3 では中身は空 stub。Phase 4+ で本体（preamble.ts / learnings.ts /
 * gbrain.ts に分割するのが gstack 本家の構造）に置き換わる「hand-off 契約」。
 *
 * 既知 placeholder は登録 → 空展開で生成成功。
 * 未登録 placeholder（{{BOGUS}} 等）は gen-skill-docs.ts 側が
 * "Unresolved placeholders" で fail-loud にする。
 */

import type { ResolverFn } from './types';
import { generateSlugSetup } from './utility';

export const RESOLVERS: Record<string, ResolverFn> = {
  // `eval "$(uzustack-slug)"` + `mkdir -p ~/.uzustack/projects/$SLUG` の single-line bash
  SLUG_SETUP: generateSlugSetup,
  // Phase 4+ で voice + ETHOS preamble を返す予定
  PREAMBLE: (_ctx, _args) => '',
  // Phase 4+ で ~/.uzustack/projects/{SLUG}/learnings.jsonl から検索結果を返す予定（Phase 5）
  LEARNINGS_SEARCH: (_ctx, _args) => '',
  // Phase 4+ で学習ログ書き込み指示文を返す予定（Phase 5）
  LEARNINGS_LOG: (_ctx, _args) => '',
  // Phase 4+ でマシン間記憶同期の load 指示文を返す予定（Phase 5）
  GBRAIN_CONTEXT_LOAD: (_ctx, _args) => '',
  // Phase 4+ でマシン間記憶同期の save 指示文を返す予定（Phase 5）
  GBRAIN_SAVE_RESULTS: (_ctx, _args) => '',
  // Phase 4+ で `gh pr view` / `gh repo view` 経由の base branch 動的検出 bash を返す予定
  BASE_BRANCH_DETECT: (_ctx, _args) => '',
  // Phase 4+ で `eval "$(uzustack-slug)"` 単独の single-line bash を返す予定（Phase 4、`SLUG_SETUP` から mkdir 部分を除いた eval-only 派生）
  SLUG_EVAL: (_ctx, _args) => '',
  // Phase 4+ で benefits-from frontmatter を skill 推奨文に変換する予定（Phase 4 / plan 系 skill 連携 meta）
  BENEFITS_FROM: (_ctx, _args) => '',
  // Phase 4+ で別 skill を inline で起動する指示文を返す予定（Phase 4 連鎖機構、{{INVOKE_SKILL:<skill-name>}}）
  INVOKE_SKILL: (_ctx, _args) => '',
  // Phase 4+ で spec review loop の指示文を返す予定（Phase 4 / plan 系 skill 連鎖）
  SPEC_REVIEW_LOOP: (_ctx, _args) => '',
  // Phase 4+ で codex 経由の plan 外部視点 review 指示文を返す予定（Phase 4 / 外部 reviewer 連携）
  CODEX_PLAN_REVIEW: (_ctx, _args) => '',
  // Phase 4+ で review readiness dashboard 表示指示文を返す予定（Phase 4 / review 連携）
  REVIEW_DASHBOARD: (_ctx, _args) => '',
  // Phase 4+ で plan file への review report 追記指示文を返す予定（Phase 4 / plan file 連鎖）
  PLAN_FILE_REVIEW_REPORT: (_ctx, _args) => '',
  // Phase 4+ で finding の信頼度評価 calibration 指示文を返す予定（Phase 4 / cso・review・ship 等の severity 評価系 skill 連携）
  CONFIDENCE_CALIBRATION: (_ctx, _args) => '',
  // Phase 4+ で adversarial step（red-team / failure-mode 探索）指示文を返す予定（Phase 4 / review・ship 連携）
  ADVERSARIAL_STEP: (_ctx, _args) => '',
  // Phase 4+ で cross-review 間の重複 finding 統合指示文を返す予定（Phase 4 / review 内の specialists / external review 連携）
  CROSS_REVIEW_DEDUP: (_ctx, _args) => '',
  // Phase 4+ で plan 完了 audit（review 文脈）指示文を返す予定（Phase 4 / plan file 連鎖、review skill 用）
  PLAN_COMPLETION_AUDIT_REVIEW: (_ctx, _args) => '',
  // Phase 4+ で specialists 群（testing / security / performance 等）並列起動指示文を返す予定（Phase 4 / review skill の review army 機構）
  REVIEW_ARMY: (_ctx, _args) => '',
  // Phase 4+ で plan からのスコープ drift 検出指示文を返す予定（Phase 4 / review・ship 連携の scope guard）
  SCOPE_DRIFT: (_ctx, _args) => '',
};
