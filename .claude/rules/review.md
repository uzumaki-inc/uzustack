# Review rules — uzustack scope

review 系規律（/simplify / upstream signal / specificity drift など）。 reviewer 状態と destructive action の関係も含む。

---

## upstream は最強の reviewer signal を発する

upstream gstack は uzustack にとって「最強の reviewer」 と位置付ける。 upstream に意図的な例外や signal が見つかったら、 自プロジェクトでも同じ判断を選ぶことで、 判断量が削減され、 将来の subtree pull 時の整合も保たれる。

**Why:** 2026-04-29 step-39 で確立: `chrome-cdp` が upstream で唯一 `gstack-` prefix を持っていなかった事実 + `_upstream/gstack/test/audit-compliance.test.ts:110` の `readFileSync(join(ROOT, 'bin/chrome-cdp'))` hardcode が、 upstream 設計判断の最も強い signal だった。 これを根拠に uzustack 側でも `chrome-cdp` (prefix なし) で維持と決定。 judgment を一度集中して決め切る方針として upstream の判断を尊重する方が、 自プロジェクト側の判断回数が減る。 将来の test 持ち込み phase / subtree pull 時に path / 命名 / 構造の不整合が発生しない（完璧複製規律と整合）。

**How to apply:**
- 自プロジェクトでの命名や構造の判断時、 upstream で例外的な扱いがあれば「upstream の意図 signal」 として読む
- 特に強い signal の優先順位:
  1. **test の hardcode** (`_upstream/gstack/test/` 配下で path / 名前を直接参照) — 将来の test 持ち込み時の整合判断に直結、 最優先
  2. **命名規則の例外** (例: prefix の有無、 root skill 名と sub-skill の扱い差)
  3. **comment の構造解説** (なぜそう設計したかが書かれている箇所)
- upstream の判断と自プロジェクトの判断がズレる場合、 特別な理由がない限り upstream に揃える
- 規約 (CONTRIBUTING.md) の射程に「ファイル名 + ファイル内 identifier」 の両方を含める判断も、 upstream signal を読み解く規律から派生
- 例外運用ルール (step-39 で確立): 外部 product / protocol / tool 名で構成された binary は、 upstream で `gstack-` prefix が付いていなければ、 uzustack 側でも prefix なしで維持

---

## upstream perfect-clone と /simplify findings の仕分け

uzustack で `/simplify` を回した時、 findings が `_upstream/gstack/` にも存在する場合は **uzustack 単独修正を保留** し、 **upstream tech debt 観測リスト** として別管理する。

**Why:** uzustack は gstack の voice 翻案 perfect-clone であり、 upstream からの periodic subtree pull で divergence を最小化する設計。 uzustack 側で独自に polish を入れると upstream merge 時に毎回 conflict が累積し、 機械化（「scope 縮小より機械化を優先」 規律）の利益が失われる。 「scope 縮小より機械化を優先」 と表裏一体の規律で、 片方だけでは機能しない。

**守期間の運用方針:**

- gstack の独自改善速度が高いため、 **定期的な subtree pull で最新 gstack に合わせれば、 観測リストの findings は upstream で fix されれば自動吸収** される
- 守期間中は **gstack へ PR は出さない**。 観測リストは「uzustack 単独 fix しない理由の memo」 として運用
- 改善したくなったら **守破離の「破」 移行で再判断**（個別 skill / binary が Type 2 → Type 3 進化する文脈で、 upstream PR / 独自 fix を検討）
- 呼称: 旧「upstream PR 候補」 ではなく「**upstream tech debt 観測リスト**」（前のめり感を避け、 時間軸境界を明示）

**How to apply:**

- `/simplify` の findings を受け取ったら、 各項目について `_upstream/gstack/` 内の対応箇所に **同じ pattern が存在するか** を grep / Read で確認
- **存在する場合**: upstream tech debt として分離。 uzustack 単独修正は skip。 Phase 4+ epic の "upstream tech debt 観測リスト" section に記録
- **存在しない場合**（uzustack 独自の遷移痕、 refactor 残り、 wire-in 漏れ等）: 通常通り True positive として処理、 merge 前修正
- **「uzustack 独自の意図的差分」**（例: voice trigger strip の集約場所、 Claude only enabled、 SKIP に `_upstream` 追加）は upstream に提案不要だが、 divergence の意図を comment / memory / vault に明示しておく

