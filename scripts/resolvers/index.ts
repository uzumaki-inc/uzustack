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
  // Phase 4+ で browse 環境セットアップ指示文を返す予定（Phase 4 / browse 連携、office-hours・devex-review 等で使用）
  BROWSE_SETUP: (_ctx, _args) => '',
  // Phase 4+ で Codex / 別 LLM による second opinion 取得指示文を返す予定（Phase 4 / 外部 reviewer 連携、office-hours 等の plan 系で使用）
  CODEX_SECOND_OPINION: (_ctx, _args) => '',
  // Phase 4+ で design mockup（visual draft）生成指示文を返す予定（Phase 4 / design 系 skill 連携、office-hours で使用）
  DESIGN_MOCKUP: (_ctx, _args) => '',
  // Phase 4+ で design sketch（rough idea）生成指示文を返す予定（Phase 4 / design 系 skill 連携、office-hours で使用）
  DESIGN_SKETCH: (_ctx, _args) => '',
  // Phase 4+ で developer experience（DX）監査の framework / dimensions 指示文を返す予定（Phase 4 / devex-review・plan-devex-review で使用）
  DX_FRAMEWORK: (_ctx, _args) => '',
  // Phase 4+ で CHANGELOG 編集 / VERSION bump workflow 指示文を返す予定（Phase 4 / ship 専用、release-summary format 連携）
  CHANGELOG_WORKFLOW: (_ctx, _args) => '',
  // Phase 4+ で commit message の Co-Authored-By trailer 指示文を返す予定（Phase 4 / ship 専用、AI co-author attribution）
  CO_AUTHOR_TRAILER: (_ctx, _args) => '',
  // Phase 4+ で design review lite（PR 内 frontend 変更検出時）指示文を返す予定（Phase 4 / ship 専用、design 系 skill 連携）
  DESIGN_REVIEW_LITE: (_ctx, _args) => '',
  // Phase 4+ で plan 完了 audit（ship 文脈、plan 完遂検証）指示文を返す予定（Phase 4 / plan file 連鎖、ship skill 用）
  PLAN_COMPLETION_AUDIT_SHIP: (_ctx, _args) => '',
  // Phase 4+ で plan の verification 段階（実 task の合致検証）指示文を返す予定（Phase 4 / ship 専用、plan-driven verification）
  PLAN_VERIFICATION_EXEC: (_ctx, _args) => '',
  // Phase 4+ で test 環境 bootstrap（CI / E2E 起動準備）指示文を返す予定（Phase 4 / ship 専用、test runner 連携）
  TEST_BOOTSTRAP: (_ctx, _args) => '',
  // Phase 4+ で test coverage audit（ship 文脈、coverage gap 検出）指示文を返す予定（Phase 4 / ship 専用、coverage tool 連携）
  TEST_COVERAGE_AUDIT_SHIP: (_ctx, _args) => '',
  // Phase 4+ で test failure triage（ship workflow 中の test fail 分類）指示文を返す予定（Phase 4 / ship 専用、failure classification）
  TEST_FAILURE_TRIAGE: (_ctx, _args) => '',
  // Phase 4+ で deploy 設定 bootstrap（platform 検出 / production URL / health check）指示文を返す予定（Phase 4 / land-and-deploy・setup-deploy 連携）
  DEPLOY_BOOTSTRAP: (_ctx, _args) => '',
  // Phase 4+ で uzustack designer 検出 + DESIGN_READY/DESIGN_NOT_AVAILABLE 判定指示文を返す予定（Phase 4 / design-consultation・design-html 連携、design CLI 検出）
  DESIGN_SETUP: (_ctx, _args) => '',
  // Phase 4+ でユーザーの過去 session から taste profile を読み出す指示文を返す予定（Phase 5 / design 系 skill 連携、approved choices の demonstrated preference）
  TASTE_PROFILE: (_ctx, _args) => '',
  // Phase 4+ で外部視点（外部 designer / Codex / Gemini）による design proposal レビュー指示文を返す予定（Phase 4 / design 系 skill 連携、SCOPE EXPANSION 系 review）
  DESIGN_OUTSIDE_VOICES: (_ctx, _args) => '',
  // Phase 4+ で design-shotgun loop（multi-variant 生成 / 比較 board / iterate）の起動指示文を返す予定（Phase 4 / design-shotgun・design-consultation 連携）
  DESIGN_SHOTGUN_LOOP: (_ctx, _args) => '',
  // Phase 4+ で UX 設計原則（accessibility / hierarchy / contrast 等）を返す予定（Phase 4 / design-html・design-review 連携）
  UX_PRINCIPLES: (_ctx, _args) => '',
};
