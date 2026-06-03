#!/usr/bin/env bun
/**
 * Parity audit — gstack subtree vs uzustack top の対応 file 機械判定。
 *
 * `_upstream/gstack/` 配下の全 tracked file について uzustack 側の対応 file 存在を判定し、
 * 4 値に分類する：
 *
 *   (a) 完璧複製       — 両側存在 + frontmatter `status` が phase6-reserved でない
 *   (b1) 意図的 stub   — file 存在 + frontmatter `status: phase6-reserved` (= 14 件 Phase 6 予約)
 *   (b2) 意図的取り込まない — 対応 file 不在 + `docs/uzustack/intentionally-excluded-files.md` 記載
 *   (c) 漏れ           — 上記いずれにも該当しない
 *
 * D2 (upstream_sync 自動化) の baseline、月次 subtree pull 後の drift detection に活用。
 *
 * Modes:
 *   default                                — human-readable summary + (c) 一覧
 *   --json                                 — 全 entries の json output
 *   --only a|b1|b2|c                       — category filter
 *
 * 対応 file 検出 rule (= uzustack 側で期待する path):
 *   - prefix swap: `bin/gstack-*` → `bin/uzustack-*`、 `<gstack-name>/` → `<uzustack-name>/`
 *   - `open-gstack-browser/` → `open-uzustack-browser/`
 *   - 例外 (= upstream signal で確定の同名 mirror): chrome-cdp / dev-setup / dev-teardown
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { parseFrontmatter } from './frontmatter';

const ROOT = path.resolve(import.meta.dir, '..');
const GSTACK_SUBTREE = '_upstream/gstack';

type Category = 'a' | 'b1' | 'b2' | 'c';

interface FileEntry {
  gstack_path: string;          // gstack subtree 内 path (= _upstream/gstack/ prefix 削除済)
  uzustack_path: string;        // uzustack 側で期待する path
  uzustack_exists: boolean;
  category: Category;
  reason: string;
}

interface AuditSummary {
  total: number;
  a: number;
  b1: number;
  b2: number;
  c: number;
}

// ─── upstream signal で「同名 mirror」 確定の例外 file ──────────────
// `.claude/rules/review.md` 規律: upstream が prefix なしで運用している file は uzustack も同名
const PREFIX_SWAP_EXCEPTIONS = new Set([
  'bin/chrome-cdp',
  'bin/dev-setup',
  'bin/dev-teardown',
]);

// ─── (b2) 意図的取り込まない list ────────────────────────────
// docs/uzustack/intentionally-excluded-files.md と sync (= 後続 PR で確立、本 PR では空)
const B2_LIST = new Set<string>([
  // PR-2 で工藤さん taste call 後に充填
]);

// ─── path 変換: gstack 内 path → uzustack 側で期待する path ───
function expectedUzustackPath(gstackInnerPath: string): string {
  if (PREFIX_SWAP_EXCEPTIONS.has(gstackInnerPath)) return gstackInnerPath;

  return gstackInnerPath
    .replace(/(^|\/)gstack-/g, '$1uzustack-')
    .replace(/(^|\/)open-gstack-browser(\/|$)/g, '$1open-uzustack-browser$2');
}

// ─── frontmatter status 抽出 (= phase6-reserved 判定用) ─────
function extractStatus(absPath: string): string | null {
  try {
    const content = fs.readFileSync(absPath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm) return null;
    const statusLine = fm.split('\n').find(l => l.startsWith('status:'));
    if (!statusLine) return null;
    return statusLine.replace(/^status:\s*/, '').trim();
  } catch {
    return null;
  }
}

