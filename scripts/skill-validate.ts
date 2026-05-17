#!/usr/bin/env bun
/**
 * Skill voice validation — voice 規約 v1 + v2 の機械チェック可能 subset。
 * Phase 3.6 step-83 サブタスク 3 で配置、`.github/workflows/skill-docs.yml` の Voice validation step で実行。
 *
 * voice 規約の pattern は `scripts/voice-rules.json` で管理 (v2 拡張は同 file に追記)。
 * patterns を named-capture group で merge し、 line 毎 1-pass scan で全 pattern を check する。
 *
 * Modes:
 *   default               - 全 .tmpl + .md scan (CI 既定)
 *   --diff                - git merge-base HEAD origin/main からの変更 file のみ scan (local 高速 feedback)
 *   SKILL_VALIDATE_DIFF=1 - 同上 (env var 経由)
 *
 * Subtree path 許可：行内に `_upstream/gstack/` を含む場合は skip
 *   (uzustack 内の subtree path 言及として許可、voice 規約 v2 拡張 PR #116)。
 *
 * placeholder resolve verify は gen-skill-docs.ts L208/L213-216 で実装済
 *   (Unknown placeholder throw + defense-in-depth)、本 script は voice 規約のみ扱う。
 */

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { discoverTemplates, discoverSkillFiles } from './discover-skills';
import { parseFrontmatter } from './frontmatter';

const ROOT = path.resolve(import.meta.dir, '..');
const DIFF_MODE = process.argv.includes('--diff') || process.env.SKILL_VALIDATE_DIFF === '1';

interface Violation {
  file: string;
  line: number;
  pattern: string;
  excerpt: string;
}

interface VoiceRule {
  id: string;
  name: string;
  regex: string;
}

interface VoiceRulesFile {
  version: string;
  description?: string;
  patterns: VoiceRule[];
}

// ─── voice-rules.json load + merged regex 構築 ──────────────

const rulesPath = path.join(ROOT, 'scripts/voice-rules.json');
const rules: VoiceRulesFile = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
const ID_TO_NAME = new Map(rules.patterns.map(p => [p.id, p.name]));
// 各 pattern を named-capture group で wrap し alternation で merge。
// 1-pass scan で全 pattern を check、 group 名 = pattern id で hit pattern を復元する。
const MERGED_REGEX = new RegExp(
  rules.patterns.map(p => `(?<${p.id}>${p.regex})`).join('|'),
  'g'
);

function isTranslated(content: string): boolean {
  const fm = parseFrontmatter(content);
  if (fm === null) return false;
  return /^type:\s*translated\s*$/m.test(fm);
}

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

    // alternation の 1 match には named-capture group が 1 つだけ hit する性質を使う。
    // 同 line 内で同 pattern が複数回 hit しても violation は 1 件にまとめる (異なる pattern が
    // 同 line に hit する場合は別 violation、 これは pattern x line で 1 件の元の挙動を保つ意図)。
    const matchedIds = new Set<string>();
    for (const m of line.matchAll(MERGED_REGEX)) {
      const id = Object.keys(m.groups!).find(k => m.groups![k] !== undefined);
      if (!id || matchedIds.has(id)) continue;
      matchedIds.add(id);
      violations.push({
        file: rel,
        line: i + 1,
        pattern: ID_TO_NAME.get(id)!,
        excerpt: line.trim().slice(0, 120),
      });
    }
  }
  return { violations, translated };
}

// ─── diff-based target 絞り込み ─────────────────────────────

function diffFiles(): Set<string> | null {
  try {
    const base = execSync('git merge-base HEAD origin/main', { encoding: 'utf-8' }).trim();
    const committed = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf-8' });
    // uncommitted な working tree 変更も含める (local 開発中の changeset prepare に有用)
    const uncommitted = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    return new Set(
      [...committed.split('\n'), ...uncommitted.split('\n')].filter(Boolean)
    );
  } catch (e) {
    console.error(`WARNING: --diff mode で git diff の取得に失敗: ${(e as Error).message}`);
    console.error('  full scan に fallback します');
    return null;
  }
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  const tmpls = discoverTemplates(ROOT);
  const mds = discoverSkillFiles(ROOT);

  // .tmpl は generator source、.md は generated。両方 check することで
  // .md だけ手動編集された drift も catch (defense-in-depth、skill-docs.yml と同 pattern)
  let targets: Array<{ rel: string; abs: string }> = [];
  for (const t of tmpls) targets.push({ rel: t.tmpl, abs: path.join(ROOT, t.tmpl) });
  for (const m of mds) targets.push({ rel: m, abs: path.join(ROOT, m) });

  let mode = 'full';
  if (DIFF_MODE) {
    const changed = diffFiles();
    if (changed) {
      const before = targets.length;
      targets = targets.filter(t => changed.has(t.rel));
      mode = `diff (${before} → ${targets.length})`;
    }
  }

  // Promise.all 並列化 + file 単位 try/catch (1 file の read fail で全体を止めない)
  const skipped: Array<{ rel: string; error: string }> = [];
  const results = await Promise.all(
    targets.map(async ({ rel, abs }) => {
      try {
        const content = await fsp.readFile(abs, 'utf-8');
        return checkFile(rel, content);
      } catch (e) {
        skipped.push({ rel, error: (e as Error).message });
        return { violations: [] as Violation[], translated: false };
      }
    })
  );

  const allViolations: Violation[] = [];
  let translatedCount = 0;
  for (const r of results) {
    if (r.translated) translatedCount++;
    allViolations.push(...r.violations);
  }

  console.log('Skill voice validation');
  console.log('═'.repeat(60));
  console.log(`  Mode: ${mode}`);
  console.log(`  Scanned: ${targets.length} files (${translatedCount} type: translated)`);
  console.log(`  Violations: ${allViolations.length}`);
  console.log(`  Skipped (read error): ${skipped.length}`);

  if (skipped.length > 0) {
    console.error('');
    console.error('Skipped files:');
    for (const s of skipped) {
      console.error(`  ${s.rel}: ${s.error}`);
    }
  }

  if (allViolations.length === 0) {
    console.log('  ✅ All clean.');
    // skip があれば exit 1 で gating を保つ (silent skip 防止)
    process.exit(skipped.length > 0 ? 1 : 0);
  }

  console.log('');
  console.log('Violations detected:');
  console.log('─'.repeat(60));
  for (const v of allViolations) {
    console.log(`  ${v.file}:${v.line}  [${v.pattern}]`);
    console.log(`    ${v.excerpt}`);
  }
  console.log('─'.repeat(60));
  console.error('::error::Voice 規約違反が検出されました。`docs/uzustack/translation-voice-guide.md` を参照して修正してください。');
  process.exit(1);
}

main();
