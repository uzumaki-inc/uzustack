import type { TemplateContext } from '../types';

export function generateBrainHealthInstruction(ctx: TemplateContext): string {
  if (ctx.host !== 'gbrain' && ctx.host !== 'hermes') return '';
  return `\`BRAIN_HEALTH\` が表示され score が 50 未満の場合、失敗した check 項目（出力に表示）をユーザーに伝え、
「\\\`gbrain doctor\\\` でフル診断を実行してください」と提案する。
出力が有効な JSON でない場合や health_score がない場合は、GBrain を利用不可として
本 session では brain 機能なしで進行する。`;
}
