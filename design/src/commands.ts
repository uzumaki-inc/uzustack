/**
 * Command registry — design command 全体の single source of truth。
 *
 * 依存関係:
 *   commands.ts ──▶ cli.ts (runtime dispatch)
 *              ──▶ gen-skill-docs.ts (doc 生成)
 *              ──▶ tests (validation)
 *
 * 副作用なし。build script と test から安全に import 可能。
 */

export const COMMANDS = new Map<string, {
  description: string;
  usage: string;
  flags?: string[];
}>([
  ["generate", {
    description: "design brief から UI mockup を生成",
    usage: "generate --brief \"...\" --output /path.png",
    flags: ["--brief", "--brief-file", "--output", "--check", "--retry", "--size", "--quality"],
  }],
  ["variants", {
    description: "brief から N 個の design variant を生成",
    usage: "variants --brief \"...\" --count 3 --output-dir /path/",
    flags: ["--brief", "--brief-file", "--count", "--output-dir", "--size", "--quality", "--viewports"],
  }],
  ["iterate", {
    description: "feedback を反映して既存 mockup を改稿",
    usage: "iterate --session /path/session.json --feedback \"...\" --output /path.png",
    flags: ["--session", "--feedback", "--output"],
  }],
  ["check", {
    description: "mockup の vision-based 品質 check",
    usage: "check --image /path.png --brief \"...\"",
    flags: ["--image", "--brief"],
  }],
  ["compare", {
    description: "user review 用の HTML comparison board を生成",
    usage: "compare --images /path/*.png --output /path/board.html [--serve]",
    flags: ["--images", "--output", "--serve", "--timeout"],
  }],
  ["diff", {
    description: "2 つの mockup 間の visual diff",
    usage: "diff --before old.png --after new.png",
    flags: ["--before", "--after", "--output"],
  }],
  ["evolve", {
    description: "既存 screenshot から改善版 mockup を生成",
    usage: "evolve --screenshot current.png --brief \"make it calmer\" --output /path.png",
    flags: ["--screenshot", "--brief", "--output"],
  }],
  ["verify", {
    description: "live site screenshot を approved mockup と照合",
    usage: "verify --mockup approved.png --screenshot live.png",
    flags: ["--mockup", "--screenshot", "--output"],
  }],
  ["prompt", {
    description: "approved mockup から構造化された implementation prompt を生成",
    usage: "prompt --image approved.png",
    flags: ["--image"],
  }],
  ["extract", {
    description: "approved mockup から design language を抽出し DESIGN.md に反映",
    usage: "extract --image approved.png",
    flags: ["--image"],
  }],
  ["gallery", {
    description: "project 内の全 design exploration の HTML timeline を生成",
    usage: "gallery --designs-dir ~/.uzustack/projects/$SLUG/designs/ --output /path/gallery.html",
    flags: ["--designs-dir", "--output"],
  }],
  ["serve", {
    description: "comparison board を HTTP で serve し user feedback を収集",
    usage: "serve --html /path/board.html [--timeout 600]",
    flags: ["--html", "--timeout"],
  }],
  ["setup", {
    description: "ガイド付き API key setup + smoke test",
    usage: "setup",
    flags: [],
  }],
]);
