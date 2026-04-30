/**
 * Screenshot-to-Mockup Evolution。
 * live site の screenshot を元に、design brief に沿って「あるべき姿」の mockup を生成する。
 * blank canvas からではなく現実から起点する。
 */

import fs from "fs";
import path from "path";
import { requireApiKey } from "./auth";

export interface EvolveOptions {
  screenshot: string;  // 現状 site の screenshot path
  brief: string;       // 変更指示 ("make it calmer"、"fix the hierarchy" 等)
  output: string;      // 進化版 mockup の出力 path
}

/**
 * 既存 screenshot + brief から進化版 mockup を生成。
 * screenshot を context として GPT-4o に送り、image generation tool で
 * brief の変更を反映した新版を生成する。
 */
export async function evolve(options: EvolveOptions): Promise<void> {
  const apiKey = requireApiKey();
  const screenshotData = fs.readFileSync(options.screenshot).toString("base64");

  console.error(`${options.screenshot} を進化、変更指示: "${options.brief}"`);
  const startTime = Date.now();

  // Responses API で screenshot を参照する text prompt と image_generation tool を併用し
  // 進化版を生成する。reference image を image_generation に直接渡せないため、
  // 先に vision で現状を詳細記述してから生成する。

  // Step 1: 現状 screenshot を分析
  const analysis = await analyzeScreenshot(apiKey, screenshotData);
  console.error(`  現状 design を分析: ${analysis.slice(0, 100)}...`);

  // Step 2: 分析結果 + brief で進化版を生成
  const evolvedPrompt = [
    "Generate a pixel-perfect UI mockup that is an improved version of an existing design.",
    "",
    "CURRENT DESIGN (what exists now):",
    analysis,
    "",
    "REQUESTED CHANGES:",
    options.brief,
    "",
    "Generate a new mockup that keeps the existing layout structure but applies the requested changes.",
    "The result should look like a real production UI. All text must be readable.",
    "1536x1024 pixels.",
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        input: evolvedPrompt,
        tools: [{ type: "image_generation", size: "1536x1024", quality: "high" }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 403 && error.includes("organization must be verified")) {
        throw new Error(
          "OpenAI organization verification 未完了。\n"
          + "https://platform.openai.com/settings/organization で verify が必要。\n"
          + "verify 後、access propagation に最大 15 分かかる。",
        );
      }
      throw new Error(`API error (${response.status}): ${error.slice(0, 300)}`);
    }

    const data = await response.json() as any;
    const imageItem = data.output?.find((item: any) => item.type === "image_generation_call");

    if (!imageItem?.result) {
      throw new Error("response に image data なし");
    }

    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    const imageBuffer = Buffer.from(imageItem.result, "base64");
    fs.writeFileSync(options.output, imageBuffer);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`生成完了 (${elapsed}s, ${(imageBuffer.length / 1024).toFixed(0)}KB) → ${options.output}`);

    console.log(JSON.stringify({
      outputPath: options.output,
      sourceScreenshot: options.screenshot,
      brief: options.brief,
    }, null, 2));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * screenshot を分析して再生成用の詳細記述を生成。
 */
async function analyzeScreenshot(apiKey: string, imageBase64: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

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
              image_url: { url: `data:image/png;base64,${imageBase64}` },
            },
            {
              type: "text",
              text: `Describe this UI in detail for re-creation. Include: overall layout structure, color scheme (hex values), typography (sizes, weights), specific text content visible, spacing between elements, alignment patterns, and any decorative elements. Be precise enough that someone could recreate this UI from your description alone. 200 words max.`,
            },
          ],
        }],
        max_tokens: 400,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return "screenshot 分析不可";
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content?.trim() || "screenshot 分析不可";
  } finally {
    clearTimeout(timeout);
  }
}
