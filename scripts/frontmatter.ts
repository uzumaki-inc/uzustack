/**
 * Shared YAML frontmatter parser for skill content.
 *
 * 3 箇所 (skill-validate.ts:isTranslated / gen-skill-docs.ts:extractNameAndDescription /
 * gen-skill-docs.ts:extractVoiceTriggers) が同じ `content.indexOf('---\n')` pattern を
 * duplicate していた重複を統合。本体抽出のみを担当し、field 解析は呼び出し側で行う
 * (field 解析の semantics が呼び出し側で異なるため、ここで吸収しない)。
 */

export interface Frontmatter {
  /** `---` で挟まれた本体（前後の `---` line は含まない、 改行も trim しない）。 */
  raw: string;
}

/**
 * 先頭 `---\n` で始まる YAML frontmatter を抽出する。
 *
 * @returns frontmatter が見つかれば `{ raw }`、 先頭が `---\n` でない / 閉じ `\n---` が無い場合は `null`。
 */
export function parseFrontmatter(content: string): Frontmatter | null {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return null;
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return null;
  return { raw: content.slice(fmStart + 4, fmEnd) };
}
