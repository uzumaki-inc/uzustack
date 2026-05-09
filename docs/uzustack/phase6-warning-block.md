# Phase 6 待ち skill の warning block — source of truth

uzustack の browse 機構必須 14 entry (13 機能 + connect-chrome alias、 詳細は [phase6-pending-skills.md](phase6-pending-skills.md)) は Phase 6 まで動作しない。 end user に「翻訳されているのに動かない」 体験を強いないため、 各 SKILL.md.tmpl の **frontmatter 直後 (`{{PREAMBLE}}` 直前)** に共通 warning block を直書きする。

## 共通 warning block

以下を SKILL.md.tmpl にそのまま貼り付ける。 voice 規約 v1 に従い uzustack voice (経営者文脈 + 日本語) で書く。

```markdown
> **Phase 6 で実装検討 — 現在動作しません**
>
> この skill は browse 機構 (永続的 browser daemon) を必要とし、 uzustack の Phase 6 で
> 実装予定です。 現時点では翻訳された SKILL.md / SKILL.md.tmpl のみ存在し、 動作する bin は
> 未配置です。 browse 機構が必要な場合は upstream gstack を直接利用してください。
>
> 詳細: [docs/uzustack/phase6-pending-skills.md](../docs/uzustack/phase6-pending-skills.md)
```

## 配置規律

### 配置位置

SKILL.md.tmpl 内で:

```markdown
---
<frontmatter>
status: phase6-reserved   ← 追加必須
---

> **Phase 6 で実装検討 — 現在動作しません**     ← warning block
> ...
> 詳細: [...]

{{PREAMBLE}}                                    ← 既存

(本文 ...)
```

### 既存 H1 注記との関係

connect-chrome / canary / setup-browser-cookies に既存する `# <skill> — Phase 6 で対応予定` 注記は、 本 warning block に統合して**削除**する。 H1 注記が残っていると重複表示になる。

### voice 翻案の射程

warning block 自体は uzustack voice (= 経営者文脈 + 日本語) で書く。 ただし browse 機構の英語 error / output / Chromium binary 出力 自体は Phase 6 まで翻案保留 (= 英語のまま動作させる) と明示する (詳細は `docs/uzustack/translation-voice-guide.md` の「Phase 6 待ち skill の voice 翻案射程」 section)。

### subtree pull 上書き耐性

`_upstream/gstack/` は subtree pull の上書き対象だが、 本 warning block は **uzustack 側 repo top の SKILL.md.tmpl に配置** するので subtree pull の影響を受けない。 月次自動 PR が gstack 本体を更新しても warning block は維持される。

## 適用対象 skill (14 entry, 13 機能)

詳細は [phase6-pending-skills.md](phase6-pending-skills.md) を参照。

1. browse
2. open-uzustack-browser
3. pair-agent
4. connect-chrome (open-uzustack-browser の alias)
5. qa
6. qa-only
7. canary
8. benchmark
9. make-pdf
10. design-review
11. design-consultation
12. devex-review
13. setup-browser-cookies
14. land-and-deploy

## 検証

実装後の verification grep:

```bash
for s in browse open-uzustack-browser pair-agent connect-chrome qa qa-only canary benchmark make-pdf design-review design-consultation devex-review setup-browser-cookies land-and-deploy; do
  if grep -q "Phase 6 で実装検討 — 現在動作しません" "$s/SKILL.md.tmpl" 2>/dev/null; then
    echo "  OK: $s"
  else
    echo "  MISSING: $s"
  fi
done
```

すべて OK が出れば配置完了。
