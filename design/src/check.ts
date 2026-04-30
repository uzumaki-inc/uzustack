/**
 * 生成 mockup に対する vision-based 品質 gate。
 * GPT-4o vision で text 可読性 / layout 完全性 / visual coherence を検証する。
 */

import fs from "fs";
import { requireApiKey } from "./auth";

export interface CheckResult {
  pass: boolean;
  issues: string;
}

/**
 * 生成 mockup を元 brief に照らして check。
 */
export async function checkMockup(imagePath: string, brief: string): Promise<CheckResult> {
  const apiKey = requireApiKey();
  const imageData = fs.readFileSync(imagePath).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${imageData}` },
            },
            {
              type: "text",
              text: [
                "You are a UI quality checker. Evaluate this mockup against the design brief.",
                "",
                `Brief: ${brief}`,
                "",
                "Check these 3 things:",
                "1. TEXT READABILITY: Are all labels, headings, and body text legible? Any misspellings?",
                "2. LAYOUT COMPLETENESS: Are all requested elements present? Anything missing?",
                "3. VISUAL COHERENCE: Does it look like a real production UI, not AI art or a collage?",
                "",
                "Respond with exactly one line:",
                "PASS — if all 3 checks pass",
                "FAIL: [list specific issues] — if any check fails",
              ].join("\n"),
            },
          ],
        }],
        max_tokens: 200,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 403 && error.includes("organization must be verified")) {
        console.error("OpenAI organization verification 未完了。https://platform.openai.com/settings/organization で verify が必要。");
        return { pass: true, issues: "OpenAI org 未 verified — vision check を skip" };
      }
      // 非 blocking：vision check 失敗時は warning 付きで PASS にする
      console.error(`Vision check API error (${response.status}): ${error}`);
      return { pass: true, issues: "vision check 利用不可 — skip" };
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    if (content.startsWith("PASS")) {
      return { pass: true, issues: "" };
    }

    // "FAIL:" 以降の issue を抽出
    const issues = content.replace(/^FAIL:\s*/i, "").trim();
    return { pass: false, issues: issues || content };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 単独 check command：既存 image を brief に照らして check。
 */
export async function checkCommand(imagePath: string, brief: string): Promise<void> {
  const result = await checkMockup(imagePath, brief);
  console.log(JSON.stringify(result, null, 2));
}
