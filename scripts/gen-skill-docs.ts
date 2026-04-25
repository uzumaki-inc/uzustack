#!/usr/bin/env bun
/**
 * uzustack: SKILL.md.tmpl から SKILL.md を生成する。
 *
 * 対象範囲（論点 2 / 論点 4 合意）：
 *   skills/translated/<skill>/SKILL.md.tmpl  → skills/translated/<skill>/SKILL.md
 *   skills/native/<skill>/SKILL.md.tmpl      → skills/native/<skill>/SKILL.md
 *
 * `_upstream/gstack/` は subtree として保持しているだけなので一切触らない。
 *
 * Phase 0b 段階では skills/translated/ も skills/native/ も空（.gitkeep のみ）。
 * 「対象 0 件で exit 0」が期待動作。
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const SKILL_ROOTS = ['skills/translated', 'skills/native'] as const;

interface GenerateResult {
  generated: number;
  skipped: number;
  errors: string[];
}

function generateSkillDocs(rootDir: string): GenerateResult {
  const result: GenerateResult = { generated: 0, skipped: 0, errors: [] };

  for (const skillRoot of SKILL_ROOTS) {
    const absRoot = path.join(rootDir, skillRoot);

    if (!fs.existsSync(absRoot)) {
      result.skipped++;
      continue;
    }

    const entries = fs.readdirSync(absRoot, { withFileTypes: true });
    const skillDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

    for (const dir of skillDirs) {
      const skillPath = path.join(absRoot, dir.name);
      const relPath = path.relative(rootDir, skillPath);
      const tmplPath = path.join(skillPath, 'SKILL.md.tmpl');
      const outPath = path.join(skillPath, 'SKILL.md');

      if (!fs.existsSync(tmplPath)) {
        result.errors.push(`${relPath}/ has no SKILL.md.tmpl (uzustack rule: every skill must have one as the source of truth)`);
        continue;
      }

      const content = fs.readFileSync(tmplPath, 'utf-8');
      fs.writeFileSync(outPath, content);
      result.generated++;
    }
  }

  return result;
}

function main(): void {
  const result = generateSkillDocs(ROOT);
  const summary = `generated=${result.generated} skipped=${result.skipped} errors=${result.errors.length}`;
  console.log(`[gen-skill-docs] ${summary}`);
  for (const err of result.errors) {
    console.error(`  - ${err}`);
  }
  process.exit(result.errors.length > 0 ? 1 : 0);
}

main();
