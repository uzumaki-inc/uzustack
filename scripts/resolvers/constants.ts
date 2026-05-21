// ─── Shared Design Constants ────────────────────────────────

/**
 * uzustack の AI slop アンチパターン — DESIGN_METHODOLOGY と DESIGN_HARD_RULES の共有。
 *
 * template で言及する価値のある overused font (blacklist ではなく収束 risk):
 * Inter, Roboto, Arial, Helvetica, Open Sans, Lato, Montserrat, Poppins,
 * 最近は Space Grotesk も。 どの AI design tool もこのうち 1 つを picks。
 * design prompt は less-common な display face に bias させる。
 */
export const AI_SLOP_BLACKLIST = [
  '紫 / violet / indigo の gradient 背景、 blue-to-purple の color scheme',
  '**3 column feature grid:** 「色付き circle 内の icon + bold title + 2 行 description」 を 3 連対称配置。 AI layout として最も識別される pattern。',
  '色付き circle 内の icon を section 装飾に使う (SaaS starter template の見た目)',
  '何でも center 寄せ (全 heading / description / card に `text-align: center`)',
  '全 element に bubbly な border-radius を均一に適用 (同じ大きな radius を全部に)',
  '装飾 blob、 floating circle、 wavy SVG divider (section が空に感じるなら、 装飾でなく content を改善せよ)',
  'emoji を design element に使う (heading 内の rocket 絵文字、 bullet point の絵文字)',
  'card の左 border を色付けする (`border-left: 3px solid <accent>`)',
  '汎用 hero copy ("Welcome to [X]"、 "Unlock the power of..."、 "Your all-in-one solution for...")',
  'cookie-cutter な section rhythm (hero → 3 features → testimonials → pricing → CTA、 各 section 同じ高さ)',
  'system-ui / `-apple-system` を **primary** の display/body font に使う — 「typography を諦めた」 signal。 本物の typeface を選べ。',
];

/** OpenAI hard rejection criteria ("Designing Delightful Frontends with GPT-5.4", 2026-03) */
export const OPENAI_HARD_REJECTIONS = [
  'first impression が汎用 SaaS card grid',
  'beautiful image だが brand が弱い',
  'strong headline はあるが明確な action がない',
  'text の背後に busy な imagery',
  '同じ mood statement を繰り返す section',
  'narrative purpose のない carousel',
  'app UI が layout でなく card stacked で構成されている',
];

/** OpenAI litmus checks — cross-model consensus scoring 用 7 つの yes/no test */
export const OPENAI_LITMUS_CHECKS = [
  'first screen で brand / product がまぎれもなく分かる？',
  '強い visual anchor が 1 つ存在する？',
  'headline だけ scan して page が理解できる？',
  '各 section に job が 1 つ？',
  'その card は本当に必要？',
  'motion は hierarchy / atmosphere を改善している？',
  '装飾的 shadow を全部消しても premium に感じる？',
];

/**
 * Codex error handling block の共有出力。
 * ADVERSARIAL_STEP, CODEX_PLAN_REVIEW, CODEX_SECOND_OPINION,
 * DESIGN_OUTSIDE_VOICES, DESIGN_REVIEW_LITE, DESIGN_SKETCH で使う。
 */
export function codexErrorHandling(feature: string): string {
  return `**Error handling:** 全 error は non-blocking — ${feature} は informational。
- Auth failure (stderr に "auth"、 "login"、 "unauthorized" を含む): note して skip
- Timeout: timeout duration を note して skip
- 空 response: note して skip
何らかの error 発生時: 続行 — ${feature} は informational、 gate ではない。`;
}
