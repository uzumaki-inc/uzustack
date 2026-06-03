#!/usr/bin/env bun
/**
 * Subtree coverage — gstack subtree vs uzustack top の対応 file 機械判定。
 *
 * `_upstream/gstack/` 配下の全 tracked file について uzustack 側の対応 file 存在を判定し、
 * 4 値に分類する：
 *
 *   (a) 完璧複製       — 両側存在 + frontmatter `status` が「予約 status」 でない
 *   (b1) 意図的 stub   — file 存在 + frontmatter `status` が「予約 status」 (= 14 件 Phase 6 予約等)
 *   (b2) 意図的取り込まない — 対応 file 不在 + `docs/uzustack/intentionally-excluded-files.md` 記載
 *   (c) 漏れ           — 上記いずれにも該当しない
 *
 * D2 (upstream_sync 自動化) の baseline、月次 subtree pull 後の drift detection に活用。
 *
 * 「予約 status」 は将来の phase 拡張で増える前提 (= `RESERVED_STATUSES` Set で集約、 phase7-reserved 等の追加点)。
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
  gstack_path: string;
  uzustack_path: string;
  uzustack_exists: boolean;
  category: Category;
  reason: string;
}

interface CoverageSummary {
  total: number;
  a: number;
  b1: number;
  b2: number;
  c: number;
}

// ─── 予約 status: (b1) 意図的 stub の source-of-truth ────────────
// 将来の phase 拡張で増える前提 (= phase7-reserved 等の追加点を本 Set に集約)
const RESERVED_STATUSES = new Set([
  'phase6-reserved',
]);

// ─── upstream signal で「同名 mirror」 確定の例外 file ──────────────
// `.claude/rules/review.md` 規律: upstream が prefix なしで運用している file は uzustack も同名
const PREFIX_SWAP_EXCEPTIONS = new Set([
  'bin/chrome-cdp',
  'bin/dev-setup',
  'bin/dev-teardown',
]);

// ─── (b2) 意図的取り込まない list ────────────────────────────
// docs/uzustack/intentionally-excluded-files.md と sync (= 後続 PR で確立、 本 PR では空)
// key は gstack_path (= subtree 内 path、 uzustack_path side は内部 fallback で吸収)
const B2_LIST = new Set<string>([
  // PR-2 で最終判断後に充填
]);

// ─── path 変換: gstack 内 path → uzustack 側で期待する path ───
function expectedUzustackPath(gstackInnerPath: string): string {
  if (PREFIX_SWAP_EXCEPTIONS.has(gstackInnerPath)) return gstackInnerPath;

  return gstackInnerPath
    .replace(/(^|\/)gstack-/g, '$1uzustack-')
    .replace(/(^|\/)open-gstack-browser(\/|$)/g, '$1open-uzustack-browser$2');
}

// ─── frontmatter status 抽出 ─────────────────────────────────
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

// ─── main survey ────────────────────────────────────────────
function survey(): FileEntry[] {
  const rawList = execSync(`git ls-files ${GSTACK_SUBTREE}`, {
    cwd: ROOT,
    encoding: 'utf-8',
  });

  const gstackFiles = rawList
    .trim()
    .split('\n')
    .filter(p => p.length > 0)
    .map(p => p.replace(`${GSTACK_SUBTREE}/`, ''));

  // Pass 1: SKILL.md.tmpl の status を cache + 予約 status skill dir 特定
  // 配下 file は parent dir 経由で (b1) 判定 (= 2-pass で重複 read を回避)
  const statusCache = new Map<string, string | null>();
  const reservedSkillDirs = new Set<string>();
  for (const gpath of gstackFiles) {
    if (!gpath.endsWith('/SKILL.md.tmpl')) continue;
    const uzPath = expectedUzustackPath(gpath);
    const uzAbs = path.join(ROOT, uzPath);
    if (!fs.existsSync(uzAbs)) continue;
    const status = extractStatus(uzAbs);
    statusCache.set(gpath, status);
    if (status && RESERVED_STATUSES.has(status)) {
      reservedSkillDirs.add(gpath.replace(/\/SKILL\.md\.tmpl$/, ''));
    }
  }

  // O(1) lookup: gpath の最上位 directory を抽出して Set check
  const reservedDirOf = (gpath: string): string | null => {
    const idx = gpath.indexOf('/');
    if (idx < 0) return null;
    const parent = gpath.slice(0, idx);
    return reservedSkillDirs.has(parent) ? parent : null;
  };

  // Pass 2: per-file 判定
  const entries: FileEntry[] = [];

  for (const gpath of gstackFiles) {
    const uzPath = expectedUzustackPath(gpath);
    const uzAbs = path.join(ROOT, uzPath);
    const uzExists = fs.existsSync(uzAbs);

    let category: Category;
    let reason: string;

    const reservedDir = reservedDirOf(gpath);
    if (reservedDir !== null) {
      category = 'b1';
      reason = gpath === `${reservedDir}/SKILL.md.tmpl`
        ? `意図的 stub (予約 status、 skill: ${reservedDir})`
        : `意図的 stub (予約 skill 配下、 parent: ${reservedDir})`;
    } else if (uzExists) {
      // SKILL.md.tmpl は Pass 1 で cache 済、 それ以外は status null
      const status = uzPath.endsWith('SKILL.md.tmpl')
        ? (statusCache.get(gpath) ?? null)
        : null;
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

// 1-pass counter で summary 構築 (= 4 回 filter scan を避ける)
function buildSummary(entries: FileEntry[]): CoverageSummary {
  const s: CoverageSummary = { total: entries.length, a: 0, b1: 0, b2: 0, c: 0 };
  for (const e of entries) s[e.category]++;
  return s;
}

// ─── CLI ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const onlyIdx = args.indexOf('--only');
const filterCategory = onlyIdx >= 0 ? (args[onlyIdx + 1] as Category) : null;

const entries = survey();
const summary = buildSummary(entries);
const missing = entries.filter(e => e.category === 'c');
const filtered = filterCategory
  ? entries.filter(e => e.category === filterCategory)
  : entries;

if (jsonMode) {
  console.log(JSON.stringify({ summary, entries: filtered }, null, 2));
} else {
  console.log('=== subtree coverage summary ===');
  console.log(`  total: ${summary.total}`);
  console.log(`  (a) 完璧複製: ${summary.a}`);
  console.log(`  (b1) 意図的 stub: ${summary.b1}`);
  console.log(`  (b2) 意図的取り込まない: ${summary.b2}`);
  console.log(`  (c) 漏れ: ${summary.c}`);
  console.log();
  if (missing.length > 0) {
    console.log('=== (c) 漏れ list ===');
    for (const e of missing) {
      console.log(`  - ${e.gstack_path}  →  ${e.uzustack_path}`);
    }
  }
}
