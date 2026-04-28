#!/usr/bin/env bun
/**
 * Generate SKILL.md files from .tmpl templates.
 *
 * Pipeline:
 *   read .tmpl → find {{PLACEHOLDERS}} → resolve from registry → format → write .md
 *
 * Phase 3 status:
 *   - Claude のみ enabled (hosts/index.ts の ALL_HOST_CONFIGS で他 host を未登録)
 *   - resolver は空 stub (resolvers/index.ts 参照、Phase 4+ で本体に置換)
 *   - frontmatter は denylist mode のみ実装、allowlist は Phase 4+ で fail-loud
 *
 * Supports --dry-run: regenerate to memory, exit 1 if different from committed file.
 * Used by .github/workflows/skill-docs.yml の check-freshness job.
 */

import * as fs from 'fs';
import * as path from 'path';
import { discoverTemplates } from './discover-skills';
import { RESOLVERS } from './resolvers/index';
import type { Host, TemplateContext } from './resolvers/types';
import { HOST_PATHS } from './resolvers/types';
import { ALL_HOST_NAMES, resolveHostArg, getHostConfig } from '../hosts/index';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Host Detection (config-driven) ─────────────────────────

const HOST_ARG = process.argv.find(a => a.startsWith('--host'));
type HostArg = Host | 'all';
const HOST_ARG_VAL: HostArg = (() => {
  if (!HOST_ARG) return 'claude';
  const val = HOST_ARG.includes('=') ? HOST_ARG.split('=')[1] : process.argv[process.argv.indexOf(HOST_ARG) + 1];
  if (val === 'all') return 'all';
  try {
    return resolveHostArg(val);
  } catch {
    throw new Error(`Unknown host: ${val}. Use ${ALL_HOST_NAMES.join(', ')}, or all.`);
  }
})();

// ─── Frontmatter Helpers ────────────────────────────────────

function extractNameAndDescription(content: string): { name: string; description: string } {
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

// ─── Voice Trigger Processing ───────────────────────────────

function extractVoiceTriggers(content: string): string[] {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return [];
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return [];
  const frontmatter = content.slice(fmStart + 4, fmEnd);

  const triggers: string[] = [];
  let inVoice = false;
  for (const line of frontmatter.split('\n')) {
    if (/^voice-triggers:/.test(line)) { inVoice = true; continue; }
    if (inVoice) {
      const m = line.match(/^\s+-\s+"(.+)"$/);
      if (m) triggers.push(m[1]);
      else if (!/^\s/.test(line)) break;
    }
  }
  return triggers;
}

/**
 * Fold voice-triggers YAML field into description, then strip the field
 * from frontmatter. Must run BEFORE transformFrontmatter so all hosts see
 * the updated description.
 */
function processVoiceTriggers(content: string): string {
  const triggers = extractVoiceTriggers(content);

  // voice-triggers field は常に frontmatter から strip（triggers 0 件でも消す）。
  // これにより transformFrontmatter 側で重複 strip しなくて済む。
  content = content.replace(/^voice-triggers:\n(?:\s+-\s+"[^"]*"\n?)*/m, '');

  if (triggers.length === 0) return content;

  const { description } = extractNameAndDescription(content);
  if (!description) return content;

  const voiceLine = `Voice triggers (speech-to-text aliases): ${triggers.map(t => `"${t}"`).join(', ')}.`;
  const newDescription = description + '\n' + voiceLine;

  const oldIndented = description.split('\n').map(l => `  ${l}`).join('\n');
  const newIndented = newDescription.split('\n').map(l => `  ${l}`).join('\n');
  content = content.replace(oldIndented, newIndented);

  return content;
}

export { extractVoiceTriggers, processVoiceTriggers };

// ─── Frontmatter Transformation ─────────────────────────────

/**
 * Transform frontmatter for the target host.
 *
 * Phase 3: denylist mode のみ実装。allowlist は Phase 4+ で外部 host を
 * enable する時に追加（gstack 本家の実装を voice 翻案して移植する）。
 */
function transformFrontmatter(content: string, host: Host): string {
  const hostConfig = getHostConfig(host);
  const fm = hostConfig.frontmatter;

  if (fm.mode === 'denylist') {
    for (const field of fm.stripFields || []) {
      content = content.replace(new RegExp(`^${field}:\\s*.*\\n`, 'm'), '');
    }
    return content;
  }

  if (fm.mode === 'allowlist') {
    throw new Error(
      `frontmatter.mode='allowlist' is not implemented yet (Phase 4+). ` +
      `Host: ${hostConfig.name}. ` +
      `Port the allowlist branch from _upstream/gstack/scripts/gen-skill-docs.ts when enabling external hosts.`
    );
  }

  throw new Error(`Unknown frontmatter.mode: ${fm.mode}`);
}

// ─── Template Processing ────────────────────────────────────

const GENERATED_HEADER = `<!-- AUTO-GENERATED from {{SOURCE}} — do not edit directly -->\n<!-- Regenerate: bun run gen:skill-docs -->\n`;

function processTemplate(tmplPath: string, host: Host): { outputPath: string; content: string } {
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');
  const relTmplPath = path.relative(ROOT, tmplPath);
  const outputPath = tmplPath.replace(/\.tmpl$/, '');

  const { name: extractedName } = extractNameAndDescription(tmplContent);
  const skillName = extractedName || path.basename(path.dirname(tmplPath));

  const benefitsMatch = tmplContent.match(/^benefits-from:\s*\[([^\]]*)\]/m);
  const benefitsFrom = benefitsMatch
    ? benefitsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  const tierMatch = tmplContent.match(/^preamble-tier:\s*(\d+)$/m);
  const preambleTier = tierMatch ? parseInt(tierMatch[1], 10) : undefined;

  const interactiveMatch = tmplContent.match(/^interactive:\s*(true|false)\s*$/m);
  const interactive = interactiveMatch ? interactiveMatch[1] === 'true' : undefined;

  const ctx: TemplateContext = {
    skillName,
    tmplPath,
    benefitsFrom,
    host,
    paths: HOST_PATHS[host],
    preambleTier,
    interactive,
  };

  const currentHostConfig = getHostConfig(host);
  const suppressed = new Set(currentHostConfig.suppressedResolvers || []);
  let content = tmplContent.replace(/\{\{(\w+(?::[^}]+)?)\}\}/g, (_match, fullKey) => {
    const parts = fullKey.split(':');
    const resolverName = parts[0];
    const args = parts.slice(1);
    if (suppressed.has(resolverName)) return '';
    const resolver = RESOLVERS[resolverName];
    if (!resolver) throw new Error(`Unknown placeholder {{${resolverName}}} in ${relTmplPath}`);
    return args.length > 0 ? resolver(ctx, args) : resolver(ctx);
  });

  // 奇形 placeholder（resolver loop で hit しなかった残存）の defense-in-depth
  const remaining = content.match(/\{\{(\w+(?::[^}]+)?)\}\}/g);
  if (remaining) {
    throw new Error(`Unresolved placeholders in ${relTmplPath}: ${remaining.join(', ')}`);
  }

  content = processVoiceTriggers(content);
  content = transformFrontmatter(content, host);

  const header = GENERATED_HEADER.replace('{{SOURCE}}', path.basename(tmplPath));
  const fmEnd = content.indexOf('---', content.indexOf('---') + 3);
  if (fmEnd !== -1) {
    const insertAt = content.indexOf('\n', fmEnd) + 1;
    content = content.slice(0, insertAt) + header + content.slice(insertAt);
  } else {
    content = header + content;
  }

  return { outputPath, content };
}

