#!/usr/bin/env bun
/**
 * Skill voice validation — voice 規約 v1 の機械チェック可能 subset。
 * Phase 3.6 step-83 サブタスク 3 で配置、`.github/workflows/skill-docs.yml` の Voice validation step で実行。
 *
 * Subtree path 許可：行内に `_upstream/gstack/` を含む場合は skip
 *   (uzustack 内の subtree path 言及として許可、voice 規約 v2 拡張 PR #116)。
 *
 * placeholder resolve verify は gen-skill-docs.ts L208/L213-216 で実装済
 *   (Unknown placeholder throw + defense-in-depth)、本 script は voice 規約のみ扱う。
 */

import * as fs from 'fs';
import * as path from 'path';
import { discoverTemplates, discoverSkillFiles } from './discover-skills';

const ROOT = path.resolve(import.meta.dir, '..');

interface Violation {
  file: string;
  line: number;
  pattern: string;
  excerpt: string;
}

function isTranslated(content: string): boolean {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return false;
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return false;
  const fm = content.slice(fmStart + 4, fmEnd);
  return /^type:\s*translated\s*$/m.test(fm);
}

const PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: '~/.gstack/ (path)', regex: /~\/\.gstack\// },
  { name: '$GSTACK_HOME (env var)', regex: /\$GSTACK_HOME|\$\{GSTACK_HOME/ },
  { name: 'gstack-XXX (bin 名)', regex: /\bgstack-[a-zA-Z0-9_-]+/ },
  { name: '~/.claude/skills/gstack/ (skill path)', regex: /~\/\.claude\/skills\/gstack\// },
];

function checkFile(rel: string, content: string): { violations: Violation[]; translated: boolean } {
  const translated = isTranslated(content);
  if (!translated) return { violations: [], translated };

  const violations: Violation[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Subtree path 許可: `_upstream/gstack/` を含む行は skip
    // (subtree directory 名は voice 規約 v2 拡張で外部 identifier 維持、PR #116)
    if (line.includes('_upstream/gstack/')) continue;
    for (const { name, regex } of PATTERNS) {
      if (regex.test(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          pattern: name,
          excerpt: line.trim().slice(0, 120),
        });
      }
    }
  }
  return { violations, translated };
}

function main() {
  const tmpls = discoverTemplates(ROOT);
  const mds = discoverSkillFiles(ROOT);

  // .tmpl は generator source、.md は generated。両方 check することで
  // .md だけ手動編集された drift も catch (defense-in-depth、skill-docs.yml と同 pattern)
  const targets: Array<{ rel: string; abs: string }> = [];
  for (const t of tmpls) targets.push({ rel: t.tmpl, abs: path.join(ROOT, t.tmpl) });
  for (const m of mds) targets.push({ rel: m, abs: path.join(ROOT, m) });

  const allViolations: Violation[] = [];
  let translatedCount = 0;
  for (const { rel, abs } of targets) {
    const content = fs.readFileSync(abs, 'utf-8');
    const { violations, translated } = checkFile(rel, content);
    if (translated) translatedCount++;
    allViolations.push(...violations);
  }

  console.log('Skill voice validation');
  console.log('═'.repeat(60));
  console.log(`  Scanned: ${targets.length} files (${translatedCount} type: translated)`);
  console.log(`  Violations: ${allViolations.length}`);

  if (allViolations.length === 0) {
    console.log('  ✅ All clean.');
    process.exit(0);
  }

  console.log('');
  console.log('Violations detected:');
  console.log('─'.repeat(60));
  for (const v of allViolations) {
    console.log(`  ${v.file}:${v.line}  [${v.pattern}]`);
    console.log(`    ${v.excerpt}`);
  }
  console.log('─'.repeat(60));
  console.error('::error::Voice 規約 v1 違反が検出されました。`docs/uzustack/translation-voice-guide.md` を参照して修正してください。');
  process.exit(1);
}

main();
