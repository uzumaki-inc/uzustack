/**
 * Model overlay resolver — model-overlays/{model}.md を読み込み、
 * subordinate behavioral-patch section として返す。
 *
 * Precedence:
 *   1. Exact match: ctx.model === 'gpt-5.4' → model-overlays/gpt-5.4.md を読む
 *   2. INHERIT directive: ファイルの最初の非空白行が
 *      `{{INHERIT:claude}}` の場合、model-overlays/claude.md を先に読み、
 *      このファイルの残りの内容の前に結合する。
 *      `gpt-5.4.md` が `gpt.md` の上に構築できる（重複なし）。
 *   3. Missing file: 空文字列を返す（graceful degradation、エラーなし）。
 *   4. ctx.model 未設定: 空文字列を返す。
 *
 * 返されるブロックは skill workflow、safety gates、AskUserQuestion 指示に
 * subordinate。subordination language はラッパー見出しの一部で、
 * ファイル内容に関係なくすべての overlay に表示される。
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TemplateContext } from './types';

const OVERLAY_DIR = path.resolve(import.meta.dir, '../../model-overlays');

const INHERIT_RE = /^\s*\{\{INHERIT:([a-z0-9-]+(?:\.[0-9]+)*)\}\}\s*\n/;

export function readOverlay(model: string, seen: Set<string> = new Set()): string {
  if (seen.has(model)) return ''; // cycle guard
  seen.add(model);

  const filePath = path.join(OVERLAY_DIR, `${model}.md`);
  if (!fs.existsSync(filePath)) return '';

  const raw = fs.readFileSync(filePath, 'utf-8');
  const match = raw.match(INHERIT_RE);
  if (!match) return raw.trim();

  const baseModel = match[1];
  const base = readOverlay(baseModel, seen);
  const rest = raw.replace(INHERIT_RE, '').trim();

  if (!base) return rest;
  return `${base}\n\n${rest}`;
}

export function generateModelOverlay(ctx: TemplateContext): string {
  if (!ctx.model) return '';

  const content = readOverlay(ctx.model);
  if (!content) return '';

  return `## Model-Specific Behavioral Patch (${ctx.model})

以下の nudge は ${ctx.model} モデルファミリー向けにチューニングされている。
skill workflow、STOP ポイント、AskUserQuestion ゲート、plan-mode safety、
/ship review ゲートに対して **subordinate** である。以下の nudge が skill 指示と
矛盾する場合、skill が勝つ。これらはルールではなく preference として扱う。

${content}`;
}
