# TODOS.md Format Reference

canonical な TODOS.md 形式の共有 reference。`/ship`（Step 5.5）と `/plan-ceo-review`（TODOS.md updates section）が一貫した TODO item 構造を確保するため参照する。

---

## File Structure

```markdown
# TODOS

## <Skill/Component>     ← 例：## Browse, ## Ship, ## Review, ## Infrastructure
<P0 → P1 → P2 → P3 → P4 順で sort された項目>

## Completed
<完了 annotation 付きの finished items>
```

**Section:** skill / component で organize（`## Browse`、`## Ship`、`## Review`、`## QA`、`## Retro`、`## Infrastructure`）。各 section 内で priority で sort（P0 を上）。

---

## TODO Item 形式

各項目は section 配下の H3：

```markdown
### <Title>

**What:** 作業の 1 行 description。

**Why:** 解決する具体的問題、または unlock する value。

**Context:** 3 ヶ月後にこれを picking up する人が、motivation、現状、開始点を理解できる詳細。

**Effort:** S / M / L / XL
**Priority:** P0 / P1 / P2 / P3 / P4
**Depends on:** <prerequisite、または "None">
```

**必須 field:** What、Why、Context、Effort、Priority
**任意 field:** Depends on、Blocked by

---

## Priority 定義

- **P0** — Blocking：次 release 前に必ず done
- **P1** — Critical：本 cycle で done すべき
- **P2** — Important：P0/P1 が clear になったら do
- **P3** — Nice-to-have：adoption / usage data 後に revisit
- **P4** — Someday：good idea、urgency なし

---

## Completed Item 形式

項目が完了したら、`## Completed` section に move し、original 内容を保持しながら以下を append：

```markdown
**Completed:** vX.Y.Z (YYYY-MM-DD)
```
