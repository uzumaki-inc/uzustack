/**
 * design comparison board の feedback loop 用 HTTP server。
 *
 * 壊れていた file:// + DOM polling 方式の置き換え。本 server は：
 * 1. comparison board HTML を HTTP で serve
 * 2. __UZUSTACK_SERVER_URL を inject、board からこの server に feedback POST
 * 3. feedback JSON を stdout に出力（agent が読む）
 * 4. 再生成サイクル間で alive を維持（stateful）
 * 5. user の default browser で自動 open
 *
 * State machine:
 *
 *   SERVING ──(POST submit)──► DONE ──► exit 0
 *      │
 *      ├──(POST regenerate/remix)──► REGENERATING
 *      │                                  │
 *      │                          (POST /api/reload)
 *      │                                  │
 *      │                                  ▼
 *      │                             RELOADING ──► SERVING
 *      │
 *      └──(timeout)──► exit 1
 *
 * Feedback delivery（2 channel、いずれも常時 active）:
 *   Stdout: feedback JSON（event 1 件 = 1 行）— foreground mode 用
 *   Disk:   HTML file 隣接の feedback-pending.json (regenerate/remix) または
 *           feedback.json (submit) — background mode polling 用
 *
 * agent は通常 $D serve を background 化、feedback-pending.json を polling する。
 * 検出時：読み取り → 削除 → 新 variant 生成 → POST /api/reload。
 *
 * Stderr: 構造化 telemetry（SERVE_STARTED / SERVE_FEEDBACK_RECEIVED 等）。
 */

import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

export interface ServeOptions {
  html: string;
  port?: number;
  hostname?: string; // default '127.0.0.1' — localhost のみ
  timeout?: number; // 秒、default 600（10 分）
}

type ServerState = "serving" | "regenerating" | "done";