// ─── main audit ────────────────────────────────────────────
function audit(): FileEntry[] {
  const rawList = execSync(`git ls-files ${GSTACK_SUBTREE}`, {
    cwd: ROOT,
    encoding: 'utf-8',
  });

  const gstackFiles = rawList
    .trim()
    .split('\n')
    .filter(p => p.length > 0)
    .map(p => p.replace(`${GSTACK_SUBTREE}/`, ''));

  // Pass 1: phase6-reserved skill directory の特定
  // SKILL.md.tmpl が status: phase6-reserved の skill dir は配下 file 全部 (b1) 扱い
  const phase6SkillDirs = new Set<string>();
  for (const gpath of gstackFiles) {
    if (!gpath.endsWith('/SKILL.md.tmpl') && gpath !== 'SKILL.md.tmpl') continue;
    const uzPath = expectedUzustackPath(gpath);
    const uzAbs = path.join(ROOT, uzPath);
    if (!fs.existsSync(uzAbs)) continue;
    if (extractStatus(uzAbs) !== 'phase6-reserved') continue;
    const skillDir = gpath.replace(/\/?SKILL\.md\.tmpl$/, '');
    if (skillDir) phase6SkillDirs.add(skillDir);
  }

  const inPhase6SkillDir = (gpath: string): string | null => {
    for (const dir of phase6SkillDirs) {
      if (gpath === `${dir}/SKILL.md.tmpl`) return dir;
      if (gpath.startsWith(`${dir}/`)) return dir;
    }
    return null;
  };

  // Pass 2: per-file 判定
  const entries: FileEntry[] = [];

  for (const gpath of gstackFiles) {
    const uzPath = expectedUzustackPath(gpath);
    const uzAbs = path.join(ROOT, uzPath);
    const uzExists = fs.existsSync(uzAbs);

    let category: Category;
    let reason: string;

    const phase6Dir = inPhase6SkillDir(gpath);
    if (phase6Dir !== null) {
      category = 'b1';
      reason = gpath === `${phase6Dir}/SKILL.md.tmpl`
        ? `意図的 stub (frontmatter status: phase6-reserved、 skill: ${phase6Dir})`
        : `意図的 stub (Phase 6 予約 skill 配下、 parent: ${phase6Dir})`;
    } else if (uzExists) {
      const status = uzPath.endsWith('SKILL.md.tmpl') ? extractStatus(uzAbs) : null;
      category = 'a';
      reason = status
        ? `完璧複製 candidate (uzustack 側存在、 status: ${status})`
        : '完璧複製 candidate (uzustack 側存在)';
    } else {
      if (B2_LIST.has(gpath) || B2_LIST.has(uzPath)) {
        category = 'b2';
        reason = '意図的取り込まない (intentionally-excluded-files.md 記載)';
      } else {
        category = 'c';
        reason = `漏れ (期待 path: ${uzPath})`;
      }
    }

    entries.push({
      gstack_path: gpath,
      uzustack_path: uzPath,
      uzustack_exists: uzExists,
      category,
      reason,
    });
  }

  return entries;
}

function buildSummary(entries: FileEntry[]): AuditSummary {
  return {
    total: entries.length,
    a: entries.filter(e => e.category === 'a').length,
    b1: entries.filter(e => e.category === 'b1').length,
    b2: entries.filter(e => e.category === 'b2').length,
    c: entries.filter(e => e.category === 'c').length,
  };
}

// ─── CLI ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const onlyIdx = args.indexOf('--only');
const filterCategory = onlyIdx >= 0 ? (args[onlyIdx + 1] as Category) : null;

const entries = audit();
const summary = buildSummary(entries);
const filtered = filterCategory
  ? entries.filter(e => e.category === filterCategory)
  : entries;

if (jsonMode) {
  console.log(JSON.stringify({ summary, entries: filtered }, null, 2));
} else {
  console.log('=== parity audit summary ===');
  console.log(`  total: ${summary.total}`);
  console.log(`  (a) 完璧複製: ${summary.a}`);
  console.log(`  (b1) 意図的 stub: ${summary.b1}`);
  console.log(`  (b2) 意図的取り込まない: ${summary.b2}`);
  console.log(`  (c) 漏れ: ${summary.c}`);
  console.log();
  if (summary.c > 0) {
    console.log('=== (c) 漏れ list ===');
    for (const e of entries.filter(e => e.category === 'c')) {
      console.log(`  - ${e.gstack_path}  →  ${e.uzustack_path}`);
    }
  }
}
