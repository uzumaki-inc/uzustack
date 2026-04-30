---
name: connect-chrome
version: 0.0.0
description: |
  Chromium 接続用の alias。AI 制御の Chromium を起動し、sidebar extension で
  リアルタイムに動作を観察する。本実装は /open-uzustack-browser と同等。
  「Chrome に接続」「connect chrome」「Chrome を開く」と要求されたときに使用する。
  Voice triggers (speech-to-text aliases): "Chrome に接続".
triggers:
  - Chrome に接続
  - connect chrome
  - Chromium を開く
status: phase6-reserved
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->



# connect-chrome — Phase 6 で対応予定

このスキルは uzustack の Phase 6（browse / extension 独自実装フェーズ）で
本実装される予定です。Phase 3 cluster D C 段階では skill 名予約として
スタブのみ配置されています。

upstream の `_upstream/gstack/connect-chrome/` は `open-gstack-browser/` への
symlink です。upstream の `name:` フィールドは `open-gstack-browser` のままで、
uzustack 側は `name: connect-chrome` を正として独立した stub に配置しています。

## 関連

- 上流参照：`_upstream/gstack/connect-chrome/`（symlink → `open-gstack-browser/`、取り込まない、subtree 温存）
