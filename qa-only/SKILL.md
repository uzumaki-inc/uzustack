---
name: qa-only
preamble-tier: 4
version: 0.0.0
description: |
  report-only の QA テスト。Web アプリを体系的にテストし、health score、
  screenshot、再現手順を含む構造化された report を生成するが、何も修正しない。
  「バグを report だけ」「QA report のみ」「テストするけど直さない」
  と要求されたときに使用する。完全な test-fix-verify ループは /qa を使う。
  user が code 変更なしのバグ report を求めるときに能動的に提案する。
  Voice triggers (speech-to-text aliases): "バグ report", "バグだけチェック".
triggers:
  - QA report のみ
  - バグを report だけ
  - test but dont fix
status: phase6-reserved
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

> **Phase 6 で実装検討 — 現在動作しません**
>
> この skill は browse 機構 (永続的 browser daemon) を必要とし、 uzustack の Phase 6 で
> 実装予定です。 現時点では翻訳された SKILL.md / SKILL.md.tmpl のみ存在し、 動作する bin は
> 未配置です。 browse 機構が必要な場合は upstream gstack を直接利用してください。
>
> 詳細: [docs/uzustack/phase6-pending-skills.md](../docs/uzustack/phase6-pending-skills.md)



# qa-only — Phase 6 で対応予定

このスキルは uzustack の Phase 6（browse / extension 独自実装フェーズ）で
本実装される予定です。Phase 3 cluster D C 段階では skill 名予約として
スタブのみ配置されています。

upstream の `_upstream/gstack/qa-only/` 配下に gstack 版の本実装があります
（参照のみ可能、uzustack の setup / skill / bin から一切呼び出されません）。

## 関連

- 上流参照：`_upstream/gstack/qa-only/`（取り込まない、subtree 温存）
