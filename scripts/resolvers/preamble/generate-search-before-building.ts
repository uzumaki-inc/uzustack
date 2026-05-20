import type { TemplateContext } from '../types';

export function generateSearchBeforeBuildingSection(ctx: TemplateContext): string {
  return `## 作る前に探す（Search Before Building）

不慣れなものを作る前に、**まず検索する。** \`${ctx.paths.skillRoot}/ETHOS.md\` を参照。
- **Layer 1**（tried and true）— 再発明しない。 **Layer 2**（new and popular）— 精査する。 **Layer 3**（first principles）— 何より重視する。

**Eureka:** first-principles の推論が conventional wisdom と矛盾した場合、名前を付けて記録する：
\`\`\`bash
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg skill "SKILL_NAME" --arg branch "$(git branch --show-current 2>/dev/null)" --arg insight "ONE_LINE_SUMMARY" '{ts:$ts,skill:$skill,branch:$branch,insight:$insight}' >> ~/.uzustack/analytics/eureka.jsonl 2>/dev/null || true
\`\`\``;
}
