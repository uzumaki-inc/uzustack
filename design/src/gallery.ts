/**
 * Design history gallery — project の全 design exploration を HTML timeline で生成。
 * 全 approved/rejected variant + feedback note を date 順で表示。
 * base64 埋め込み image による self-contained HTML。
 */

import fs from "fs";
import path from "path";

export interface GalleryOptions {
  designsDir: string; // ~/.uzustack/projects/$SLUG/designs/
  output: string;
}

interface SessionData {
  dir: string;
  name: string;
  date: string;
  approved: any | null;
  variants: string[]; // variant PNG の path
}

export function generateGalleryHtml(designsDir: string): string {
  const sessions: SessionData[] = [];

  if (!fs.existsSync(designsDir)) {
    return generateEmptyGallery();
  }

  const entries = fs.readdirSync(designsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sessionDir = path.join(designsDir, entry.name);
    let approved: any = null;

    // approved.json があれば読む
    const approvedPath = path.join(sessionDir, "approved.json");
    if (fs.existsSync(approvedPath)) {
      try {
        approved = JSON.parse(fs.readFileSync(approvedPath, "utf-8"));
      } catch {
        // JSON 破損、session 自体は表示し続ける
      }
    }

    // variant PNG を検索
    const variants: string[] = [];
    try {
      const files = fs.readdirSync(sessionDir);
      for (const f of files) {
        if (f.match(/variant-[A-Z]\.png$/i) || f.match(/variant-\d+\.png$/i)) {
          variants.push(path.join(sessionDir, f));
        }
      }
      variants.sort();
    } catch {
      // directory 読み取り不可、skip
    }

    // directory 名から date を抽出（例: homepage-20260327）
    const dateMatch = entry.name.match(/(\d{8})$/);
    const date = dateMatch
      ? `${dateMatch[1].slice(0, 4)}-${dateMatch[1].slice(4, 6)}-${dateMatch[1].slice(6, 8)}`
      : approved?.date?.slice(0, 10) || "Unknown";

    sessions.push({
      dir: sessionDir,
      name: entry.name.replace(/-\d{8}$/, "").replace(/-/g, " "),
      date,
      approved,
      variants,
    });
  }

  if (sessions.length === 0) {
    return generateEmptyGallery();
  }

  // date 順、新しい順で sort
  sessions.sort((a, b) => b.date.localeCompare(a.date));

  const sessionCards = sessions.map(session => {
    const variantImgs = session.variants.map((vPath, i) => {
      try {
        const imgData = fs.readFileSync(vPath).toString("base64");
        const ext = path.extname(vPath).slice(1) || "png";
        const label = path.basename(vPath, `.${ext}`).replace("variant-", "");
        const isApproved = session.approved?.approved_variant === label;
        return `
        <div class="gallery-variant ${isApproved ? "approved" : ""}">
          <img src="data:image/${ext};base64,${imgData}" alt="Variant ${label}" />
          <div class="gallery-variant-label">
            ${label}${isApproved ? ' <span class="approved-badge">approved</span>' : ""}
          </div>
        </div>`;
      } catch {
        return ""; // 読めない image を skip
      }
    }).filter(Boolean).join("\n");

    const feedbackNote = session.approved?.feedback
      ? `<div class="gallery-feedback">"${escapeHtml(String(session.approved.feedback))}"</div>`
      : "";

    return `
    <div class="gallery-session">
      <div class="gallery-session-header">
        <h2>${escapeHtml(session.name)}</h2>
        <span class="gallery-date">${session.date}</span>
      </div>
      ${feedbackNote}
      <div class="gallery-variants">${variantImgs}</div>
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Design History</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #fff;
    color: #333;
  }
  .header {
    padding: 16px 24px;
    border-bottom: 1px solid #e5e5e5;
  }
  .header h1 { font-size: 16px; font-weight: 600; }
  .header .meta { font-size: 13px; color: #999; margin-top: 4px; }
  .gallery { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  .gallery-session {
    border-bottom: 1px solid #e5e5e5;
    padding: 24px 0;
  }
  .gallery-session:last-child { border-bottom: none; }
  .gallery-session-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 12px;
  }
  .gallery-session-header h2 {
    font-size: 15px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .gallery-date { font-size: 13px; color: #999; }
  .gallery-feedback {
    font-size: 13px;
    color: #666;
    font-style: italic;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #f9f9f9;
    border-radius: 4px;
  }
  .gallery-variants {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  .gallery-variant img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 4px;
    border: 2px solid transparent;
  }
  .gallery-variant.approved img {
    border-color: #000;
  }
  .gallery-variant-label {
    font-size: 13px;
    color: #666;
    margin-top: 6px;
    text-align: center;
  }
  .approved-badge {
    background: #000;
    color: #fff;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    font-style: normal;
  }
  .empty {
    text-align: center;
    padding: 80px 24px;
    color: #999;
  }
  .empty h2 { font-size: 18px; margin-bottom: 8px; color: #666; }
</style>
</head>
<body>
<div class="header">
  <h1>Design History</h1>
  <div class="meta">${sessions.length} 件の exploration</div>
</div>
<div class="gallery">
  ${sessionCards}
</div>
</body>
</html>`;
}

function generateEmptyGallery(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Design History</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #fff; color: #333;
  }
  .empty { text-align: center; padding: 80px 24px; color: #999; }
  .empty h2 { font-size: 18px; margin-bottom: 8px; color: #666; }
</style>
</head>
<body>
<div class="empty">
  <h2>design 履歴なし</h2>
  <p><code>/design-shotgun</code> で design 探索を開始。</p>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Gallery command：design exploration から HTML timeline を生成。
 */
export function gallery(options: GalleryOptions): void {
  const html = generateGalleryHtml(options.designsDir);
  const outputDir = path.dirname(options.output);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(options.output, html);
  console.log(JSON.stringify({ outputPath: options.output }));
}
