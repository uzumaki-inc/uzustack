#!/usr/bin/env bun
/**
 * Generate SKILL.md from SKILL.md.tmpl under skills/{translated,native}/.
 * Every skill directory must have a SKILL.md.tmpl as its source of truth;
 * the .md is regenerated from it and freshness is verified in CI.
 *
 * _upstream/gstack/ is intentionally excluded — it's a subtree owned by
 * upstream gstack and re-pulled wholesale on updates.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const SKILL_ROOTS = ['skills/translated', 'skills/native'] as const;

const errors: string[] = [];
let generated = 0;

for (const skillRoot of SKILL_ROOTS) {
  const absRoot = path.join(ROOT, skillRoot);
  if (!fs.existsSync(absRoot)) continue;

  const entries = fs.readdirSync(absRoot, { withFileTypes: true });
  const skillDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

  for (const dir of skillDirs) {
    const skillPath = path.join(absRoot, dir.name);
    const tmplPath = path.join(skillPath, 'SKILL.md.tmpl');
    const outPath = path.join(skillPath, 'SKILL.md');

    if (!fs.existsSync(tmplPath)) {
      errors.push(`${path.relative(ROOT, skillPath)}/ has no SKILL.md.tmpl`);
      continue;
    }

    fs.copyFileSync(tmplPath, outPath);
    generated++;
  }
}

console.log(`[gen-skill-docs] generated=${generated} errors=${errors.length}`);
for (const err of errors) console.error(`  - ${err}`);
process.exit(errors.length > 0 ? 1 : 0);
