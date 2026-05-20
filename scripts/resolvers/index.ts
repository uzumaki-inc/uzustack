/**
 * RESOLVERS record — maps {{PLACEHOLDER}} names to generator functions.
 * Each resolver takes a TemplateContext and returns the replacement string.
 *
 * PR-D1 で preamble core を wire。残りの stub は後続 PR (D2-D4b) で順次 wire。
 * 未登録 placeholder（{{BOGUS}} 等）は gen-skill-docs.ts 側が
 * "Unresolved placeholders" で fail-loud にする。
 */

import type { ResolverFn } from './types';
import { generatePreamble, generateTestFailureTriage } from './preamble';
import { generateModelOverlay } from './model-overlay';
import { generateQuestionPreferenceCheck, generateQuestionLog, generateInlineTuneFeedback } from './question-tuning';
import { generateLearningsLog, generateLearningsSearch } from './learnings';
import { generateSlugSetup } from './utility';

export const RESOLVERS: Record<string, ResolverFn> = {
  SLUG_SETUP: generateSlugSetup,
  PREAMBLE: generatePreamble,
  MODEL_OVERLAY: generateModelOverlay,
  TEST_FAILURE_TRIAGE: generateTestFailureTriage,
  QUESTION_PREFERENCE_CHECK: generateQuestionPreferenceCheck,
  QUESTION_LOG: generateQuestionLog,
  INLINE_TUNE_FEEDBACK: generateInlineTuneFeedback,
  LEARNINGS_SEARCH: generateLearningsSearch,
  LEARNINGS_LOG: generateLearningsLog,
  // --- 以下は後続 PR (D2-D4b) で wire 予定 ---
  GBRAIN_CONTEXT_LOAD: (_ctx, _args) => '',
  GBRAIN_SAVE_RESULTS: (_ctx, _args) => '',
  BASE_BRANCH_DETECT: (_ctx, _args) => '',
  SLUG_EVAL: (_ctx, _args) => '',
  BENEFITS_FROM: (_ctx, _args) => '',
  INVOKE_SKILL: (_ctx, _args) => '',
  SPEC_REVIEW_LOOP: (_ctx, _args) => '',
  CODEX_PLAN_REVIEW: (_ctx, _args) => '',
  REVIEW_DASHBOARD: (_ctx, _args) => '',
  PLAN_FILE_REVIEW_REPORT: (_ctx, _args) => '',
  CONFIDENCE_CALIBRATION: (_ctx, _args) => '',
  ADVERSARIAL_STEP: (_ctx, _args) => '',
  CROSS_REVIEW_DEDUP: (_ctx, _args) => '',
  PLAN_COMPLETION_AUDIT_REVIEW: (_ctx, _args) => '',
  REVIEW_ARMY: (_ctx, _args) => '',
  SCOPE_DRIFT: (_ctx, _args) => '',
  BROWSE_SETUP: (_ctx, _args) => '',
  CODEX_SECOND_OPINION: (_ctx, _args) => '',
  DESIGN_MOCKUP: (_ctx, _args) => '',
  DESIGN_SKETCH: (_ctx, _args) => '',
  DX_FRAMEWORK: (_ctx, _args) => '',
  CHANGELOG_WORKFLOW: (_ctx, _args) => '',
  CO_AUTHOR_TRAILER: (_ctx, _args) => '',
  DESIGN_REVIEW_LITE: (_ctx, _args) => '',
  PLAN_COMPLETION_AUDIT_SHIP: (_ctx, _args) => '',
  PLAN_VERIFICATION_EXEC: (_ctx, _args) => '',
  TEST_BOOTSTRAP: (_ctx, _args) => '',
  TEST_COVERAGE_AUDIT_PLAN: (_ctx, _args) => '',
  TEST_COVERAGE_AUDIT_SHIP: (_ctx, _args) => '',
  TEST_COVERAGE_AUDIT_REVIEW: (_ctx, _args) => '',
  DEPLOY_BOOTSTRAP: (_ctx, _args) => '',
  DESIGN_SETUP: (_ctx, _args) => '',
  TASTE_PROFILE: (_ctx, _args) => '',
  DESIGN_OUTSIDE_VOICES: (_ctx, _args) => '',
  DESIGN_SHOTGUN_LOOP: (_ctx, _args) => '',
  UX_PRINCIPLES: (_ctx, _args) => '',
  DESIGN_HARD_RULES: (_ctx, _args) => '',
  DESIGN_METHODOLOGY: (_ctx, _args) => '',
  BIN_DIR: (ctx) => ctx.paths.binDir,
  COMMAND_REFERENCE: (_ctx, _args) => '',
  SNAPSHOT_FLAGS: (_ctx, _args) => '',
  QA_METHODOLOGY: (_ctx, _args) => '',
  MAKE_PDF_SETUP: (_ctx, _args) => '',
};
