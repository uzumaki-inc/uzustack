/**
 * OpenAI Responses API + image_generation tool で UI mockup を生成。
 */

import fs from "fs";
import path from "path";
import { requireApiKey } from "./auth";
import { parseBrief } from "./brief";
import { createSession, sessionPath } from "./session";
import { checkMockup } from "./check";

export interface GenerateOptions {
  brief?: string;
  briefFile?: string;
  output: string;
  check?: boolean;
  retry?: number;
  size?: string;
  quality?: string;
}

export interface GenerateResult {
  outputPath: string;
  sessionFile: string;
  responseId: string;
  checkResult?: { pass: boolean; issues: string };
}

/**
 * OpenAI Responses API を image_generation tool 付きで呼び出す。
 * response ID と base64 image data を返す。
 */
async function callImageGeneration(
  apiKey: string,
  prompt: string,
  size: string,
  quality: string,
): Promise<{ responseId: string; imageData: string }> {
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
        input: prompt,
        tools: [{
          type: "image_generation",
          size,
          quality,
        }],
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
      throw new Error(`API error (${response.status}): ${error.slice(0, 200)}`);
    }

    const data = await response.json() as any;

    const imageItem = data.output?.find((item: any) =>
      item.type === "image_generation_call"
    );

    if (!imageItem?.result) {
      throw new Error(
        `response に image data なし。output types: ${data.output?.map((o: any) => o.type).join(", ") || "none"}`
      );
    }

    return {
      responseId: data.id,
      imageData: imageItem.result,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * brief から mockup を 1 枚生成。
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const apiKey = requireApiKey();

  // brief を parse
  const prompt = options.briefFile
    ? parseBrief(options.briefFile, true)
    : parseBrief(options.brief!, false);

  const size = options.size || "1536x1024";
  const quality = options.quality || "high";
  const maxRetries = options.retry ?? 0;

  let lastResult: GenerateResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      console.error(`Retry ${attempt}/${maxRetries}...`);
    }

    // image を生成
    const startTime = Date.now();
    const { responseId, imageData } = await callImageGeneration(apiKey, prompt, size, quality);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // disk へ書き出し
    const outputDir = path.dirname(options.output);
    fs.mkdirSync(outputDir, { recursive: true });
    const imageBuffer = Buffer.from(imageData, "base64");
    fs.writeFileSync(options.output, imageBuffer);

    // session を作成
    const session = createSession(responseId, prompt, options.output);

    console.error(`生成完了 (${elapsed}s, ${(imageBuffer.length / 1024).toFixed(0)}KB) → ${options.output}`);

    lastResult = {
      outputPath: options.output,
      sessionFile: sessionPath(session.id),
      responseId,
    };

    // 指定があれば quality check
    if (options.check) {
      const checkResult = await checkMockup(options.output, prompt);
      lastResult.checkResult = checkResult;

      if (checkResult.pass) {
        console.error(`Quality check: PASS`);
        break;
      } else {
        console.error(`Quality check: FAIL — ${checkResult.issues}`);
        if (attempt < maxRetries) {
          console.error("retry します...");
        }
      }
    } else {
      break;
    }
  }

  // 結果を JSON で stdout 出力
  console.log(JSON.stringify(lastResult, null, 2));
  return lastResult!;
}
