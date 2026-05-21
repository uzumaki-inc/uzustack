/**
 * RESOLVERS record — maps {{PLACEHOLDER}} names to generator functions.
 * Each resolver takes a TemplateContext and returns the replacement string.
 *
 * PR-D1: preamble core を wire (PREAMBLE / MODEL_OVERLAY / TEST_FAILURE_TRIAGE 等)
 * PR-D2: utility resolvers を wire (SLUG_EVAL / BASE_BRANCH_DETECT / QA_METHODOLOGY 等)
 * PR-D3: 中型 resolvers 8 file を wire (本 PR、 9 placeholder)
 * PR-D4a / PR-D4b で残 stub を順次 wire。
 * 未登録 placeholder（{{BOGUS}} 等）は gen-skill-docs.ts 側が
 * "Unresolved placeholders" で fail-loud にする。
 */

import type { ResolverFn } from './types';
import { generatePreamble, generateTestFailureTriage } from './preamble';
import { generateModelOverlay } from './model-overlay';
import { generateQuestionPreferenceCheck, generateQuestionLog, generateInlineTuneFeedback } from './question-tuning';
import { generateLearningsLog, generateLearningsSearch } from './learnings';
import {
  generateSlugEval,
  generateSlugSetup,
  generateBaseBranchDetect,
  generateDeployBootstrap,
  generateQAMethodology,
  generateCoAuthorTrailer,
  generateChangelogWorkflow,
} from './utility';
import { generateConfidenceCalibration } from './confidence';
import { generateInvokeSkill } from './composition';
import { generateDxFramework } from './dx';
import { generateGBrainContextLoad, generateGBrainSaveResults } from './gbrain';
import { generateMakePdfSetup } from './make-pdf';
import { generateCommandReference, generateSnapshotFlags, generateBrowseSetup } from './browse';

export const RESOLVERS: Record<string, ResolverFn> = {
  SLUG_SETUP: generateSlugSetup,
  SLUG_EVAL: generateSlugEval,
  BASE_BRANCH_DETECT: generateBaseBranchDetect,
  DEPLOY_BOOTSTRAP: generateDeployBootstrap,
  QA_METHODOLOGY: generateQAMethodology,
  CO_AUTHOR_TRAILER: generateCoAuthorTrailer,
  CHANGELOG_WORKFLOW: generateChangelogWorkflow,
  PREAMBLE: generatePreamble,
  MODEL_OVERLAY: generateModelOverlay,
  TEST_FAILURE_TRIAGE: generateTestFailureTriage,
  QUESTION_PREFERENCE_CHECK: generateQuestionPreferenceCheck,
  QUESTION_LOG: generateQuestionLog,
  INLINE_TUNE_FEEDBACK: generateInlineTuneFeedback,
  LEARNINGS_SEARCH: generateLearningsSearch,
  LEARNINGS_LOG: generateLearningsLog,
  // --- PR-D3: 中型 resolvers (本 PR) ---
  CONFIDENCE_CALIBRATION: generateConfidenceCalibration,
  INVOKE_SKILL: generateInvokeSkill,
  DX_FRAMEWORK: generateDxFramework,
  GBRAIN_CONTEXT_LOAD: generateGBrainContextLoad,
  GBRAIN_SAVE_RESULTS: generateGBrainSaveResults,
  MAKE_PDF_SETUP: generateMakePdfSetup,
  COMMAND_REFERENCE: generateCommandReference,
  SNAPSHOT_FLAGS: generateSnapshotFlags,
  BROWSE_SETUP: generateBrowseSetup,
  BIN_DIR: (ctx) => ctx.paths.binDir,
  // --- 以下は後続 PR (D4a / D4b) で wire 予定 ---
  BENEFITS_FROM: (_ctx, _args) => '',
  SPEC_REVIEW_LOOP: (_ctx, _args) => '',
  CODEX_PLAN_REVIEW: (_ctx, _args) => '',
  REVIEW_DASHBOARD: (_ctx, _args) => '',
  PLAN_FILE_REVIEW_REPORT: (_ctx, _args) => '',
  ADVERSARIAL_STEP: (_ctx, _args) => '',
  CROSS_REVIEW_DEDUP: (_ctx, _args) => '',
  PLAN_COMPLETION_AUDIT_REVIEW: (_ctx, _args) => '',
  REVIEW_ARMY: (_ctx, _args) => '',
  SCOPE_DRIFT: (_ctx, _args) => '',
  CODEX_SECOND_OPINION: (_ctx, _args) => '',
  DESIGN_MOCKUP: (_ctx, _args) => '',
  DESIGN_SKETCH: (_ctx, _args) => '',
  DESIGN_REVIEW_LITE: (_ctx, _args) => '',
  PLAN_COMPLETION_AUDIT_SHIP: (_ctx, _args) => '',
  PLAN_VERIFICATION_EXEC: (_ctx, _args) => '',
  TEST_BOOTSTRAP: (_ctx, _args) => '',
  TEST_COVERAGE_AUDIT_PLAN: (_ctx, _args) => '',
  TEST_COVERAGE_AUDIT_SHIP: (_ctx, _args) => '',
  TEST_COVERAGE_AUDIT_REVIEW: (_ctx, _args) => '',
  DESIGN_SETUP: (_ctx, _args) => '',
  TASTE_PROFILE: (_ctx, _args) => '',
  DESIGN_OUTSIDE_VOICES: (_ctx, _args) => '',
  DESIGN_SHOTGUN_LOOP: (_ctx, _args) => '',
  UX_PRINCIPLES: (_ctx, _args) => '',
  DESIGN_HARD_RULES: (_ctx, _args) => '',
  DESIGN_METHODOLOGY: (_ctx, _args) => '',
};
