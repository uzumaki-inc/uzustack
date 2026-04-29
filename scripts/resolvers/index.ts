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
};
