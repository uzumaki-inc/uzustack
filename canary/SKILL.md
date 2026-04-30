---
name: canary
preamble-tier: 2
version: 0.0.0
description: |
  デプロイ後の canary monitoring。本番アプリの console error、
  performance regression、page failure を browse daemon で監視する。
  定期的に screenshot を撮り、deploy 前 baseline と比較して異常を検知する。
  「デプロイを監視」「canary」「post-deploy チェック」「本番を見張る」
  「デプロイ確認」と要求されたときに使用する。
triggers:
  - デプロイ後の監視
  - canary チェック
  - 本番の error を監視
status: phase6-reserved
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->



# canary — Phase 6 で対応予定

このスキルは uzustack の Phase 6（browse / extension 独自実装フェーズ）で
本実装される予定です。Phase 3 cluster D C 段階では skill 名予約として
スタブのみ配置されています。

upstream の `_upstream/gstack/canary/` 配下に gstack 版の本実装があります
（参照のみ可能、uzustack の setup / skill / bin から一切呼び出されません）。

## 関連

- 上流参照：`_upstream/gstack/canary/`（取り込まない、subtree 温存）
- Phase 6 で uzustack 独自 browse 実装と同時に本実装される予定