// ─── Main ───────────────────────────────────────────────────

function findTemplates(): string[] {
  return discoverTemplates(ROOT).map(t => path.join(ROOT, t.tmpl));
}

const hostsToRun: Host[] = HOST_ARG_VAL === 'all' ? ALL_HOST_NAMES : [HOST_ARG_VAL];

// 160KB ≒ 40K tokens; runaway preamble/resolver growth の警戒線（hard gate ではない）。
const TOKEN_CEILING_BYTES = 160_000;
let hasChanges = false;
const tokenBudget: Array<{ skill: string; lines: number; tokens: number }> = [];

const tmplPaths = findTemplates();

for (const currentHost of hostsToRun) {
  const currentHostConfig = getHostConfig(currentHost);

  for (const tmplPath of tmplPaths) {
    const dir = path.basename(path.dirname(tmplPath));

    if (currentHostConfig.generation.includeSkills?.length) {
      if (!currentHostConfig.generation.includeSkills.includes(dir)) continue;
    }
    if (currentHostConfig.generation.skipSkills?.length) {
      if (currentHostConfig.generation.skipSkills.includes(dir)) continue;
    }

    const { outputPath, content } = processTemplate(tmplPath, currentHost);
    const relOutput = path.relative(ROOT, outputPath);

    if (DRY_RUN) {
      const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : '';
      if (existing !== content) {
        console.log(`STALE: ${relOutput}`);
        hasChanges = true;
      } else {
        console.log(`FRESH: ${relOutput}`);
      }
    } else {
      fs.writeFileSync(outputPath, content);
      console.log(`GENERATED: ${relOutput}`);
    }

    const lines = content.split('\n').length;
    const tokens = Math.round(content.length / 4);
    tokenBudget.push({ skill: relOutput, lines, tokens });

    if (content.length > TOKEN_CEILING_BYTES) {
      console.warn(`⚠️  TOKEN CEILING: ${relOutput} is ${content.length} bytes (~${tokens} tokens), exceeds ${TOKEN_CEILING_BYTES} byte ceiling (~40K tokens)`);
    }
  }
}

if (DRY_RUN && hasChanges) {
  console.error(`\nGenerated SKILL.md files are stale. Run: bun run gen:skill-docs`);
  process.exit(1);
}

if (!DRY_RUN && tokenBudget.length > 0) {
  tokenBudget.sort((a, b) => b.lines - a.lines);
  const totalLines = tokenBudget.reduce((s, t) => s + t.lines, 0);
  const totalTokens = tokenBudget.reduce((s, t) => s + t.tokens, 0);

  console.log('');
  console.log(`Token Budget`);
  console.log('═'.repeat(60));
  for (const t of tokenBudget) {
    const name = t.skill.replace(/\/SKILL\.md$/, '');
    console.log(`  ${name.padEnd(30)} ${String(t.lines).padStart(5)} lines  ~${String(t.tokens).padStart(6)} tokens`);
  }
  console.log('─'.repeat(60));
  console.log(`  ${'TOTAL'.padEnd(30)} ${String(totalLines).padStart(5)} lines  ~${String(totalTokens).padStart(6)} tokens`);
  console.log('');
}
