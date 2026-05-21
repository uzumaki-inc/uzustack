import type { Host } from './types';

const OPENAI_SHORT_DESCRIPTION_LIMIT = 120;

export function extractNameAndDescription(content: string): { name: string; description: string } {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return { name: '', description: '' };
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return { name: '', description: '' };

  const frontmatter = content.slice(fmStart + 4, fmEnd);
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  let description = '';
  const lines = frontmatter.split('\n');
  let inDescription = false;
  const descLines: string[] = [];
  for (const line of lines) {
    if (line.match(/^description:\s*\|?\s*$/)) {
      inDescription = true;
      continue;
    }
    if (line.match(/^description:\s*\S/)) {
      description = line.replace(/^description:\s*/, '').trim();
      break;
    }
    if (inDescription) {
      if (line === '' || line.match(/^\s/)) {
        descLines.push(line.replace(/^  /, ''));
      } else {
        break;
      }
    }
  }
  if (descLines.length > 0) {
    description = descLines.join('\n').trim();
  }

  return { name, description };
}

export function condenseOpenAIShortDescription(description: string): string {
  const firstParagraph = description.split(/\n\s*\n/)[0] || description;
  const collapsed = firstParagraph.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= OPENAI_SHORT_DESCRIPTION_LIMIT) return collapsed;

  const truncated = collapsed.slice(0, OPENAI_SHORT_DESCRIPTION_LIMIT - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  const safe = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${safe}...`;
}

export function generateOpenAIYaml(displayName: string, shortDescription: string): string {
  return `interface:
  display_name: ${JSON.stringify(displayName)}
  short_description: ${JSON.stringify(shortDescription)}
  default_prompt: ${JSON.stringify(`Use ${displayName} for this task.`)}
policy:
  allow_implicit_invocation: true
`;
}

/** 外部 host (Codex / Factory 等) 用の skill 名を計算 */
export function externalSkillName(skillDir: string): string {
  if (skillDir === '.' || skillDir === '') return 'uzustack';
  // 二重 prefix 防止: uzustack-upgrade → uzustack-upgrade (not uzustack-uzustack-upgrade)
  if (skillDir.startsWith('uzustack-')) return skillDir;
  return `uzustack-${skillDir}`;
}

/**
 * frontmatter を Codex 向けに変換: name + description のみを残す。
 * allowed-tools / hooks / version 等の他 field は剥がす。
 * 複数行 block scalar description (YAML | syntax) を扱う。
 */
export function transformFrontmatter(content: string, host: Host): string {
  if (host === 'claude') return content;

  // frontmatter の境界を探す
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return content; // frontmatter は先頭でなければならない
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return content;

  const body = content.slice(fmEnd + 4); // --- 後の leading \n を含む
  const { name, description } = extractNameAndDescription(content);

  // Codex の description は 1024 char 制限 — build を fail させる、 broken skill は ship させない
  const MAX_DESC = 1024;
  if (description.length > MAX_DESC) {
    throw new Error(
      `Codex description for "${name}" is ${description.length} chars (max ${MAX_DESC}). ` +
      `Compress the description in the .tmpl file.`
    );
  }

  // Codex frontmatter を再 emit (name + description のみ)
  const indentedDesc = description.split('\n').map(l => `  ${l}`).join('\n');
  const codexFm = `---\nname: ${name}\ndescription: |\n${indentedDesc}\n---`;
  return codexFm + body;
}

/**
 * frontmatter から hook description を抽出して inline safety prose にする。
 * hook の働きを description として返す、 hook が無ければ null。
 */
export function extractHookSafetyProse(tmplContent: string): string | null {
  if (!tmplContent.match(/^hooks:/m)) return null;

  // hook matcher を parse して human-readable な safety description を構築
  const matchers: string[] = [];
  const matcherRegex = /matcher:\s*"(\w+)"/g;
  let m;
  while ((m = matcherRegex.exec(tmplContent)) !== null) {
    if (!matchers.includes(m[1])) matchers.push(m[1]);
  }

  if (matchers.length === 0) return null;

  // どの tool に hook が刺さっているかで safety prose を構築
  const toolDescriptions: Record<string, string> = {
    Bash: '実行前に bash command の破壊的操作 (rm -rf、 DROP TABLE、 force-push、 git reset --hard 等) を check する',
    Edit: '適用前に file edit が許可された scope 境界内にあるか verify する',
    Write: '適用前に file write が許可された scope 境界内にあるか verify する',
  };

  const safetyChecks = matchers
    .map(t => toolDescriptions[t] || `${t} 操作の safety を check する`)
    .join('、 ');

  return `> **Safety Advisory:** この skill には safety check が含まれます: ${safetyChecks}。 この skill を使う際は、 潜在的に破壊的な操作を実行する前に必ず pause して verify してください。 command の safety に確信が持てない場合、 進める前に user に確認を取ってください。`;
}
