---
name: qa
preamble-tier: 4
version: 0.0.0
description: |
  Web アプリの体系的 QA テストとバグ修正ループ。QA テストを実行し、
  source code 内のバグを iterative に修正、各修正を atomic に commit
  して再検証する。「QA」「サイトをテスト」「バグを見つけて」
  「テストして直して」「壊れているところを直して」と要求されたときに
  使用する。「機能の準備ができた」「これ動く?」と user が言ったときに
  能動的に提案する。3 段階：Quick (critical / high のみ)、Standard
  (+ medium)、Exhaustive (+ cosmetic)。before / after の health score、
  修正 evidence、ship-readiness summary を生成する。report のみで
  修正しない場合は /qa-only を使う。
  Voice triggers (speech-to-text aliases): "QA を実行", "サイトをテスト", "アプリをチェック".
triggers:
  - QA テスト
  - サイトの不具合を探す
  - test the site
  - バグを直して
status: phase6-reserved
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->



# qa — Phase 6 で対応予定

このスキルは uzustack の Phase 6（browse / extension 独自実装フェーズ）で
本実装される予定です。Phase 3 cluster D C 段階では skill 名予約として
スタブのみ配置されています。

upstream の `_upstream/gstack/qa/` 配下に gstack 版の本実装があります
（参照のみ可能、uzustack の setup / skill / bin から一切呼び出されません）。

## 関連

- 上流参照：`_upstream/gstack/qa/`（取り込まない、subtree 温存）
