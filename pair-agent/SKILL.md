---
name: pair-agent
version: 0.0.0
description: |
  別 AI agent と browser を pair する skill。本実装は Phase 6 で配置予定。
  「pair agent」「agent を接続」「browser を共有」「remote browser に接続」
  と要求されたときに使用する。
  Voice triggers (speech-to-text aliases): "agent を pair", "agent を接続", "browser を共有", "remote browser に接続".
triggers:
  - agent と pair
  - remote agent を接続
  - browser を共有
status: phase6-reserved
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->



# pair-agent — Phase 6 で対応予定

このスキルは uzustack の Phase 6（browse / extension 独自実装フェーズ）で
本実装される予定です。Phase 3.5 段階では skill 名予約として
スタブのみ配置されています。

upstream の `_upstream/gstack/pair-agent/` 配下に gstack 版の本実装があります
（参照のみ可能、uzustack の setup / skill / bin から一切呼び出されません）。
別 agent と browser を共有する setup key 発行が core 機能で、
browse 機構 core 依存のため Phase 6 で browse 独自実装と同時設計します。

## 関連

- 上流参照：`_upstream/gstack/pair-agent/`（取り込まない、subtree 温存）
