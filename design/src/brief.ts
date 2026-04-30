/**
 * 構造化された design brief — skill 側の散文と image generation の間の interface。
 */

export interface DesignBrief {
  goal: string;           // "Dashboard for coding assessment tool"
  audience: string;       // "Technical users, startup founders"
  style: string;          // "Dark theme, cream accents, minimal"
  elements: string[];     // ["builder name", "score badge", "narrative letter"]
  constraints?: string;   // "Max width 1024px, mobile-first"
  reference?: string;     // DESIGN.md の抜粋または style reference 文
  screenType: string;     // "desktop-dashboard" | "mobile-app" | "landing-page" 等
}

/**
 * 構造化 brief を image generation 用の prompt 文字列に変換。
 */
export function briefToPrompt(brief: DesignBrief): string {
  const lines: string[] = [
    `Generate a pixel-perfect UI mockup of a ${brief.screenType} for: ${brief.goal}.`,
    `Target audience: ${brief.audience}.`,
    `Visual style: ${brief.style}.`,
    `Required elements: ${brief.elements.join(", ")}.`,
  ];

  if (brief.constraints) {
    lines.push(`Constraints: ${brief.constraints}.`);
  }

  if (brief.reference) {
    lines.push(`Design reference: ${brief.reference}`);
  }

  lines.push(
    "The mockup should look like a real production UI, not a wireframe or concept art.",
    "All text must be readable. Layout must be clean and intentional.",
    "1536x1024 pixels."
  );

  return lines.join(" ");
}

/**
 * 平文 string または JSON file path から brief を parse。
 */
export function parseBrief(input: string, isFile: boolean): string {
  if (!isFile) {
    // 平文 prompt — そのまま使用
    return input;
  }

  // JSON file — parse して prompt 化
  const raw = Bun.file(input);
  // Bun.file は async のため fs 経由で同期読み込み
  const fs = require("fs");
  const content = fs.readFileSync(input, "utf-8");
  const brief: DesignBrief = JSON.parse(content);
  return briefToPrompt(brief);
}