export async function serve(options: ServeOptions): Promise<void> {
  const { html, port = 0, hostname = "127.0.0.1", timeout = 600 } = options;

  // HTML file 存在確認
  if (!fs.existsSync(html)) {
    console.error(`SERVE_ERROR: HTML file not found: ${html}`);
    process.exit(1);
  }

  // security: file 読み取りを初期 HTML の directory に固定。
  // /api/reload 経由 path traversal による任意 file 読み取りを防ぐ。
  const allowedDir = fs.realpathSync(path.dirname(path.resolve(html)));

  let htmlContent = fs.readFileSync(html, "utf-8");
  let state: ServerState = "serving";
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  const server = Bun.serve({
    port,
    hostname,
    fetch(req) {
      const url = new URL(req.url);

      // comparison board HTML を serve
      if (
        req.method === "GET" &&
        (url.pathname === "/" || url.pathname === "/index.html")
      ) {
        // server URL を inject、board が feedback POST できるようにする
        const injected = htmlContent.replace(
          "</head>",
          `<script>window.__UZUSTACK_SERVER_URL = ${JSON.stringify(url.origin)};</script>\n</head>`,
        );
        return new Response(injected, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // progress polling endpoint（regeneration 中に board が使う）
      if (req.method === "GET" && url.pathname === "/api/progress") {
        return Response.json({ status: state });
      }

      // board からの feedback 送信
      if (req.method === "POST" && url.pathname === "/api/feedback") {
        return handleFeedback(req);
      }

      // reload endpoint（agent が新 board HTML に差し替えるのに使う）
      if (req.method === "POST" && url.pathname === "/api/reload") {
        return handleReload(req);
      }

      return new Response("Not found", { status: 404 });
    },
  });

  const actualPort = server.port;
  const boardUrl = `http://127.0.0.1:${actualPort}`;

  console.error(`SERVE_STARTED: port=${actualPort} html=${html}`);

  // user の default browser で自動 open
  openBrowser(boardUrl);

  // timeout 設定
  timeoutTimer = setTimeout(() => {
    console.error(`SERVE_TIMEOUT: after=${timeout}s`);
    server.stop();
    process.exit(1);
  }, timeout * 1000);

  async function handleFeedback(req: Request): Promise<Response> {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // 期待 shape を validate
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Expected JSON object" }, { status: 400 });
    }

    const isSubmit = body.regenerated === false;
    const isRegenerate = body.regenerated === true;
    const action = isSubmit
      ? "submitted"
      : body.regenerateAction || "regenerate";

    console.error(`SERVE_FEEDBACK_RECEIVED: type=${action}`);

    // feedback JSON を stdout 出力（foreground mode 用）
    console.log(JSON.stringify(body));

    // 常に feedback を disk へ書き出し、agent が polling できるようにする
    // （agent は通常 $D serve を background 化するため stdout を読めない）
    const feedbackDir = path.dirname(html);
    const feedbackFile = isSubmit ? "feedback.json" : "feedback-pending.json";
    const feedbackPath = path.join(feedbackDir, feedbackFile);
    fs.writeFileSync(feedbackPath, JSON.stringify(body, null, 2));

    if (isSubmit) {
      state = "done";
      if (timeoutTimer) clearTimeout(timeoutTimer);

      // exit 前に response 送信時間を確保
      setTimeout(() => {
        server.stop();
        process.exit(0);
      }, 100);

      return Response.json({ received: true, action: "submitted" });
    }

    if (isRegenerate) {
      state = "regenerating";
      // regeneration 用に timeout リセット（agent は新 variant 生成の時間が必要）
      if (timeoutTimer) clearTimeout(timeoutTimer);
      timeoutTimer = setTimeout(() => {
        console.error(`SERVE_TIMEOUT: after=${timeout}s (during regeneration)`);
        server.stop();
        process.exit(1);
      }, timeout * 1000);

      return Response.json({ received: true, action: "regenerate" });
    }

    return Response.json({ received: true, action: "unknown" });
  }

  async function handleReload(req: Request): Promise<Response> {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const newHtmlPath = body.html;
    if (!newHtmlPath || !fs.existsSync(newHtmlPath)) {
      return Response.json(
        { error: `HTML file not found: ${newHtmlPath}` },
        { status: 400 },
      );
    }

    // security: symlink を解決し、reload path が allowedDir 内かを validate。
    // /api/reload 経由 path traversal による任意 file 読み取りを防ぐ。
    const resolvedReload = fs.realpathSync(path.resolve(newHtmlPath));
    if (
      !resolvedReload.startsWith(allowedDir + path.sep) &&
      resolvedReload !== allowedDir
    ) {
      return Response.json(
        { error: `Path must be within: ${allowedDir}` },
        { status: 403 },
      );
    }

    // HTML content を差し替え
    htmlContent = fs.readFileSync(resolvedReload, "utf-8");
    state = "serving";

    console.error(`SERVE_RELOADED: html=${newHtmlPath}`);

    // timeout リセット
    if (timeoutTimer) clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(() => {
      console.error(`SERVE_TIMEOUT: after=${timeout}s`);
      server.stop();
      process.exit(1);
    }, timeout * 1000);

    return Response.json({ reloaded: true });
  }

  // process を生かし続ける
  await new Promise(() => {});
}

/**
 * user の default browser で URL を open。
 * macOS (open) / Linux (xdg-open) / headless 環境に対応。
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;

  if (platform === "darwin") {
    cmd = "open";
  } else if (platform === "linux") {
    cmd = "xdg-open";
  } else {
    // Windows または unknown — URL 出力のみ
    console.error(`SERVE_BROWSER_MANUAL: url=${url}`);
    console.error(`browser で URL を open: ${url}`);
    return;
  }

  try {
    const child = spawn(cmd, [url], {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    console.error(`SERVE_BROWSER_OPENED: url=${url}`);
  } catch {
    // open / xdg-open 利用不可（headless CI 環境）
    console.error(`SERVE_BROWSER_MANUAL: url=${url}`);
    console.error(`browser で URL を open: ${url}`);
  }
}