**観察された pattern:**

- /simplify 1 回目 = uzustack 独自の遷移痕（dead `let HOST`、 `as Host` casts 等）→ refactor commit で刈り取り可能
- /simplify 2 回目 = upstream tech debt の遺伝（`getHostConfig` 3 回 lookup、 placeholder regex literal duplicate 等）→ 単独修正不可、 upstream tech debt 観測リストに

---

## /simplify Round 2 で specificity drift 検出時は即時修正 + audit trail、 3 周目を回さない

/simplify を 2 周回す時、 Round 2 で **specificity drift**（原文忠実性の minor drift = 数値・固有表現・具体例の脱落）が検出される場合がある。 **即時修正 + PR body に修正履歴を audit trail として明記** で完了とする。 3 周目を回さない。

**Why:** specificity drift は具体的な行に紐づく、 修正で解消後は再現しない。 3 周目を回す時間より修正 + PR body 記録の方が effective。

**How to apply:**
- /simplify Round 1 = actionable findings 取り扱い、 Round 2 = cross-validation + drift 検出
- Round 2 で drift 検出 → 即時修正 → PR body に「修正 N: <内容>」 を audit trail として記録
- 3 周目を回す代わりに、 修正後 PR body に明記する形で完了

**事例:** plan-design-review 翻訳の Round 2 で 2 件検出: (1) 原文の "Trust is earned at the pixel level." が脱落 → 「信頼は pixel level で獲得される」 として復元、 (2) Review Log preamble の `~/.uzustack/sessions/` / `~/.uzustack/analytics/` 具体例の脱落 → 復元。

---

## /simplify sub-agent rate limit hit 時は main loop direct grep 検証で代替（small 構成 skill）

/simplify で sub-agent rate limit に hit した場合、 small 構成 skill では **main loop で grep + diff direct verification** を行う pattern が並列 sub-agent と等価品質を生む。

**Why:** plan-tune 翻訳で sub-agent rate limit に hit。 main loop で以下を実施: placeholder 数 grep + diff（数値カウント比較）/ JSON field / enum / inline marker grep（英語維持確認）/ 数値 specificity grep（calibration gate threshold 等）/ embedded code structural integrity grep（fs.writeFileSync / JSON.parse 等の出現回数）。 3 axis（quality / reuse / structural integrity）すべて完全 verify が main loop で可能。

**How to apply:**
- skill が **small 構成** = placeholder 最少 + bash + bun -e のみ + 付属 binary 0 件 → main loop direct grep 検証で代替成立
- skill が **大構成** = placeholder 多数 + 付属 doc + multiple sub-systems → sub-agent 並列を待つ
- rate limit に hit した時、 強制 wait より「small 構成判定 → main loop 切替」 を優先

---

## broken link は 5 段階分けで判断する

uzustack の skill 依存関係 / 連鎖を整理するとき、 broken link は単一基準で判定せず、 Inbox ノート [[uzustack の skill アーキテクチャ — 連鎖・確実性・User Sovereignty]] の **5 段階分け** に従う。

| 段階 | 状態 | broken と呼ぶか | 修正主体・タイミング |
|---|---|---|---|
| (i) | promote 参照、 参照先が repo に存在 | 健全 | 修正不要 |
| (ii) | promote 参照、 参照先がスタブ | **broken に含める** | 該当 step で対応 |
| (iii) | hook bash 未配置 / 対応 skill 欠如 | **「未実装」 分類**（broken でない） | preamble インフラ完成と一体（Phase 4） |
| (iv) | preamble bash 依存先未配置 | **インフラ broken**（最優先） | preamble インフラ完成（Phase 4） |
| (v) | 状態保存ファイル未配置 | **最厳格 broken** | 個別 step で分離 |

