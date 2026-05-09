# Translation rules — uzustack scope

gstack の英語 skill を日本語 + 経営者文脈に翻訳する作業に関する規律。 voice 軸 / 訳語表 / 固有名詞軸の 3 軸に沿う。

詳細 voice ガイド: [docs/uzustack/translation-voice-guide.md](../../docs/uzustack/translation-voice-guide.md)

---

## 翻訳着手前に CONTRIBUTING.md voice 軸を再確認する

uzustack の翻訳作業着手時の最初の手として、 CONTRIBUTING.md の以下 3 section を必ず再読する：

- **voice 軸（思想・規律の翻案）**: 形式は `日本語（English）` 順、 訳語表に明記の翻案語を使う
- **固有名詞軸**: Garry Tan → uzustack 開発者、 YC → スタートアップ、 Garry Tan 個人を指す箇所 → OSS メンテナー
- **周辺ルール**: v1 で完璧を目指さない、 翻訳作業中に増えるケースは追記して育てる

訳語表 v1 で明記済（着手時に最低限暗記）：
- 「Boil the Lake」 → 「一晩でやり切る（Boil the Lake）」
- 「Search Before Building」 → 「作る前に探す（Search Before Building）」
- 「"the gstack way"」 → 「"uzustack の流儀"（"the gstack way"）」

**Why:** step-47 ETHOS.md 翻訳で「Boil the Lake → 湖を沸かす」 と literal 訳し、 `日本語（English）` 順 + 訳語表との不整合を起こした事例（user 指摘で fix）。 CONTRIBUTING.md は読んでも、 翻訳着手の流れの中で「該当 section に注意が向かない」 と適用が漏れる。

**How to apply:**
1. 翻訳着手の最初の手として、 step ノートを読む前に CONTRIBUTING.md の voice 軸 + 固有名詞軸 + 周辺ルール を再読
2. 翻訳作業中に新しい原則名を訳す場合（例: User Sovereignty / Build for Yourself）、 訳語を CONTRIBUTING table に追記して育てる
3. PR review 段階で repo top の `*.md` 全体を `grep -nE "Boil the Lake[（(]|Search Before Building[（(]|User Sovereignty[（(]|Build for Yourself[（(]"` でセルフチェック、 English-first 残存があれば修正

---

## CONTRIBUTING.md voice 規約 v2 の persona / cognitive pattern table は partial-read で参照

CONTRIBUTING.md voice 規約 v2 の table（経営者思考特性 18 件 / persona 表現 9 件 / Mode 名 4 件 / Data flow 用語 5 件）を **全部読み込まず、 必要な訳語のみ partial-read** する。

**Why:** voice 規約 v2 の reader load が voice 規約 v1（cluster B = 7 項目）比で 10 倍化（v2 = 36 項目以上）。 translation skill 着手時、 目的 skill に出る用語のみ table から拾う方が context 効率的。

**How to apply:**
- skill 翻訳着手時、 目的 skill に出る具体用語を grep または逐次参照で拾う
- table の全行 read は voice 規約 v2 の運用ルールを変更する時のみ
- 例: plan-design-review で `Designer's eye` / `AI slop` 等が出た時、 cognitive pattern table を partial-read（"design" 関連行のみ）で確認する運用

---

## skill 翻訳時の ASCII slug + title_raw frontmatter パターン

upstream gstack 由来の skill で **`tr -cd 'a-z0-9.-'` のような ASCII allowlist 系の slug サニタイズ** を持つものを翻訳する際、 そのまま翻訳すると日本語タイトルが全部 `untitled` に潰れる UX バグになる。

### 例

`/context-save テスト` → file 名 `20260427-193335-untitled.md`、 タイトル全部消失。 日本語ユーザの primary case で致命的。

### 正しい翻訳パターン

ファイル名は ASCII slug のままにして（cross-platform 安全 / shell 安全）、 frontmatter に **`title_raw`** フィールドを追加して raw タイトルを保存する：

```yaml
---
status: in-progress
branch: ...
timestamp: ...
title_raw: テスト    # raw タイトル、 日本語含む、 サニタイズ前
files_modified:
  - ...
---
```

表示側（restore / list）は **`title_raw` を優先、 なければ filename 由来**（後方互換）：

```
タイトル：　 {title_raw 優先、 なければ filename 由来}
```

### Why

- step 30（context-save / context-restore 翻訳）の merge 前 real-run テストで顕在化
- 最初は気づかず /simplify Pass 1/2 でも検出されず（agent 達は upstream 仕様忠実とみなして fail-safe を見抜けなかった）
- 実機で `/context-save テスト` を叩いて初めて「ファイル名が untitled」 と気づいた

### How to apply

- skill 翻訳作業の **事前チェックリスト** に追加: 「raw 文字列をファイル名にするロジックがあるか」「ASCII allowlist サニタイズしているか」
- 該当する場合、 最初の翻訳から `title_raw` パターンを spec 化（`{TITLE_RAW}` / `{LABEL_RAW}` / `{NAME_RAW}` 等、 文脈に応じた命名）
- restore 系 / list 系の翻訳でも合わせて `〜_raw` 優先 fallback to filename パターンで揃える
- /simplify 観点に「日本語入力時の挙動チェック」 を加える（agent 達は英語ベースで考えるので見落としやすい）
