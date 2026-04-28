/**
 * Shared discovery for SKILL.md and .tmpl files.
 * Scans root + one level of subdirs, skipping non-skill dirs.
 *
 * `_upstream` を SKIP するのが uzustack 固有の事情：
 * gstack 本家を `_upstream/gstack/` に subtree 取り込みしているので、
 * root + 1 階層 scan が `_upstream/SKILL.md.tmpl` を見ないようにする。
 * （nested な _upstream/gstack/<skill>/SKILL.md.tmpl は 2 階層深いので元々 hit しない）
 */

import * as fs from 'fs';
import * as path from 'path';

const SKIP = new Set([
  'node_modules',
  '.git',
  'dist',
  '_upstream',
  'bin',
  'scripts',
  'hosts',
]);

function subdirs(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SKIP.has(d.name))
    .map(d => d.name);
}

export function discoverTemplates(root: string): Array<{ tmpl: string; output: string }> {
  const dirs = ['', ...subdirs(root)];
  const results: Array<{ tmpl: string; output: string }> = [];
  for (const dir of dirs) {
    const rel = dir ? `${dir}/SKILL.md.tmpl` : 'SKILL.md.tmpl';
    if (fs.existsSync(path.join(root, rel))) {
      results.push({ tmpl: rel, output: rel.replace(/\.tmpl$/, '') });
    }
  }
  return results;
}

export function discoverSkillFiles(root: string): string[] {
  const dirs = ['', ...subdirs(root)];
  const results: string[] = [];
  for (const dir of dirs) {
    const rel = dir ? `${dir}/SKILL.md` : 'SKILL.md';
    if (fs.existsSync(path.join(root, rel))) {
      results.push(rel);
    }
  }
  return results;
}
