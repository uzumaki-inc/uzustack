/**
 * brief から N 個の design variant を生成。
 * 段階並列：API call 間に 1s delay を入れて rate limit を回避する。
 * 429 で fallback として exponential backoff を行う。
 */

import fs from "fs";
import path from "path";
import { requireApiKey } from "./auth";
import { parseBrief } from "./brief";

export interface VariantsOptions {
  brief?: string;
  briefFile?: string;
  count: number;
  outputDir: string;
  size?: string;
  quality?: string;
  viewports?: string; // "desktop,tablet,mobile" — 複数 size で生成
}

const STYLE_VARIATIONS = [
  "", // 1 番目の variant は brief をそのまま使用
  "Use a bolder, more dramatic visual style with stronger contrast and larger typography.",
  "Use a calmer, more minimal style with generous whitespace and subtle colors.",
  "Use a warmer, more approachable style with rounded corners and friendly typography.",
  "Use a more professional, corporate style with sharp edges and structured grid layout.",
  "Use a dark theme with light text and accent colors for key interactive elements.",
  "Use a playful, modern style with asymmetric layout and unexpected color accents.",
];

/**
 * variant を 1 個生成、429 で retry。
 */
async function generateVariant(
  apiKey: string,
  prompt: string,
  outputPath: string,
  size: string,
  quality: string,
): Promise<{ path: string; success: boolean; error?: string }> {
  const maxRetries = 3;
  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // exponential backoff: 2s / 4s / 8s
      const delay = Math.pow(2, attempt) * 1000;
      console.error(`  rate limited、${delay / 1000}s 後に retry...`);
      await new Promise(r => setTimeout(r, delay));
    }

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
          tools: [{ type: "image_generation", size, quality }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        lastError = "Rate limited (429)";
        continue;
      }

      if (!response.ok) {
        const error = await response.text();
        if (response.status === 403 && error.includes("organization must be verified")) {
          return { path: outputPath, success: false, error: "OpenAI organization verification 未完了。https://platform.openai.com/settings/organization で verify が必要。" };
        }
        return { path: outputPath, success: false, error: `API error (${response.status}): ${error.slice(0, 200)}` };
      }

      const data = await response.json() as any;
      const imageItem = data.output?.find((item: any) => item.type === "image_generation_call");

      if (!imageItem?.result) {
        return { path: outputPath, success: false, error: "response に image data なし" };
      }

      fs.writeFileSync(outputPath, Buffer.from(imageItem.result, "base64"));
      return { path: outputPath, success: true };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        return { path: outputPath, success: false, error: "Timeout (120s)" };
      }
      lastError = err.message;
    }
  }

  return { path: outputPath, success: false, error: lastError };
}

/**
 * 段階並列で N 個の variant を生成。
 */
