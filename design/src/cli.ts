/**
 * uzustack design CLI — AI による design 生成のための stateless CLI。
 *
 * browse binary（永続 Chromium daemon）と異なり、design binary は stateless で、
 * 起動ごとに API call と file 書き込みを行う。複数ターン iteration の session 状態は
 * /tmp 配下の JSON file で持つ。
 *
 * Flow:
 *   1. argv から command + flags を parse
 *   2. 認証を解決（~/.uzustack/openai.json → OPENAI_API_KEY → guided setup）
 *   3. command を実行（API call → PNG/HTML 書き出し）
 *   4. 結果 JSON を stdout に出力
 */

import { COMMANDS } from "./commands";
import { generate } from "./generate";
import { checkCommand } from "./check";
import { compare } from "./compare";
import { variants } from "./variants";
import { iterate } from "./iterate";
import { resolveApiKey, saveApiKey } from "./auth";
import { extractDesignLanguage, updateDesignMd } from "./memory";
import { diffMockups, verifyAgainstMockup } from "./diff";
import { evolve } from "./evolve";
import { generateDesignToCodePrompt } from "./design-to-code";
import { serve } from "./serve";
import { gallery } from "./gallery";

function parseArgs(argv: string[]): { command: string; flags: Record<string, string | boolean> } {
  const args = argv.slice(2); // bun/node と script path を skip
  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const command = args[0];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }

  return { command, flags };
}

function printUsage(): void {
  console.log("uzustack design — AI による UI mockup 生成\n");
  console.log("Commands:");
  for (const [name, info] of COMMANDS) {
    console.log(`  ${name.padEnd(12)} ${info.description}`);
    console.log(`  ${"".padEnd(12)} ${info.usage}`);
  }
  console.log("\nAuth: ~/.uzustack/openai.json または OPENAI_API_KEY 環境変数");
  console.log("Setup: $D setup");
}

