# Contributing to uzustack

uzustack の開発に貢献していただきありがとうございます。このドキュメントは **メンテナー・コントリビューター向け** の開発ガイドです。

end user として uzustack を使うだけの方は [README.md](README.md) を参照してください。

---

## 個人メンテナーの OSS について

uzustack は **個人メンテナーによる OSS** です：

- PR は歓迎しますが、対応の保証はありません
- 翻訳の改善・新スキル提案・バグ修正も歓迎
- バグ報告・機能要望は [Issue](https://github.com/uzumaki-inc/uzustack/issues) へ

---

## Quick Start（メンテナー / Contributor 向け）

メンテナーは `~/.claude/skills/uzustack/` を **作らずに**、開発用 clone から直接 symlink を貼ります。これにより **1 clone で開発と利用を兼ねられます**。

### 前提

- [Claude Code](https://claude.com/claude-code) インストール済み
- [bun](https://bun.sh/) インストール済み
- Git アカウント・GitHub 認証

### 1. 開発用 clone

```bash
git clone https://github.com/uzumaki-inc/uzustack.git ~/src/uzustack
cd ~/src/uzustack && bun install
```

（任意の場所に clone してよいが、本ガイドは `~/src/uzustack/` を例として使用）

### 2. dev-setup でプロジェクトに symlink を貼る

```bash
cd ~/src/uzustack
bin/dev-setup
```

これでテスト用プロジェクトの `.claude/skills/uzustack/` が `~/src/uzustack/` への symlink になり、開発した skill が即座に反映されます（git pull 不要）。

### 3. 動作確認

任意のプロジェクトで Claude Code を起動し、`/investigate` 等のスキルが呼び出せることを確認してください。

---

## Architecture（メンテナー / Contributor の場合）

メンテナーは **`~/.claude/skills/uzustack/` を作りません**。代わりに開発用 clone（`~/src/uzustack/`）から直接 symlink を貼ります。

```
<your-project>/                       ← Claude Code を起動する場所
├── .claude/
│   └── skills/
│       ├── uzustack/                  ← symlink → ~/src/uzustack/skills/
│       └── personal/                  ← Type 2: 個人固有スキル

~/src/uzustack/                        ← 開発用 clone（メンテナーはこれ 1 つだけ）
├── skills/
│   ├── translated/                    ← Type 1: gstack 由来翻訳済み
│   └── native/                        ← Type 3: uzustack 独自・汎用
└── _upstream/
    └── gstack/                        ← gstack を subtree で保持（git subtree pull で最新化）
   ※ ~/.claude/skills/uzustack/ は作らない

~/.uzustack/                           ← 生成物・状態保存（end user と同じ）
```

- **skill 本体の場所**：`~/src/uzustack/`（開発用 clone、end user での `~/.claude/skills/uzustack/` に相当）
- **symlink を貼る作業**：`bin/dev-setup` が自動化（gstack から継承）
- **メリット**：開発した skill が即座にプロジェクトで使える。バージョンずれゼロ・pull 重複なし

end user 視点の Architecture は [README.md](README.md#architecture) を参照してください。

---

## 開発フロー

### ブランチ運用

- **`main` ブランチ**：安定版（end user が利用する版）
- **`feature/<機能名>` ブランチ**：開発作業用
- 開発時に `git checkout -b feature/translate-investigate` のようにブランチを切る
- 完成したら `main` へ PR / merge

これにより、開発中の壊れた変更が `main` ブランチで利用中の自分（メンテナー兼利用者）に影響しません。

### PR の流れ

1. `feature/<機能名>` ブランチで開発
2. `bin/dev-setup` 経由で動作確認
3. push して GitHub で PR 作成
4. `skill-docs.yml`（freshness CI）が自動実行されることを確認
5. CI が通ったら self-merge or レビュー後に merge

---

## gstack 更新追従

uzustack は gstack を `_upstream/gstack/` に **subtree** として保持しています。gstack 本家の更新を取り込む手順：

```bash
cd ~/src/uzustack
git subtree pull --prefix _upstream/gstack https://github.com/garrytan/gstack.git main --squash
```

これで `_upstream/gstack/` 配下が最新の gstack に更新されます。続いて、必要に応じて：

1. 翻訳済み skill（`skills/translated/<skill>/`）を最新の `_upstream/gstack/<skill>/` と `git diff` で比較
2. 差分があれば翻訳を更新（`feature/sync-gstack-<日付>` ブランチで作業 → PR）
3. uzustack 独自部分（`skills/native/`）は gstack 更新と無関係

### 取り込み頻度の目安

- **週1 〜 月1**：gstack の活発度に合わせて
- 大きな変更があった時：すぐに subtree pull して影響を確認
- 翻訳作業中：作業ブランチでの作業が落ち着いてから（衝突回避）

---

## Type 2 → Type 3 への昇華プロセス

uzustack の独自貢献ポイント：個人で熟成したスキル（Type 2）を、属人性を抜いて汎用版（Type 3）として OSS に昇華させる。

### 昇華の判断基準

- 個人プロジェクトで繰り返し使った（実用性の証明）
- プロジェクト構造・ファイル命名・固有概念名などの **属人的依存が抜けた**（or 抜くことができる）
- 他のユーザーにも価値がある（汎用化の意義）

### 昇華の手順

1. Type 2（個人プロジェクト内 `personal/<skill>`）の現状を整理
2. 属人的な依存（具体的なファイルパス、固有の概念名等）を **設定で外出し** または **抽象化**
3. `~/src/uzustack/skills/native/<skill>/` に新規作成（コピー & 汎用化）
4. README の Available Skills を更新
5. PR

> 📝 **重要**：personal（Type 2）と uzustack（Type 1/3）は **直接の相互参照をしません**。価値の流れは「Type 2 → Type 3 への昇華」というメタプロセスで担います（Skill 同士の依存関係グラフを作らない設計）。

---

## テスト・freshness CI

### gen:skill-docs

`bun run gen:skill-docs` で全スキルの `SKILL.md` が再生成されます。コミット済みの `SKILL.md` と差分が出なければ整合性が保たれています。

### .github/workflows/skill-docs.yml

push / PR ごとに以下を実行：
- `bun install`
- `bun run gen:skill-docs`
- `git diff --exit-code`（差分があれば CI 失敗）

→ 「ソース定義 ↔ 生成された SKILL.md」の整合性を機械的に保証します。

---

## 翻訳ガイド（gstack の英語スキルを翻訳する場合）

- 翻訳は **「守」段階では原文に忠実に**（用語のみ日本語化）
- 経営者コンテキストへの翻案は **「破」段階で**（数ヶ月後）
- 翻訳済みは `skills/translated/` に、未翻訳は `_upstream/` に
- 詳細は [守破離方針](README.md#守破離uzustack-の進化段階) 参照