**Why:** 単一基準（「呼んでも動かない = broken」）で扱うと修正主体・タイミング・優先度が混ざり、 step scope が膨れる。 一次資料（gstack 実装）に立脚した分類を採用することで、 Phase 4 の scope（broken 修正 vs 未実装着手）を別 track に分離できる。

**How to apply:** 依存関係 / 連鎖を整理する時、 各参照点について 5 段階のどれに該当するかを判定。 **(ii) のみが厳密な broken**、 (iii) は「未実装」 として別 framing、 (v) は別 step の責務として分離、 (iv) は preamble インフラ完成タイミングで一括処理。 step ノート / skill 依存マップ / Phase 計画で「broken」 という言葉を使う時は段階番号を併記（例: 「broken link 修正（段階 (ii)）」）して曖昧さを消す。

---

## PR 起票直後に /simplify を必ず 2 回実行する

PR (`gh pr create`) を起票した直後に、 必ず `/simplify` を 2 回実行する。 1 周目で actionable findings を取り扱い、 2 周目で cross-validation + drift 検出を行う。 既存規律「/simplify Round 2 で specificity drift 検出時は即時修正 + audit trail、 3 周目を回さない」 と組み合わせて運用する。

**Why:** PR 起票時点では翻訳作業 / 文書 update の残骸 (= 過剰修正、 dead reference、 specificity drift) が混在する。 1 周目の actionable fix だけで終わらせると drift 検出が漏れる。 2 周回すことで「PR 起票時点の honest snapshot」 を保証する。

**How to apply:**

1. PR 起票直後 (= `gh pr create` の URL 報告と同時) に `/simplify` を 1 回目実行
2. 1 周目 findings を即時修正 + commit
3. `/simplify` を 2 回目実行 (cross-validation + drift 検出)
4. 2 周目 findings (specificity drift 等) を即時修正 + PR body に audit trail 記録
5. 3 周目は回さない (既存規律)

例外: PR が極小 diff (= 1〜2 file、 trivial fix) の場合は 1 周のみで OK と判断。 ただし 1 周で済ませた場合は PR body にその旨記載。

---

## sanitize 作業中、 sanitize 対象 string を audit trail に書かない

sanitize の self-referential leak 防止規律。 機密 path / 固有名を sanitize する作業中、 commit message / PR body / issue body / comment / audit trail に **sanitize 対象 string を直接 list / 引用しない**。

**Why:** sanitize の事実を articulate する際に `(<secret-A>, <secret-B>, ...) 0 件確認` のような形で sanitize 対象を直接列挙すると、 audit trail 自体が leak source になる。 commit message rewrite + force-push でも GitHub は orphan SHA を一定期間保持するため、 PR body / issue body / commit message のいずれかに secret 列挙が残ると公開範囲から完全消去できない。

**How to apply:**

1. **抽象表現で記述**: 具体 path / 固有名を「sensitive path」「絶対 path」「個人固有名」「vault 固有名」 等の抽象語に置換
2. **list 形式の avoid**: `(A, B, C, D) 0 件確認` のような sanitize 対象 list は audit trail 価値が低く leak risk が高い。 「sensitive path / 固有名 sweep grep で 0 件確認」 で十分
3. **placeholder name は記載 OK**: sanitize 後の placeholder 名 (`{LOCAL_VAULT}` 等) は sanitize 対象でないので audit trail に記載可能
4. **draft 段階の checklist**: PR body / commit message / issue body の draft 完成時に sanitize 対象 string を grep。 含むなら抽象表現に置換してから push / 起票
5. **適用対象**: 鍵情報 / API token のような hard secret に限らず、 個人 vault 名 / OS user 名 / 個人 dir 名等の soft secret にも同規律を適用
6. **適用 surface 拡張**: body / commit message / comment に加え、 **branch 名 / PR title / file 名 / squash merge 後の commit message** も同規律。 GitHub の PR head ref name は immutable のため、 branch 命名段階で sanitize 対象 string を含めない設計が必要
