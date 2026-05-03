# Changelog

uzustack の release notes。フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠、versioning は gstack convention（4-tuple monotonic ordered identifier、major.minor.patch.micro）を採用しています。

各 release entry は **user-facing な変更** を要約します。Phase ごとの主要 PR # 内訳と完遂事項は [docs/uzustack/phase-history.md](docs/uzustack/phase-history.md) に委譲します。

---

## [0.3.5.0] — 2026-05-03

uzustack の **初回公開 release**。「型の取り込み」 完遂時点（Phase 0c〜3.5）+ 公開の足回り（Phase 3.6 root file 4 件）をまとめて公開する。Type 1 翻訳 30 件 + Phase 6 予約スタブ 10 件、計 40 skill が利用可能な状態。

「型の取り込み」 = runtime + 翻訳パイプラインが揃ったこと。守破離の **守の完成** は Phase 6（予約スタブ 10 件の Type 1/3 判定）で達成予定。

### Added — user-facing

- **40 skill が利用可能** — 翻訳 skill 30 件（CEO / engineering / design / DX レビュー、ship / land-and-deploy / document-release の出荷 workflow、investigate / retro / careful 等のデバッグ系）+ Phase 6 予約スタブ 10 件（`browse` / `qa` / `canary` / `make-pdf` / `pair-agent` 等）。一覧は [README.md](README.md#available-skills) 参照
- **end user セットアップ `./setup`** — 任意のプロジェクトに `.claude/skills/<skill>/` を symlink でフラット展開
- **gstack 月次自動取込み** — 毎月 1 日に gstack 上流変更が PR として届く

### Added — for contributors

- **runtime layer** — bin 約 50 個 + テンプレート機構（5 host 展開：claude / codex / kiro / factory / opencode）+ voice 翻案ガイドライン（v1 / v2 拡張）
- **メンテナーセットアップ** — `bin/dev-setup` / `bin/dev-teardown`（モード A: セルフ symlink / モード B: 外部プロジェクト）
- **freshness CI** — `.github/workflows/skill-docs.yml` が PR ごとに `gen:skill-docs` 整合性を検証
- **VERSION / CHANGELOG / CLAUDE / ARCHITECTURE** — root file 4 件を repo top に翻訳配置（step-80 / Issue #123）
- 各 Phase の主要 PR # 内訳と完遂事項：[docs/uzustack/phase-history.md](docs/uzustack/phase-history.md) 参照
- 翻訳 voice 規約 + 訳語表：[docs/uzustack/translation-voice-guide.md](docs/uzustack/translation-voice-guide.md) 参照
- rebase 時の uzustack 独自 fix：[docs/uzustack/translation-rebase-fixes.md](docs/uzustack/translation-rebase-fixes.md) 参照
- 構築哲学・原則：[ETHOS.md](ETHOS.md)（Boil the Lake / Search Before Building / User Sovereignty / Build for Yourself）

### 既知の制約

- **Supabase 連携の検証未実施** — gbrain（クロスマシン記憶同期機構）の Supabase 連携 binary は配置済（`bin/uzustack-gbrain-supabase-provision` / `bin/uzustack-gbrain-supabase-verify`）だが、実機 Supabase 接続による検証は未完了。`bash -n` syntax check と `--help` 出力の確認のみ完了。Supabase アカウントを持つ user は gstack 側の動作確認 evidence を参照しながら使用すること
- **Phase 6 予約スタブ 10 件は未検証** — subtree pull で取り込めるかの実機検証が Phase 6 で実施予定

[0.3.5.0]: https://github.com/uzumaki-inc/uzustack/releases/tag/v0.3.5.0
