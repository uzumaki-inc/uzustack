#!/usr/bin/env bun
/**
 * Generate SKILL.md from each <skill>/SKILL.md.tmpl at the repo top.
 * `.tmpl` is the source of truth; type 1/3 lives in its frontmatter `type:`.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
// Non-dotfile dirs that aren't skills. Dotfiles are filtered separately below.
const EXCLUDE = new Set(['_upstream', 'scripts', 'bin', 'node_modules', 'dist', 'build']);

const candidates = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(e => e.isDirectory() && !e.name.startsWith('.') && !EXCLUDE.has(e.name));

const errors: string[] = [];
let generated = 0;

for (const dir of candidates) {
  const skillPath = path.join(ROOT, dir.name);
  const tmplPath = path.join(skillPath, 'SKILL.md.tmpl');
  const outPath = path.join(skillPath, 'SKILL.md');

  if (!fs.existsSync(tmplPath)) {
    if (fs.existsSync(outPath)) {
      errors.push(`${dir.name}/ has SKILL.md but no SKILL.md.tmpl (.tmpl is the source of truth)`);
    }
    continue;
  }

  fs.copyFileSync(tmplPath, outPath);
  generated++;
}

console.log(`[gen-skill-docs] generated=${generated} errors=${errors.length}`);
for (const err of errors) console.error(`  - ${err}`);
process.exit(errors.length > 0 ? 1 : 0);
