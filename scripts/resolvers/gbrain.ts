/**
 * GBrain resolver — thinking skill 用の brain-first lookup と save-to-brain。
 *
 * GBrain は uzustack の「mod」。 install されると coding skill が brain-aware になり、
 * 開始前に brain で context を search、 終了後に結果を save する。
 *
 * brain feature を support しない host では suppress される
 * (各 host config の suppressedResolvers で)。 そういう host では
 * {{GBRAIN_CONTEXT_LOAD}} と {{GBRAIN_SAVE_RESULTS}} は空文字に resolve される。
 *
 * GBrain >= v0.10.0 互換 (search CLI、 doctor --fast --json、 entity enrichment)。
 */
import type { TemplateContext } from './types';

export function generateGBrainContextLoad(ctx: TemplateContext): string {
  let base = `## Brain Context Load

この skill を開始する前に、 関連 context を brain で search する:

1. user の request から keyword を 2-4 個抽出 (名詞、 error 名、 file path、 技術用語)。
   GBrain を search: \`gbrain search "keyword1 keyword2"\`
   例: 「deploy 後 login page が壊れた」 → \`gbrain search "login broken deploy"\`
   search は次のような行を返す: \`[slug] Title (score: 0.85) - content の先頭行...\`
2. result が少ない場合、 最も具体的な keyword 1 つに絞って再 search。
3. 各 result page を読む: \`gbrain get_page "<page_slug>"\`
   context として top 3 page を読む。
4. この brain context を分析に活用する。

GBrain が利用不可、 または結果なしの場合は brain context なしで進める。
gbrain command の non-zero exit code は transient failure として扱う。`;

  if (ctx.skillName === 'investigate') {
    base += `\n\nuser の request が構造化データの tracking / extraction / research 系 (例: 「このデータを track」、 「メールから extract」、 「tracker を作る」) なら、 GBrain の data-research skill に route する: \`gbrain call data-research\`。 この skill は構造化データ抽出に最適化された 7-phase pipeline を持つ。`;
  }

  return base;
}

export function generateGBrainSaveResults(ctx: TemplateContext): string {
  const skillSaveMap: Record<string, string> = {
    'office-hours': 'design document を brain page として save する:\n```bash\ngbrain put_page --title "Office Hours: <project name>" --tags "design-doc,<project-slug>" <<\'EOF\'\n<design doc content in markdown>\nEOF\n```',
    'investigate': 'root cause 分析を brain page として save する:\n```bash\ngbrain put_page --title "Investigation: <issue summary>" --tags "investigation,<affected-files>" <<\'EOF\'\n<investigation findings in markdown>\nEOF\n```',
    'plan-ceo-review': 'CEO plan を brain page として save する:\n```bash\ngbrain put_page --title "CEO Plan: <feature name>" --tags "ceo-plan,<feature-slug>" <<\'EOF\'\n<scope decisions and vision in markdown>\nEOF\n```',
    'retro': 'retrospective を brain page として save する:\n```bash\ngbrain put_page --title "Retro: <date range>" --tags "retro,<date>" <<\'EOF\'\n<retro output in markdown>\nEOF\n```',
    'plan-eng-review': 'architecture 決定を brain page として save する:\n```bash\ngbrain put_page --title "Eng Review: <feature name>" --tags "eng-review,<feature-slug>" <<\'EOF\'\n<review findings and decisions in markdown>\nEOF\n```',
    'ship': 'release notes を brain page として save する:\n```bash\ngbrain put_page --title "Release: <version>" --tags "release,<version>" <<\'EOF\'\n<changelog entry and deploy details in markdown>\nEOF\n```',
    'cso': 'security audit を brain page として save する:\n```bash\ngbrain put_page --title "Security Audit: <date>" --tags "security-audit,<date>" <<\'EOF\'\n<findings and remediation status in markdown>\nEOF\n```',
    'design-consultation': 'design system を brain page として save する:\n```bash\ngbrain put_page --title "Design System: <project name>" --tags "design-system,<project-slug>" <<\'EOF\'\n<design decisions in markdown>\nEOF\n```',
  };

  const saveInstruction = skillSaveMap[ctx.skillName] || '結果が保存する価値あるなら skill output を brain page として save する:\n```bash\ngbrain put_page --title "<descriptive title>" --tags "<relevant,tags>" <<\'EOF\'\n<content in markdown>\nEOF\n```';

  return `## Save Results to Brain

この skill 完了後、 将来 reference するため結果を brain に persist する:

${saveInstruction}

page を save した後、 言及された entity を抽出して enrich する: output 内の実在する人名や企業名 / 組織名について、 \`gbrain search "<entity name>"\` で既存 page を確認。 無ければ stub page を作る:
\`\`\`bash
gbrain put_page --title "<Person or Company Name>" --tags "entity,person" --content "Stub page. Mentioned in <skill name> output."
\`\`\`
実在する人名と企業名 / 組織名のみ抽出する。 product 名 / section heading / 技術用語 / file path は skip。

throttle error は次の形で現れる: exit code 1 + stderr に "throttle"、 "rate limit"、 "capacity"、 "busy" を含む。 GBrain が save 操作で throttle / rate-limit error を返したら、 save を defer して先に進む。 brain が busy なだけ — content は失われていない、 この run で persist されないだけ。 他の non-zero exit code も transient failure として扱う。

関連 brain page が存在するなら backlink を追加する。 GBrain 利用不可ならこの step は skip。

brain 操作完了後、 completion output に次を note する: 初期 search で何 page 見つかったか、 何 entity を enrich したか、 throttle された操作があったか。 これで user は brain の utilization を経時的に確認できる。`;
}
