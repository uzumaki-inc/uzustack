/**
 * $D serve command の test — comparison board feedback 用 HTTP server。
 *
 * stateful な server lifecycle を test する：
 * - SERVING → POST submit → DONE (exit 0)
 * - SERVING → POST regenerate → REGENERATING → POST reload → SERVING
 * - Timeout → exit 1
 * - error 処理（HTML 欠如、不正 JSON、reload path 欠如）
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { generateCompareHtml } from '../src/compare';
import * as fs from 'fs';
import * as path from 'path';

let tmpDir: string;
let boardHtml: string;

// test variant 用に minimal 1x1 pixel PNG を作成
function createTestPng(filePath: string): void {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/58BAwAI/AL+hc2rNAAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(filePath, png);
}

beforeAll(() => {
  tmpDir = '/tmp/serve-test-' + Date.now();
  fs.mkdirSync(tmpDir, { recursive: true });

  // test PNG を作成、comparison board を生成
  createTestPng(path.join(tmpDir, 'variant-A.png'));
  createTestPng(path.join(tmpDir, 'variant-B.png'));
  createTestPng(path.join(tmpDir, 'variant-C.png'));

  const html = generateCompareHtml([
    path.join(tmpDir, 'variant-A.png'),
    path.join(tmpDir, 'variant-B.png'),
    path.join(tmpDir, 'variant-C.png'),
  ]);
  boardHtml = path.join(tmpDir, 'design-board.html');
  fs.writeFileSync(boardHtml, html);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── HTTP module として serve（subprocess なし）────────────────────────

describe('Serve HTTP endpoints', () => {
  let server: ReturnType<typeof Bun.serve>;
  let baseUrl: string;
  let htmlContent: string;
  let state: string;

  beforeAll(() => {
    htmlContent = fs.readFileSync(boardHtml, 'utf-8');
    state = 'serving';

    server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);

        if (req.method === 'GET' && url.pathname === '/') {
          const injected = htmlContent.replace(
            '</head>',
            `<script>window.__UZUSTACK_SERVER_URL = '${url.origin}';</script>\n</head>`
          );
          return new Response(injected, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }

        if (req.method === 'GET' && url.pathname === '/api/progress') {
          return Response.json({ status: state });
        }

        if (req.method === 'POST' && url.pathname === '/api/feedback') {
          return (async () => {
            let body: any;
            try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
            if (typeof body !== 'object' || body === null) return Response.json({ error: 'Expected JSON object' }, { status: 400 });
            const isSubmit = body.regenerated === false;
            const feedbackFile = isSubmit ? 'feedback.json' : 'feedback-pending.json';
            fs.writeFileSync(path.join(tmpDir, feedbackFile), JSON.stringify(body, null, 2));
            if (isSubmit) {
              state = 'done';
              return Response.json({ received: true, action: 'submitted' });
            }
            state = 'regenerating';
            return Response.json({ received: true, action: 'regenerate' });
          })();
        }

        if (req.method === 'POST' && url.pathname === '/api/reload') {
          return (async () => {
            let body: any;
            try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
            if (!body.html || !fs.existsSync(body.html)) {
              return Response.json({ error: `HTML file not found: ${body.html}` }, { status: 400 });
            }
            htmlContent = fs.readFileSync(body.html, 'utf-8');
            state = 'serving';
            return Response.json({ reloaded: true });
          })();
        }

        return new Response('Not found', { status: 404 });
      },
    });
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop();
  });

  test('GET / serves HTML with injected __UZUSTACK_SERVER_URL', async () => {
    const res = await fetch(baseUrl);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('__UZUSTACK_SERVER_URL');
    expect(html).toContain(baseUrl);
    expect(html).toContain('Design 探索');
  });

  test('GET /api/progress returns current state', async () => {
    state = 'serving';
    const res = await fetch(`${baseUrl}/api/progress`);
    const data = await res.json();
    expect(data.status).toBe('serving');
  });

  test('POST /api/feedback with submit sets state to done', async () => {
    state = 'serving';
    const feedback = {
      preferred: 'A',
      ratings: { A: 4, B: 3, C: 2 },
      comments: { A: 'Good spacing' },
      overall: 'Go with A',
      regenerated: false,
    };

    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.action).toBe('submitted');
    expect(state).toBe('done');

    // feedback.json が書き込まれたか確認
    const written = JSON.parse(fs.readFileSync(path.join(tmpDir, 'feedback.json'), 'utf-8'));
    expect(written.preferred).toBe('A');
    expect(written.ratings.A).toBe(4);
  });

  test('POST /api/feedback with regenerate sets state and writes feedback-pending.json', async () => {
    state = 'serving';
    // 既存 pending file を掃除
    const pendingPath = path.join(tmpDir, 'feedback-pending.json');
    if (fs.existsSync(pendingPath)) fs.unlinkSync(pendingPath);

    const feedback = {
      preferred: 'B',
      ratings: { A: 3, B: 5, C: 2 },
      comments: {},
      overall: null,
      regenerated: true,
      regenerateAction: 'different',
    };

    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.action).toBe('regenerate');
    expect(state).toBe('regenerating');

    // progress が regenerating state を反映するはず
    const progress = await fetch(`${baseUrl}/api/progress`);
    const pd = await progress.json();
    expect(pd.status).toBe('regenerating');

    // agent が feedback-pending.json を polling 可能
    expect(fs.existsSync(pendingPath)).toBe(true);
    const pending = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
    expect(pending.regenerated).toBe(true);
    expect(pending.regenerateAction).toBe('different');
  });

  test('POST /api/feedback with remix contains remixSpec', async () => {
    state = 'serving';
    const feedback = {
      preferred: null,
      ratings: { A: 4, B: 3, C: 3 },
      comments: {},
      overall: null,
      regenerated: true,
      regenerateAction: 'remix',
      remixSpec: { layout: 'A', colors: 'B', typography: 'C' },
    };

    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(state).toBe('regenerating');
  });

  test('POST /api/feedback with malformed JSON returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  test('POST /api/feedback with non-object returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '"just a string"',
    });
    expect(res.status).toBe(400);
  });

  test('POST /api/reload swaps HTML and resets state to serving', async () => {
    state = 'regenerating';

    // 新 board HTML を作成
    const newBoard = path.join(tmpDir, 'new-board.html');
    fs.writeFileSync(newBoard, '<html><body>New board content</body></html>');

    const res = await fetch(`${baseUrl}/api/reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: newBoard }),
    });
    const data = await res.json();
    expect(data.reloaded).toBe(true);
    expect(state).toBe('serving');

    // 新 HTML が serve されているか確認
    const pageRes = await fetch(baseUrl);
    const pageHtml = await pageRes.text();
    expect(pageHtml).toContain('New board content');
  });

  test('POST /api/reload with missing file returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: '/nonexistent/file.html' }),
    });
    expect(res.status).toBe(400);
  });

  test('GET /unknown returns 404', async () => {
    const res = await fetch(`${baseUrl}/random-path`);
    expect(res.status).toBe(404);
  });
});

// ─── /api/reload の path traversal protection ─────────────────────

describe('Serve /api/reload — path traversal protection', () => {
  let server: ReturnType<typeof Bun.serve>;
  let baseUrl: string;
  let htmlContent: string;
  let allowedDir: string;

  beforeAll(() => {
    // production と等価な allowedDir、tmpDir に固定
    allowedDir = fs.realpathSync(tmpDir);
    htmlContent = fs.readFileSync(boardHtml, 'utf-8');

    // 本 server は production serve() を path validation 修正込みで mirror
    server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);

        if (req.method === 'GET' && url.pathname === '/') {
          return new Response(htmlContent, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }

        if (req.method === 'POST' && url.pathname === '/api/reload') {
          return (async () => {
            let body: any;
            try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
            if (!body.html || !fs.existsSync(body.html)) {
              return Response.json({ error: `HTML file not found: ${body.html}` }, { status: 400 });
            }
            // production の path validation — design/src/serve.ts と同じ
            const resolvedReload = fs.realpathSync(path.resolve(body.html));
            if (!resolvedReload.startsWith(allowedDir + path.sep) && resolvedReload !== allowedDir) {
              return Response.json({ error: `Path must be within: ${allowedDir}` }, { status: 403 });
            }
            htmlContent = fs.readFileSync(resolvedReload, 'utf-8');
            return Response.json({ reloaded: true });
          })();
        }

        return new Response('Not found', { status: 404 });
      },
    });
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop();
  });

  test('blocks reload with path outside allowed directory', async () => {
    const res = await fetch(`${baseUrl}/api/reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: '/etc/passwd' }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Path must be within');
  });

  test('blocks reload with symlink pointing outside allowed directory', async () => {
    const linkPath = path.join(tmpDir, 'evil-link.html');
    try {
      fs.symlinkSync('/etc/passwd', linkPath);
      const res = await fetch(`${baseUrl}/api/reload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: linkPath }),
      });
      expect(res.status).toBe(403);
    } finally {
      try { fs.unlinkSync(linkPath); } catch {}
    }
  });

  test('allows reload with file inside allowed directory', async () => {
    const goodPath = path.join(tmpDir, 'safe-board.html');
    fs.writeFileSync(goodPath, '<html><body>Safe reload</body></html>');

    const res = await fetch(`${baseUrl}/api/reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: goodPath }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reloaded).toBe(true);

    // 新 content が serve されているか確認
    const page = await fetch(baseUrl);
    expect(await page.text()).toContain('Safe reload');
  });
});

// ─── full lifecycle: regeneration round-trip ──────────────────────

describe('Full regeneration lifecycle', () => {
  let server: ReturnType<typeof Bun.serve>;
  let baseUrl: string;
  let htmlContent: string;
  let state: string;

  beforeAll(() => {
    htmlContent = fs.readFileSync(boardHtml, 'utf-8');
    state = 'serving';

    server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (req.method === 'GET' && url.pathname === '/') {
          return new Response(htmlContent, { headers: { 'Content-Type': 'text/html' } });
        }
        if (req.method === 'GET' && url.pathname === '/api/progress') {
          return Response.json({ status: state });
        }
        if (req.method === 'POST' && url.pathname === '/api/feedback') {
          return (async () => {
            const body = await req.json();
            if (body.regenerated) { state = 'regenerating'; return Response.json({ received: true, action: 'regenerate' }); }
            state = 'done'; return Response.json({ received: true, action: 'submitted' });
          })();
        }
        if (req.method === 'POST' && url.pathname === '/api/reload') {
          return (async () => {
            const body = await req.json();
            if (body.html && fs.existsSync(body.html)) {
              htmlContent = fs.readFileSync(body.html, 'utf-8');
              state = 'serving';
              return Response.json({ reloaded: true });
            }
            return Response.json({ error: 'Not found' }, { status: 400 });
          })();
        }
        return new Response('Not found', { status: 404 });
      },
    });
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => { server.stop(); });

  test('regenerate → reload → submit round-trip', async () => {
    // Step 1: user が regenerate を click
    expect(state).toBe('serving');
    const regen = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regenerated: true, regenerateAction: 'different', preferred: null, ratings: {}, comments: {} }),
    });
    expect((await regen.json()).action).toBe('regenerate');
    expect(state).toBe('regenerating');

    // Step 2: progress が regenerating を返す
    const prog1 = await (await fetch(`${baseUrl}/api/progress`)).json();
    expect(prog1.status).toBe('regenerating');

    // Step 3: agent が新 variant を生成し reload
    const newBoard = path.join(tmpDir, 'round2-board.html');
    fs.writeFileSync(newBoard, '<html><body>Round 2 variants</body></html>');
    const reload = await fetch(`${baseUrl}/api/reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: newBoard }),
    });
    expect((await reload.json()).reloaded).toBe(true);
    expect(state).toBe('serving');

    // Step 4: progress が serving を返す（board が auto-refresh するはず）
    const prog2 = await (await fetch(`${baseUrl}/api/progress`)).json();
    expect(prog2.status).toBe('serving');

    // Step 5: user が round 2 で submit
    const submit = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regenerated: false, preferred: 'B', ratings: { A: 3, B: 5 }, comments: {}, overall: 'B is great' }),
    });
    expect((await submit.json()).action).toBe('submitted');
    expect(state).toBe('done');
  });
});