export async function variants(options: VariantsOptions): Promise<void> {
  const apiKey = requireApiKey();
  const baseBrief = options.briefFile
    ? parseBrief(options.briefFile, true)
    : parseBrief(options.brief!, false);

  const quality = options.quality || "high";

  fs.mkdirSync(options.outputDir, { recursive: true });

  // viewports 指定時は style variant ではなく responsive variant を生成
  if (options.viewports) {
    await generateResponsiveVariants(apiKey, baseBrief, options.outputDir, options.viewports, quality);
    return;
  }

  const count = Math.min(options.count, 7); // style variation は 7 個に cap
  const size = options.size || "1536x1024";

  console.error(`${count} 件の variant を生成中...`);
  const startTime = Date.now();

  // 段階並列：各 call を 1.5s 間隔で開始
  const promises: Promise<{ path: string; success: boolean; error?: string }>[] = [];

  for (let i = 0; i < count; i++) {
    const variation = STYLE_VARIATIONS[i] || "";
    const prompt = variation
      ? `${baseBrief}\n\nStyle direction: ${variation}`
      : baseBrief;

    const outputPath = path.join(options.outputDir, `variant-${String.fromCharCode(65 + i)}.png`);

    // stagger: 起動間に 1.5s 待機
    const delay = i * 1500;
    promises.push(
      new Promise(resolve => setTimeout(resolve, delay))
        .then(() => {
          console.error(`  variant ${String.fromCharCode(65 + i)} を開始...`);
          return generateVariant(apiKey, prompt, outputPath, size, quality);
        })
    );
  }

  const results = await Promise.allSettled(promises);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      const size = fs.statSync(result.value.path).size;
      console.error(`  ✓ ${path.basename(result.value.path)} (${(size / 1024).toFixed(0)}KB)`);
      succeeded.push(result.value.path);
    } else {
      const error = result.status === "fulfilled" ? result.value.error : (result.reason as Error).message;
      const filePath = result.status === "fulfilled" ? result.value.path : "unknown";
      console.error(`  ✗ ${path.basename(filePath)}: ${error}`);
      failed.push(path.basename(filePath));
    }
  }

  console.error(`\n${succeeded.length}/${count} 件の variant 生成完了 (${elapsed}s)`);

  // 構造化結果を stdout に出力
  console.log(JSON.stringify({
    outputDir: options.outputDir,
    count,
    succeeded: succeeded.length,
    failed: failed.length,
    paths: succeeded,
    errors: failed,
  }, null, 2));
}

const VIEWPORT_CONFIGS: Record<string, { size: string; suffix: string; desc: string }> = {
  desktop: { size: "1536x1024", suffix: "desktop", desc: "Desktop (1536x1024)" },
  tablet: { size: "1024x1024", suffix: "tablet", desc: "Tablet (1024x1024)" },
  mobile: { size: "1024x1536", suffix: "mobile", desc: "Mobile (1024x1536, portrait)" },
};

async function generateResponsiveVariants(
  apiKey: string,
  baseBrief: string,
  outputDir: string,
  viewports: string,
  quality: string,
): Promise<void> {
  const viewportList = viewports.split(",").map(v => v.trim().toLowerCase());
  const configs = viewportList.map(v => VIEWPORT_CONFIGS[v]).filter(Boolean);

  if (configs.length === 0) {
    console.error(`有効な viewport なし。指定可能：desktop / tablet / mobile`);
    process.exit(1);
  }

  console.error(`responsive variant を生成中: ${configs.map(c => c.desc).join(", ")}...`);
  const startTime = Date.now();

  const promises = configs.map((config, i) => {
    const prompt = `${baseBrief}\n\nViewport: ${config.desc}. Adapt the layout for this screen size. ${
      config.suffix === "mobile" ? "Use a single-column layout, larger touch targets, and mobile navigation patterns." :
      config.suffix === "tablet" ? "Use a responsive layout that works for medium screens." :
      ""
    }`;
    const outputPath = path.join(outputDir, `responsive-${config.suffix}.png`);
    const delay = i * 1500;

    return new Promise<{ path: string; success: boolean; error?: string }>(resolve =>
      setTimeout(resolve, delay)
    ).then(() => {
      console.error(`  ${config.desc} を開始...`);
      return generateVariant(apiKey, prompt, outputPath, config.size, quality);
    });
  });

  const results = await Promise.allSettled(promises);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const succeeded: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      const sz = fs.statSync(result.value.path).size;
      console.error(`  ✓ ${path.basename(result.value.path)} (${(sz / 1024).toFixed(0)}KB)`);
      succeeded.push(result.value.path);
    } else {
      const error = result.status === "fulfilled" ? result.value.error : (result.reason as Error).message;
      console.error(`  ✗ ${error}`);
    }
  }

  console.error(`\n${succeeded.length}/${configs.length} 件の responsive variant 生成完了 (${elapsed}s)`);
  console.log(JSON.stringify({
    outputDir,
    viewports: viewportList,
    succeeded: succeeded.length,
    paths: succeeded,
  }, null, 2));
}
