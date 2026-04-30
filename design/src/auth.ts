/**
 * OpenAI API access のための認証解決。
 *
 * 解決順:
 * 1. ~/.uzustack/openai.json → { "api_key": "sk-..." }
 * 2. OPENAI_API_KEY 環境変数
 * 3. null（caller が guided setup または fallback を扱う）
 */

import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.env.HOME || "~", ".uzustack", "openai.json");

export function resolveApiKey(): string | null {
  // 1. ~/.uzustack/openai.json を確認
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, "utf-8");
      const config = JSON.parse(content);
      if (config.api_key && typeof config.api_key === "string") {
        return config.api_key;
      }
    }
  } catch {
    // 環境変数 check へ fall through
  }

  // 2. 環境変数を確認
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  return null;
}

/**
 * API key を ~/.uzustack/openai.json に 0600 permissions で保存。
 */
export function saveApiKey(key: string): void {
  const dir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ api_key: key }, null, 2));
  fs.chmodSync(CONFIG_PATH, 0o600);
}

/**
 * API key を取得、未設定なら setup 案内を出して exit。
 */
export function requireApiKey(): string {
  const key = resolveApiKey();
  if (!key) {
    console.error("OpenAI API key 未設定。");
    console.error("");
    console.error("実行: $D setup");
    console.error("  または ~/.uzustack/openai.json に保存: { \"api_key\": \"sk-...\" }");
    console.error("  または OPENAI_API_KEY 環境変数を設定");
    console.error("");
    console.error("key 取得先: https://platform.openai.com/api-keys");
    process.exit(1);
  }
  return key;
}
