import type { TemplateContext } from './types';

/**
 * {{INVOKE_SKILL:skill-name}} — Claude に別 skill の SKILL.md を読ませて
 * 従わせる prose を emit。 preamble 系 section は skip させる。
 *
 * optional な skip= parameter で追加 section も skip 可能:
 *   {{INVOKE_SKILL:plan-ceo-review:skip=Outside Voice,Design Outside Voices}}
 *
 * voice 規律: DEFAULT_SKIPS は uzustack preamble の実 emit heading 文字列と
 * 一致しなければならない (= hard match)。 mismatch すると loaded skill の
 * 該当 section が skip されず重複出力される。
 * upstream gstack の英語 heading と uzustack の日本語化済 heading の差分は
 * 個別に置換する (`Completeness Principle → 完全性の原則 ...` 等)。
 */
export function generateInvokeSkill(ctx: TemplateContext, args?: string[]): string {
  const skillName = args?.[0];
  if (!skillName || skillName === '') {
    throw new Error('{{INVOKE_SKILL}} requires a skill name, e.g. {{INVOKE_SKILL:plan-ceo-review}}');
  }

  // args[1+] から optional な skip= parameter を parse
  const extraSkips = (args?.slice(1) || [])
    .filter(a => a.startsWith('skip='))
    .flatMap(a => a.slice(5).split(','))
    .map(s => s.trim())
    .filter(Boolean);

  // uzustack preamble が実際に emit する heading に揃える。
  // upstream gstack の英語 heading と差分がある項目は明示的に翻訳済 heading を使う。
  const DEFAULT_SKIPS = [
    'Preamble (run first)',
    'AskUserQuestion Format',
    '完全性の原則 — 一晩でやり切る（Boil the Lake）',
    '作る前に探す（Search Before Building）',
    'リポジトリ所有権 — 気づいたら声を上げる',
    'Completion Status Protocol',
    'Telemetry (run last)',
    'Step 0: platform と base branch を検出',
    'Review Readiness Dashboard',
    'Plan File Review Report',
    'Prerequisite Skill Offer',
    'Plan Status Footer',
  ];

  const allSkips = [...DEFAULT_SKIPS, ...extraSkips];

  return `Read tool で \`/${skillName}\` skill file (\`${ctx.paths.skillRoot}/${skillName}/SKILL.md\`) を読む。

**読めない場合:** 「Could not load /${skillName} — skipping.」 と告げて skip、 続行する。

その instruction を上から下まで実行する。 ただし以下 section は **skip** する (parent skill 側で処理済):
${allSkips.map(s => `- ${s}`).join('\n')}

それ以外の section は full depth で実行する。 loaded skill の instruction が完了したら、 次の step に進む。`;
}
