# uzustack development

このファイルは Claude Code session が uzustack repo で作業するときに自動読込される **AI 向け project context**。人間向けの onboarding は [README.md](README.md)（end user 向け）または [CONTRIBUTING.md](CONTRIBUTING.md)（メンテナー / Contributor 向け）を参照してください。

## Commands

```bash
bun install                  # 依存インストール
bun run gen:skill-docs       # SKILL.md.tmpl → SKILL.md 再生成
bun test                     # skill validation + gen:skill-docs 整合性
```

メンテナーセットアップ（`bin/dev-setup` モード A/B、`bin/dev-teardown`）と end user セットアップ（`./setup`）の詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照。

## Project structure

repo top に直接配置する設計（gstack の `skills/native/` 階層は廃止、PR #3 で確立）：

- `<skill>/SKILL.md.tmpl` — 一次ソース（メンテナー編集対象）
- `<skill>/SKILL.md` — 生成物（`gen:skill-docs` で再生成、commit 必須）
- `_upstream/gstack/` — gstack を subtree として保持（編集禁止、subtree pull の上書き対象）
- `bin/` — runtime CLI（`uzustack-slug` / `uzustack-config` / `dev-setup` 等、約 50 個）
- `scripts/` — build / `gen-skill-docs.ts` / placeholder engine
- `docs/uzustack/` — 翻訳ガイド + Phase 履歴
- `setup` — end user 向けセットアップ
- `bin/dev-setup` / `bin/dev-teardown` — メンテナー向け symlink 展開 / 解除

詳細 layout は [ARCHITECTURE.md](ARCHITECTURE.md) を参照。

## SKILL.md workflow

SKILL.md は **`.tmpl` から生成される**。直接編集してはならない：

1. `<skill>/SKILL.md.tmpl` を編集
2. `bun run gen:skill-docs` で `<skill>/SKILL.md` を再生成
3. `.tmpl` と生成 `.md` の両方を commit

`.github/workflows/skill-docs.yml` が PR ごとに整合性を CI で検証する（`bun run gen:skill-docs` + `git diff --exit-code`）。

**生成 SKILL.md の merge conflict**：両側を accept してはならない。`.tmpl` 側で衝突を解決 → `bun run gen:skill-docs` で再生成 → 生成物を stage する。片側 accept は他方の template 変更を silent に drop する。

## Skill typology

3 type 構成（Type 1 = `type: translated`、Type 2 = 個人運用、Type 3 = `type: native`）。OSS 公開対象は Type 1 / Type 3 のみ。詳細表と設計意図は [ARCHITECTURE.md](ARCHITECTURE.md)、skill 一覧は [README.md](README.md#available-skills) を参照。

## Translation voice rules

uzustack の翻訳作業（gstack の英語 skill → 日本語 + 経営者文脈）には voice 規約がある。**新規翻訳 / rebase 着手前は必読**：

- [docs/uzustack/translation-voice-guide.md](docs/uzustack/translation-voice-guide.md) — voice 規約と訳語表（文字列軸 / 固有名詞軸 / voice 軸の 3 軸構成）
- [docs/uzustack/translation-rebase-fixes.md](docs/uzustack/translation-rebase-fixes.md) — rebase 時に保持すべき uzustack 独自 fix

voice 規約は 2 層で蓄積：

- **v1**：bin 翻訳時に確立（PR #40〜#48）
- **v2 拡張**：plan / strategy / design / orchestration 系で確立（PR #66〜#118、PR #120 で集約）

翻訳作業中に追加ルール候補が出た場合、同 PR 内で `docs/uzustack/translation-voice-guide.md` も更新する（cluster-end の事後集約より気付き〜規約化の lag を最小化）。

## gstack subtree integration

`_upstream/gstack/` に gstack を subtree として保持。月次自動 PR が `.github/workflows/gstack-subtree-pull.yml` で動作（毎月 1 日 09:00 JST）。手動 fallback / rebase 手順は [CONTRIBUTING.md](CONTRIBUTING.md#gstack-更新追従) を参照。

`_upstream/gstack/` 配下の編集は禁止（subtree pull の上書き対象）。uzustack 独自編集は repo top の `<skill>/` 配下または root level で行う。

## VERSION + CHANGELOG style

VERSION は **monotonic 4-tuple**（gstack convention：major.minor.patch.micro）。strict semver ではなく monotonic ordered identifier。bump level（major / minor / patch / micro）は ship 時の意図を表現する。

CHANGELOG は **Keep a Changelog** 形式 + Phase ベース entry。各 release は user-facing な変更を要約し、per-PR 詳細は [docs/uzustack/phase-history.md](docs/uzustack/phase-history.md) に委譲する。

## Commit + branch convention

- ブランチ：`feat/step-NN-<name>` または `feature/<name>`
- コミット：1 commit = 1 logical change（bisect 容易性）
- PR：feature ブランチから main へ、`Closes #N` で issue 連携
- メンテナー single reviewer 段階のため、reviewer 未付与時の `--force-with-lease` push は履歴整理として許容（reviewer 後 / merge 済は禁止）

## Test / CI

- `bun test` — skill validation + `gen:skill-docs` 整合性（フリー、約 1 秒）
- `.github/workflows/skill-docs.yml` — PR ごとに `bun run gen:skill-docs` + `git diff --exit-code` で整合性検証
- `.github/workflows/gstack-subtree-pull.yml` — 月次 subtree pull 自動 PR

## State preservation

skill 実行の中間成果物（checkpoint / timeline / 学習履歴）は `~/.uzustack/projects/{SLUG}/` 配下に保存。SLUG は `bin/uzustack-slug` が git remote URL から導出。プロジェクト本体（コード / docs）を汚さない設計。

詳細は [ARCHITECTURE.md](ARCHITECTURE.md) の State preservation layer section を参照。

## Related docs

- [README.md](README.md) — end user 向け onboarding
- [CONTRIBUTING.md](CONTRIBUTING.md) — メンテナー / Contributor 向けガイド
- [ARCHITECTURE.md](ARCHITECTURE.md) — 3 場所 layout / skill typology / Phase progression / runtime / state 層
- [CHANGELOG.md](CHANGELOG.md) — release notes
- [ETHOS.md](ETHOS.md) — uzustack の構築哲学・原則（Boil the Lake / Search Before Building / User Sovereignty / Build for Yourself）
- [docs/uzustack/translation-voice-guide.md](docs/uzustack/translation-voice-guide.md) — 翻訳 voice ガイド + 訳語表
- [docs/uzustack/translation-rebase-fixes.md](docs/uzustack/translation-rebase-fixes.md) — rebase 時に保持すべき uzustack 独自 fix
- [docs/uzustack/phase-history.md](docs/uzustack/phase-history.md) — Phase 0c〜3.5 進捗 + 主要 PR # 内訳
