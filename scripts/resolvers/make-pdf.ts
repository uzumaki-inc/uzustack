import type { TemplateContext } from './types';

/**
 * {{MAKE_PDF_SETUP}} — make-pdf binary を $P に解決する shell preamble を emit。
 * generateBrowseSetup / generateDesignSetup と同型。
 *
 * $P = make-pdf/dist/pdf。
 *
 * 解決順 (src/browseClient.ts::resolveBrowseBin と一致):
 *   1. ローカル skill root: $_ROOT/{localSkillRoot}/make-pdf/dist/pdf
 *   2. グローバル: ~/{globalRoot}/make-pdf/dist/pdf
 *   3. env override (MAKE_PDF_BIN) — contributor dev build 向け
 */
export function generateMakePdfSetup(ctx: TemplateContext): string {
  return `## MAKE-PDF SETUP (make-pdf を使う前に必ずこの check を走らせる)

\`\`\`bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
P=""
[ -n "$MAKE_PDF_BIN" ] && [ -x "$MAKE_PDF_BIN" ] && P="$MAKE_PDF_BIN"
[ -z "$P" ] && [ -n "$_ROOT" ] && [ -x "$_ROOT/${ctx.paths.localSkillRoot}/make-pdf/dist/pdf" ] && P="$_ROOT/${ctx.paths.localSkillRoot}/make-pdf/dist/pdf"
[ -z "$P" ] && P="$HOME${ctx.paths.makePdfDir.replace(/^~/, '')}/pdf"
if [ -x "$P" ]; then
  echo "MAKE_PDF_READY: $P"
  alias _p_="$P"   # shellcheck alias helper (not exported)
  export P   # same skill 呼出し内の後続 block で $P として参照可能
else
  echo "MAKE_PDF_NOT_AVAILABLE (uzustack repo で './setup' を実行して build してください)"
fi
\`\`\`

\`MAKE_PDF_NOT_AVAILABLE\` が出力された場合: binary が build されていない旨を user に伝える。
uzustack repo で \`./setup\` を実行してもらってから再試行する。

\`MAKE_PDF_READY\` が出力された場合: \`$P\` が以降の skill body で使う binary path。
skill body の portability を保つため、 path 直書きでなく \`$P\` を使う。

主要コマンド:
- \`$P generate <input.md> [output.pdf]\` — markdown を PDF に render (80% の use case)
- \`$P generate --cover --toc essay.md out.pdf\` — 出版品質の full layout
- \`$P generate --watermark DRAFT memo.md draft.pdf\` — 斜め DRAFT watermark
- \`$P preview <input.md>\` — HTML を render してブラウザで開く (高速 iteration)
- \`$P setup\` — browse + Chromium + pdftotext を verify、 smoke test を実行
- \`$P --help\` — 全 flag リファレンス

Output contract:
- \`stdout\`: 成功時は output path のみ。 1 行。
- \`stderr\`: progress (\`Rendering HTML... Generating PDF...\`)。 \`--quiet\` で抑制。
- Exit 0 success / 1 bad args / 2 render error / 3 Paged.js timeout / 4 browse unavailable。`;
}
