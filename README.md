# uzustack

[UZUMAKI 社](https://uzumaki-inc.jp/) の OSS。経営者・少人数のエンジニアが **ほぼ一人ユニコーン** になるのを助ける Claude Code スキル集です。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)


uzustack は [`garrytan/gstack`](https://github.com/garrytan/gstack) を **subtree として `_upstream/gstack/` に取り込んで構築した** Claude Code スキルツールキットです。Y Combinator 会長 Garry Tan 氏が公開した gstack は、CEO レビュー・エンジニアレビュー・QA など開発チームのロールを Claude Code に演じさせる構造化スキル群を提供します。英語前提なので、日本人が実用的に使えるよう、日本語化と経営者コンテキストへの翻案を加えて uzustack としてカスタマイズしました。

**uzustack の特徴**：

- gstack を **日本語化** して、日本人が違和感なく使える
- gstack でカバーされていない領域は **独自スキル** として追加
- gstack 由来のスキルを使いつつ、自分の文脈に合わせて **独自スキルに昇華できる** 設計（[守破離](#守破離uzustack-の進化段階) 参照）

---

## Who is this for?

このプロジェクトは以下のような方を対象にしています：

- 一人で会社を回している経営者
- 少人数のスタートアップチーム / 受託開発会社
- 新規ビジネスを立ち上げる人
- 日本語ファーストで Claude Code を使いたい人
- 経営判断・プロダクト開発・ナレッジ運用を AI でブーストしたい人
- （任意）Obsidian × claude code 運用を実践している人

---

## Why uzustack?

ゼロから Claude Code のスキルを設計するより、Garry Tan 氏という巨人の肩に乗り、その思考の延長で磨くほうが学びが深く、実用的です。gstack は YC スケール志向の開発チーム向けに設計されていますが、その本質的な型（ロール別スキル + 構造化ハンドオフ + freshness CI）は経営者・少人数の会社にも応用できます。

メンテナーである [@ToraDady](https://github.com/ToraDady) が [株式会社UZUMAKI](https://uzumaki-inc.jp/) のCEOとして、個人実践として始めましたが、同じような課題感を持つ日本の経営者・開発者にも役立つよう、UZUMAKI 社の OSS 活動として公開しています。

---

## Quick Start

### 前提

- [Claude Code](https://claude.com/claude-code) インストール済み
- [bun](https://bun.sh/) インストール済み

### 1. グローバル install

```bash
git clone --depth 1 https://github.com/uzumaki-inc/uzustack.git ~/.claude/skills/uzustack
cd ~/.claude/skills/uzustack && bun install
```

### 2. 自分のプロジェクトで初期化

任意のプロジェクトディレクトリで：

```bash
cd ~/path/to/your-project
~/.claude/skills/uzustack/setup
```

これで `<your-project>/.claude/skills/<skill>/SKILL.md` 配下に uzustack の各スキルが symlink として配置され、Claude Code から呼び出せるようになります。

> 📝 **現在のスコープ**：`./setup` は `.claude/skills/` への symlink 配備のみ行います。`.claude/settings.json` / `.claude/CLAUDE.md` への自動追記は Phase 3 以降で対応予定（既存ファイルは破壊しません）。

### 3. Claude Code でスキルを呼ぶ

```
/investigate  # 根本原因調査
```

> 💡 **uzustack 自体を開発したい方** は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

---

## gstack とuzustackの関係

uzustack は [`garrytan/gstack`](https://github.com/garrytan/gstack) を **subtree として取り込んで** 構築されています。

| 軸 | gstack | uzustack |
|---|---|---|
| 言語 | 英語 | 日本語 |
| 対象 | 開発チーム（YC スケール志向） | 経営者・少人数の会社（一人ユニコーン志向） |
| ホスト | 8 ホスト対応 | Claude Code only |
| スキル内容 | 開発ロール中心 | 経営判断 + プロダクト開発 + ナレッジ運用 |

gstack の優れた仕組みを継承しつつ、Claude Codeに特化し、日本語経営者コンテキストで一次設計しています。
また、著者自身がObsidianの愛好家なので、Obsidianとの親和性を意識して作成しています。

uzustack の構築哲学・原則（Boil the Lake / Search Before Building / User Sovereignty / Build for Yourself）は [ETHOS.md](ETHOS.md) に集約しています（gstack の ETHOS を翻訳・経営者文脈に翻案したもの）。


---

## Architecture

uzustack は **3 つの場所** に分散して動作します：
※Typeについては後述

```
<your-project>/                       ← Claude Code を起動する場所
├── CLAUDE.md                          ← プロジェクト固有の文脈
├── .claude/
│   ├── settings.json                  ← （あれば既存のまま。setup では触らない）
│   ├── CLAUDE.md                      ← （あれば既存のまま。setup では触らない）
│   └── skills/                        ← ./setup が管理（フラット配置で skill を symlink）
│       ├── investigate/               ← Type 1: uzustack 由来の翻訳スキル
│       │   └── SKILL.md
│       ├── obsidian-audit-tac/        ← Type 2: 個人固有スキル（OSS 非公開、各ユーザー固有）
│       │   └── SKILL.md
│       └── ...                        ← skill ごとに 1 ディレクトリ（frontmatter で type 区別）
└── ...（プロジェクトのファイル）

~/.claude/skills/uzustack/             ← uzustack のグローバル install（repo がそのまま入る）
├── investigate/                       ← skill 1 個 = 1 ディレクトリ
│   ├── SKILL.md.tmpl                  ← 一次ソース（メンテナーが編集）
│   └── SKILL.md                       ← 生成物（gen:skill-docs で再生成）
├── <other-skills>/
├── _upstream/
│   └── gstack/                        ← gstack を subtree で保持（git subtree pull で最新化）
└── setup                              ← end user 向けセットアップスクリプト

~/.uzustack/                           ← 生成物・状態保存
└── projects/
    └── {SLUG}/                        ← プロジェクト別 namespace
        ├── checkpoints/
        ├── timeline.jsonl
        └── ...
```

- **A. skill 本体**（`~/.claude/skills/uzustack/`）：uzustack のスキル群を install する場所。各 skill は repo top に直接配置（`<skill>/SKILL.md`）。Type 1/2/3 の区別は SKILL.md frontmatter の `type:` フィールドで表現。`_upstream/gstack/` に gstack の subtree を保持
- **B. skill 本体への接続点**（`<your-project>/.claude/skills/`）：`./setup` が各 skill を `<your-project>/.claude/skills/<skill>/` に展開（real dir + SKILL.md symlink）。Claude Code は `.claude/skills/<skill>/SKILL.md` を skill discovery する仕様のため、フラット配置が必須
- **C. 生成物・状態保存**（`~/.uzustack/projects/{SLUG}/`）：スキル実行の中間成果物（checkpoint, timeline 等）を、プロジェクト別 namespace で保存

> 📝 **C の補足**：スキルが checkpoint・タイムラインログ・学習履歴などの中間成果物を `~/.uzustack/projects/{SLUG}/` に書き出します。Claude Code セッションを跨いだ状態の永続化が目的で、プロジェクト本体（コードリポジトリやドキュメント）を汚しません。この設計は [`gstack`](https://github.com/garrytan/gstack) のパターンを踏襲しています。

> 💡 **開発者向けの Architecture**（メンテナー / Contributor の場合）は [CONTRIBUTING.md](CONTRIBUTING.md#architecture) を参照してください。

---

## Available Skills

uzustack のスキルは 3 タイプに分かれます：

| Type       | 由来                  | repo 内配置                | SKILL.md frontmatter | OSS 公開 |
| ---------- | ------------------- | ----------------------- | -------------------- | ------ |
| **Type 1** | gstack を翻訳・検証したスキル  | uzustack repo top の `<skill>/`     | `type: translated`   | ◯      |
| **Type 2** | 個人運用で熟成中の固有スキル      | 各ユーザーのプロジェクト `.claude/skills/<skill>/` | （任意。属人化を許容）           | ✗      |
| **Type 3** | Type 2 から属人性を抜いた汎用版 | uzustack repo top の `<skill>/`     | `type: native`       | ◯      |

OSS 公開対象は **Type 1 と Type 3** のみ。Type 2 は各ユーザーが自由に試行錯誤する個人領域。これにより「個人依存スキルが OSS を侵さない」構造的な分離を実現しています。

> 📝 **`type:` の意義**：Claude Code は `.claude/skills/<skill>/SKILL.md` をフラットに探索する仕様のため、Type 1 と Type 3 を別フォルダに分けても、配布時には同じディレクトリに混在します。区別はメタデータ（frontmatter）で表現します。


現状の、開発状況は以下の通りです。
`_upstream/`は、本家gstackの翻訳前のスキル で、Type1として翻訳検証したものかを◯✗で表記しています

| _upstream          | Type 1  | 概要                            |
| ------------------ | ------- | ----------------------------- |
| `/investigate`     | ◯       | 根本原因調査                        |
| `/plan-ceo-review` | ✗       | CEO 視点のプランレビュー（複数レビューの連鎖）     |
| `/plan-eng-review` | ✗       | エンジニア視点のプランレビュー               |
| `/design-review`   | ✗       | デザインレビュー（一貫性・階層・間隔修正）         |
| `/qa`              | ✗       | QA テスト + バグ修正反復               |
| `/retro`           | ✗       | 週次振り返り                        |
| `/ship`            | ✗       | リリース完全フロー（test → review → PR） |
| `/context-save`    | ✗       | 作業状態の保存                       |
| `/context-restore` | ✗       | 作業状態の復帰                       |
| `/learn`           | ✗       | プロジェクト学習ログの管理                 |

上記は主要 10 個。完全な一覧は repo の [`_upstream/`](_upstream/) ディレクトリを参照

---

## 守破離：uzustack の進化段階

uzustack は **uzustack プロジェクト全体** として、守破離の段階で進化します：

| 段階 | 状態 |
|---|---|
| **守**（現在） | gstack を subtree で取り込み、Type 1 として翻訳・試用を蓄積 |
| **破** | 個別スキルが Type 2 → Type 3 の進化を繰り返す |
| **離** | gstack 由来（Type 1）が全て Type 3 化 or 削除された独立期 |

---

## 制約・現状

### Supabase 連携の検証状況

uzustack には **gbrain（クロスマシン記憶同期機構）の Supabase 連携 binary** (`uzustack-gbrain-supabase-provision` / `uzustack-gbrain-supabase-verify`) が配置されています。これは upstream gstack に揃えるための完璧複製で、**Supabase アカウントを契約したユーザが使う時点で動く** 状態を保つことを目的としています。

ただし、uzustack 単独では **実機 Supabase 接続による検証は行っていません**。配置のみ済み、`bash -n` syntax check と `--help` 出力の確認のみ完了しています。Supabase アカウントを実際に持つ uzustack ユーザが利用する場合、gstack 側の動作確認エビデンスを参照しながら使用してください。

---

## Contributing

uzustack の開発・改善に貢献していただける方は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください：
- 開発用 clone と `bin/dev-setup` のセットアップ
- ブランチ運用・PR の流れ
- Type 2 → Type 3 への昇華プロセス
- 翻訳ガイド

Issue / 機能要望：
- 個人メンテナーによる OSS です。**PR は歓迎しますが、対応の保証はありません**
- バグ報告・機能要望は [Issue](https://github.com/uzumaki-inc/uzustack/issues) へ

---

## Credits

uzustack は [`garrytan/gstack`](https://github.com/garrytan/gstack)（MIT License）を **subtree として取り込んで** 構築されています。**Garry Tan 氏** の革新的なスキルツールキット設計に深く感謝します。

---

## Related Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) ― 開発者・コントリビューター向けガイド
- [gstack README（日本語版）](docs/gstack-readme-ja.md) ― 上流 gstack（`_upstream/gstack/README.md`）の日本語訳（執筆中）