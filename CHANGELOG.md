# Changelog

uzustack の release notes。フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠、versioning は gstack convention（4-tuple monotonic ordered identifier、major.minor.patch.micro）を採用しています。

各 release entry は **user-facing な変更** を要約します。Phase ごとの主要 PR # 内訳と完遂事項は [docs/uzustack/phase-history.md](docs/uzustack/phase-history.md) に委譲します。

---

## [0.3.5.1] — 2026-05-08

### Changed — user-facing

- **守完走判定を再定義** — 旧「Phase 6 予約スタブ 10 件の Type 1/3 判定」 から「browse 機構必須 13 skill の動作実装」 に articulate を統一。 (1) browser 機構 と (2) ワークフロー skill の依存関係を ARCHITECTURE.md / README.md / CONTRIBUTING.md / docs/uzustack/ で正式 articulate
- **browse 機構必須 13 skill** (browse / qa / qa-only / canary / benchmark / make-pdf / design-review / design-consultation / land-and-deploy / open-uzustack-browser / pair-agent / connect-chrome / setup-browser-cookies) の SKILL.md.tmpl 先頭に Phase 6 待ち warning block を統一配置 — frontmatter `status: phase6-reserved` も全 13 skill で統一
- **README.md の skill 一覧** — 旧「翻訳済 30 件 + 予約スタブ 10 件」 から「動作する 26 件 + browse 機構必須 14 件」 に分類変更。 design-review / design-consultation / devex-review / land-and-deploy が browse 機構必須（= 現状動作しない）と判明したため再分類

### Fixed — fact-check 後の reclassify

- **devex-review を browse 機構必須側に reclassify** — fact-check で description + 本文 line 50 + line 83「browse tool で docs を navigate / screenshot」 等の literal instruction が確認された。 旧「非依存 28 件」 → 新「必須依存 14 件」 へ移動 + SKILL.md.tmpl に warning block 配置
- **autoplan を optional → 非依存 に reclassify** — uzustack 翻訳済 (repo top) では browse literal が翻訳時に削除済 (gstack 上流 line 322「Launch real browser for QA → invoke /open-gstack-browser」 が uzustack 側に存在しない)。 旧「optional 依存 3 件」 → 新「optional 依存 2 件」、 非依存 28 件は維持 (devex-review 抜き + autoplan 追加で同数)
- **守完走 base 31 → 30 skill に修正** — 非依存 28 + optional 2 = 30
- **判定基準の articulate 強化** — 「`{{BROWSE_SETUP}}` placeholder の存在 = browse 必須」 ではないことを明示 (placeholder engine の resolver は空文字列を返し SKILL.md 生成時に削除される)。 ARCHITECTURE.md「(1) browser 機構 と (2) ワークフロー skill の依存関係」 section に判定基準を追記

### Added — for contributors

- **docs/uzustack/phase6-pending-skills.md** — Phase 6 待ち 13 skill list + grep evidence
- **docs/uzustack/phase6-warning-block.md** — 共通 warning block の source of truth + 配置規律
- **docs/uzustack/translation-voice-guide.md** — 「Phase 6 待ち skill の voice 翻案射程」 section 追加（射程内 / 射程外 / 判断基準）
- **CONTRIBUTING.md** — 「Phase 6 待ち skill 翻訳時の warning 配置必須」 規律追加
- **ARCHITECTURE.md** — 「(1) browser 機構 と (2) ワークフロー skill の依存関係」 section 新設、 「守破離における Phase 6 の位置付け」 section（TODO(human) 待ち）追加

### Known limitations（継続）

- placeholder engine (`scripts/gen-skill-docs.ts` の resolvers/) は依然空 stub — Phase 4+ で本体実装予定。 共通 warning block を自動注入できないため各 SKILL.md.tmpl に直書き
- plan-ceo-review / plan-devex-review / plan-eng-review が `~/.claude/skills/uzustack/browse/bin/remote-slug` を参照（browse skill 未実装のため fallback `git rev-parse` で動作）

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

[0.3.5.1]: https://github.com/uzumaki-inc/uzustack/releases/tag/v0.3.5.1
[0.3.5.0]: https://github.com/uzumaki-inc/uzustack/releases/tag/v0.3.5.0