async function runSetup(): Promise<void> {
  const existing = resolveApiKey();
  if (existing) {
    console.log("既存の API key を検出。smoke test を実行...");
  } else {
    console.log("API key 未設定。OpenAI API key の入力が必要。");
    console.log("取得先: https://platform.openai.com/api-keys");
    console.log("(image generation 権限が必要)\n");

    // stdin から読む
    process.stdout.write("API key: ");
    const reader = Bun.stdin.stream().getReader();
    const { value } = await reader.read();
    reader.releaseLock();
    const key = new TextDecoder().decode(value).trim();

    if (!key || !key.startsWith("sk-")) {
      console.error("key 形式不正、'sk-' で始まる必要あり。");
      process.exit(1);
    }

    saveApiKey(key);
    console.log("~/.uzustack/openai.json に保存（0600 permissions）。");
  }

  // smoke test
  console.log("\nsmoke test 実行中（simple image を生成）...");
  try {
    await generate({
      brief: "A simple blue square centered on a white background. Minimal, geometric, clean.",
      output: "/tmp/uzustack-design-smoke-test.png",
      size: "1024x1024",
      quality: "low",
    });
    console.log("\nSmoke test PASSED — design generation 動作確認。");
  } catch (err: any) {
    console.error(`\nSmoke test FAILED: ${err.message}`);
    console.error("API key と organization verification status を確認。");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv);

  if (!COMMANDS.has(command)) {
    console.error(`未知の command: ${command}`);
    printUsage();
    process.exit(1);
  }

  switch (command) {
    case "generate":
      await generate({
        brief: flags.brief as string,
        briefFile: flags["brief-file"] as string,
        output: (flags.output as string) || "/tmp/uzustack-mockup.png",
        check: !!flags.check,
        retry: flags.retry ? parseInt(flags.retry as string) : 0,
        size: flags.size as string,
        quality: flags.quality as string,
      });
      break;

    case "check":
      await checkCommand(flags.image as string, flags.brief as string);
      break;

    case "compare": {
      // --images を glob または複数 file として parse
      const imagesArg = flags.images as string;
      const images = await resolveImagePaths(imagesArg);
      const outputPath = (flags.output as string) || "/tmp/uzustack-design-board.html";
      compare({ images, output: outputPath });
      // --serve flag があれば board の HTTP server を起動
      if (flags.serve) {
        await serve({
          html: outputPath,
          timeout: flags.timeout ? parseInt(flags.timeout as string) : 600,
        });
      }
      break;
    }

    case "prompt": {
      const promptImage = flags.image as string;
      if (!promptImage) {
        console.error("--image が必要");
        process.exit(1);
      }
      console.error(`${promptImage} から implementation prompt を生成中...`);
      const proc2 = Bun.spawn(["git", "rev-parse", "--show-toplevel"]);
      const root = (await new Response(proc2.stdout).text()).trim();
      const d2c = await generateDesignToCodePrompt(promptImage, root || undefined);
      console.log(JSON.stringify(d2c, null, 2));
      break;
    }

    case "setup":
      await runSetup();
      break;

    case "variants":
      await variants({
        brief: flags.brief as string,
        briefFile: flags["brief-file"] as string,
        count: flags.count ? parseInt(flags.count as string) : 3,
        outputDir: (flags["output-dir"] as string) || "/tmp/uzustack-variants/",
        size: flags.size as string,
        quality: flags.quality as string,
        viewports: flags.viewports as string,
      });
      break;

    case "iterate":
      await iterate({
        session: flags.session as string,
        feedback: flags.feedback as string,
        output: (flags.output as string) || "/tmp/uzustack-iterate.png",
      });
      break;

    case "extract": {
      const imagePath = flags.image as string;
      if (!imagePath) {
        console.error("--image が必要");
        process.exit(1);
      }
      console.error(`${imagePath} から design language を抽出中...`);
      const extracted = await extractDesignLanguage(imagePath);
      const proc = Bun.spawn(["git", "rev-parse", "--show-toplevel"]);
      const repoRoot = (await new Response(proc.stdout).text()).trim();
      if (repoRoot) {
        updateDesignMd(repoRoot, extracted, imagePath);
      }
      console.log(JSON.stringify(extracted, null, 2));
      break;
    }

    case "diff": {
      const before = flags.before as string;
      const after = flags.after as string;
      if (!before || !after) {
        console.error("--before と --after が必要");
        process.exit(1);
      }
      console.error(`${before} と ${after} を比較中...`);
      const diffResult = await diffMockups(before, after);
      console.log(JSON.stringify(diffResult, null, 2));
      break;
    }

    case "verify": {
      const mockup = flags.mockup as string;
      const screenshot = flags.screenshot as string;
      if (!mockup || !screenshot) {
        console.error("--mockup と --screenshot が必要");
        process.exit(1);
      }
      console.error(`approved mockup に対して implementation を検証中...`);
      const verifyResult = await verifyAgainstMockup(mockup, screenshot);
      console.error(`Match: ${verifyResult.matchScore}/100 — ${verifyResult.pass ? "PASS" : "FAIL"}`);
      console.log(JSON.stringify(verifyResult, null, 2));
      break;
    }

    case "evolve":
      await evolve({
        screenshot: flags.screenshot as string,
        brief: flags.brief as string,
        output: (flags.output as string) || "/tmp/uzustack-evolved.png",
      });
      break;

    case "gallery":
      gallery({
        designsDir: flags["designs-dir"] as string,
        output: (flags.output as string) || "/tmp/uzustack-design-gallery.html",
      });
      break;

    case "serve":
      await serve({
        html: flags.html as string,
        timeout: flags.timeout ? parseInt(flags.timeout as string) : 600,
      });
      break;
  }
}

/**
 * glob pattern または comma 区切り list から image paths を解決。
 */
async function resolveImagePaths(input: string): Promise<string[]> {
  if (!input) {
    console.error("--images が必要 (glob pattern または comma 区切りの path)");
    process.exit(1);
  }

  // glob pattern か判定
  if (input.includes("*")) {
    const glob = new Bun.Glob(input);
    const paths: string[] = [];
    for await (const match of glob.scan({ absolute: true })) {
      if (match.endsWith(".png") || match.endsWith(".jpg") || match.endsWith(".jpeg")) {
        paths.push(match);
      }
    }
    return paths.sort();
  }

  // comma 区切りまたは単一 path
  return input.split(",").map(p => p.trim());
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
