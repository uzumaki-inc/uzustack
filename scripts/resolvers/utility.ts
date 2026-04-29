/**
 * Utility resolvers — single-line bash helpers が中心。
 *
 * Phase 3 では SLUG_SETUP のみ。upstream の generateSlugEval や
 * generateBaseBranchDetect 等は uzustack 側で必要になった時点で
 * 機械翻案して追加する（uzustack 機械翻案範囲を最大化する方針）。
 */

import type { TemplateContext } from './types';

/**
 * `eval "$(uzustack-slug)"` で SLUG / BRANCH を export し、
 * `~/.uzustack/projects/$SLUG/` を mkdir する single-line bash を返す。
 *
 * checkpoint 系 skill (context-save / context-restore) や
 * Phase 4+ で導入される learnings / gbrain 系 skill が共通で使う。
 */
export function generateSlugSetup(ctx: TemplateContext): string {
  return `eval "$(${ctx.paths.binDir}/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG`;
}
