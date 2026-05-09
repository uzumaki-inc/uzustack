# Workflow rules — uzustack scope

OSS 運用 flow（issue / branch / PR）、 step 着手判断、 PR body checkbox 同期、 cluster 完了時の規範集約タイミング。

---

## uzustack の OSS 運用フロー（issue + feature ブランチ）

uzustack の step / 機能着手時は以下のフローを **デフォルト** とする：

1. **issue の草案は 個人 vault（Obsidian）で熟成** してから、 外向けに sanitize した版を `gh issue create` で起票
2. **feature ブランチを切ってから着手**（main に直 push / 直コミットしない）
3. PR description には `Closes #N` を入れて issue とリンクさせる
4. **PR merge 直前に issue body の task list checkbox を `[x]` に更新**（持ち越し項目は `[ ]` のまま、 別セクションで明記）
5. **PR merge 後に 個人 vault 側の step note と kanban / 概念ノートを同期**

**Why:** 個人メンテナー OSS なので、 個人 vault に詳細議論、 GitHub issue に外向け要約、 と二段構えにすることで個人情報・属人情報の流出を防ぐ。 `Closes #N` は issue を CLOSED にするが、 body 内の `- [ ] xxx` は GitHub が自動同期しない、 完了状態が外部から一目で分からなくなる。

**How to apply:**
- 新しい step / 機能: 私が外向け issue 本文を draft → 工藤さん承認 → 起票 → **【ここで stop、 工藤さん合図待ち】** → feature/<name> 切る → 実装 → PR
- **起票時の sidebar 設定**: `gh issue create --assignee @me --milestone "Phase N"`。 Phase 単位で milestone を 1 個作成、 以降の起票は milestone 名を指定するだけで auto 紐付け。 **label / project / type は使わない**（必要最低限主義）
- **issue 起票後は一旦 stop**: 起票完了報告で 1 度終わり、 工藤さんが issue 内容を確認・調整するタイミングを取れるようにする。 feature ブランチ作成や実装に自動的に進まない
- issue 本文には 個人 vault のパス・固有語彙を持ち込まない
- 「main で直接作業して」 と工藤さんが明示した時のみ、 feature ブランチを省略

---

## step 着手時の issue 化判断軸

uzustack の step を起票するとき、 GitHub issue 化するか note 完結にするかは **「成果物が OSS user / contributor から見て価値あるか否か」** で判断する。 「step 着手 = issue 起票」 を機械的に適用しない。

判断軸:

- **issue 化**: OSS user / contributor 向けに価値ある artifact（README 追記、 CONTRIBUTING 追記、 root file 配置、 動作保証情報、 機能追加など）が repo に commit される step、 または個人 vault 外に成果物が漏れる step
- **note 完結**: 成果物が Obsidian ノートに閉じる、 または設計検討 / 個人作業ログ性格が強い step。 repo 変更があっても、 それが OSS 観点で雑音（個人作業のメモ転記、 内部分析ノートの参照テーブルなど）の場合は note 寄り

**Why:** 「step 着手 = issue 起票」 を機械的に適用すると、 個人作業ログや内部分析ノートまで OSS 公開され雑音になる。 判断軸を「価値」 にすることで、 OSS リポジトリの issue tracker が「ユーザー / contributor が読んで嬉しい情報」 だけに保たれる。

**How to apply:** 新 step 起票時、 まず成果物が OSS user / contributor から見て価値あるか自問。 価値ありなら issue 化 + PR で Closes #N、 価値なしなら note 完結（issue 起票なし、 frontmatter `issue:` 空欄、 Obsidian ノートで進捗管理のみ）。 境界判定で迷ったら工藤さんに確認、 機械的判断より対話で確認する規律を優先。

---

## scope 縮小より機械化を優先（Phase 3 規律の一般原則）

scope を絞る判断（「将来 X する予定だから今は対象外」「Claude Code only だから他 host 処理を外す」「現時点では不要」 等）は、 その場では合理的に見えるが、 **コミュニケーションコスト + 将来の再判断コスト** を二重に生む。 **判断を 1 度に集中させ、 機械的に実装できる範囲を最大化する** 方を優先する。

**Why:** 工藤さんの開発リソースで boundary は **判断時間 / レビュー時間**。 AI による翻訳・実装の限界費用はほぼゼロなので、 judgment を減らしてコード量増を許容するほうが wall-clock の開発速度は上がる。 後送り判断は将来の同じ議論を再発生させ、 二重コストになる。

**How to apply:**
- scope 縮小の提案を出す前に、 「これは judgment 1 回で吸収できないか / 機械翻訳できないか」 を先に検討
- 「Claude Code only」「将来 X する予定」「現時点では不要」「いつか必要になったら」 のような **絞り込みの正当化** が出てきたら、 多くの場合 **後送り判断のサイン**。 完璧複製で吸収する形に転換できないか考える
- レイヤー分離: end user 向け制約（「Claude Code only で公式 support」 等）と runtime 内部の構造は **レイヤーが違う**。 runtime は完璧複製、 activate のレイヤーで絞る、 の二層構造で両立する
- 例外: uzustack 固有の voice / 文字列置換のような **本質的に意味が違う部分** は完璧複製ではなく **機械置換ルール表** で吸収（これも「機械化」 の一形態）
- 例外条件: 本当に **機械翻訳できない判断**（プラットフォーム廃止、 ライセンス衝突等）の場合のみ scope 縮小が正当。 それ以外はデフォルト「完璧複製」

---

## plan-ceo-review は uzustack 翻訳済 asset の再利用可能性を必ず check

skill 翻訳化を扱う plan-ceo-review session では、 design space exploration の 1 step として **「`bin/` 配下の uzustack 翻訳済 asset (bin / lib 等) の再利用可能性」** を必ず明示的に check し、 翻訳方針の選択肢として提示する。

**Why:** Phase 3.6 step-81 plan-ceo-review で `/learn` skill 翻訳方針を確定した時、 `~/.claude/skills/uzustack/bin/uzustack-learnings-{log,search}` が Phase 3 翻訳期に既に翻訳済 + UZUSTACK_HOME 直対応であることが発覚し、 plan を rear-update して uzustack-bin 直呼び方式に切替（split state ゼロ + injection sanitization 無料取得）。 plan-ceo-review が現状 skill が呼ぶ bin (`_upstream/gstack/bin/`) の grep のみで「翻訳済 uzustack asset の再利用可能性」 を design space exploration から落としていたことが root cause。

**How to apply:** plan-ceo-review session で skill 翻訳化を扱う時、 Section 0 (scope challenge) または Section 1 (Architecture) の中で次の 3 step を必ず実行：
1. skill が呼ぶ全 bin / lib を `_upstream/gstack/bin/`（または該当 path）で grep 列挙
2. 同 bin 名 prefix を `uzustack-` に置換した名前で `{PROJECT_REPO}/bin/`（または該当 path）を ls して翻訳済 asset の有無を check
3. 翻訳済 asset がある場合は「gstack-bin そのまま」 vs 「uzustack-bin 直呼び」 を AskUserQuestion で必ず選択肢として user に提示

Phase 4 以降の cluster 化（freeze / unfreeze / guard / 他）でも同 step を skip しない。

---

## PR / issue body の checkbox は merge / close 前に tick する

**重要 (必ず実行): issue / PR を close する前に、 必ず body 内 checkbox (Acceptance criteria / Test plan) を tick + 補足する。 issue close = タスク close を一体運用とする。**

PR body の Test plan section や issue body の Acceptance criteria section に書いた `- [ ]` checkbox は、 起票時点では未チェック。 merge / close 前に `gh pr edit` / `gh issue edit` で tick + 補足を書かないと、 merge / close 済 PR / issue の audit trail が永続的に古い state で固定される。

**Why:** PR / issue description は将来の Phase 完了レビュー / upstream rebase / 再発時の reference として繰り返し参照される。 checkbox が空のまま残ると「やったかどうか」 が不明になり、 再確認コスト発生。 PR body 限定の規律では cover できない領域があり、 issue body 側でも独立に同期が必要。

**How to apply:**

1. **PR body**: merge 前に `gh pr edit <PR> --body "$(cat ...)"` で各 `- [ ]` → `- [x]` + findings 要約併記。 例: `- [ ] /simplify を 2 周` → `- [x] /simplify を 2 周完了（fix N 件 / skip M 件 / praise K 件）`
2. **Issue body**: close 前に `gh issue edit <issue> --body "$(cat ...)"` で acceptance criteria の各 checkbox tick。 PR で `Closes #N` を使う場合、 PR merge で issue は自動 close されるが、 **その直前に issue body も update が必要**（順序: 先に issue update → 次に PR merge、 自動 close で確定）
3. **方針 revise で取り消した条件**: `~~取り消し条件~~` 取り消し線 + 「方針 revise で取り消し（理由）」 注記を併記。 単に削除すると「なぜなくなったか」 が history で追えない
4. **検査タイミング**: `gh pr merge` / `gh issue close` 直前に必ず `gh pr view <PR> --json body` / `gh issue view <issue> --json body` で checkbox state を確認、 空が残っていたら tick 後に merge / close

merge / close 直後に「ユーザー指摘で気付く」 では retrofit コストが発生する。 「PR / issue close は audit trail finalize step」 として workflow に組み込む。

---

## step DONE 化時のチェックリスト同期

step DONE 化時、 frontmatter `status: TODO → DONE` だけでなく、 子ノート本文の「## やること」 セクションのチェックリスト（`- [ ]` / `- [x]`）も実態に合わせて更新する。

**How to apply:** step DONE 化作業のテンプレートとして以下 3 点をすべて実施:

1. 子ノートの frontmatter: `status: TODO → DONE` + `date-modified` 更新
2. 子ノートの「## やること」 セクションのチェックリストを実態反映:
   - 対応済み: `- [ ]` → `- [x]`
   - スコープ外になった項目は `- [ ]` のまま、 行末に「（step-NN に分離、 step-NN スコープ外）」 のような注記を追加
   - 部分対応の項目は `- [x]` にして行末に「（〜の範囲のみ確定、 続きは step-NN で扱う）」 のような注記
3. 子ノート末尾に「## 結果（YYYY-MM-DD 完了）」 セクション追記

kanban-uzustack.base + step note frontmatter は frontmatter 更新で auto 同期される（plugin が live edit）。

---

## 規範は cluster 完了直後に CONTRIBUTING へ集約

cluster 進行中は規範が PR description / memory / step ノート / issue body に分散して動いている。 **cluster 完了で規範が固まった直後（次 cluster 着手前）に CONTRIBUTING.md へ集約** する判断を差し込む。

**Why:** 規範が動いている最中の文書化は update 競合を生む。 cluster 完了で固まった直後の集約が、 最小コスト + 次 cluster の参照性最大化になる。 次 cluster の作業中に「CONTRIBUTING を見るだけで参照が完結する」 状態を作る方が、 規範を「PR description を漁る」 運用より速い。 cluster end 待ちで後送りすると参照性が上がらない。

**事例:** step-37 完了時、 cluster B（bin 翻訳、 step-35-39）の voice 規約 v1 集約を step-42（Phase 3 完了判定）から step-39 完了タイミング（cluster B 終了直後）に前倒した。

**How to apply:** 「PR description が事実上の正典で、 後で CONTRIBUTING に統合する」 型の文書化進化が発生したら、 cluster 完了直後（次 cluster 着手前）に集約タスクを差し込む候補。 step ノートの「CONTRIBUTING 統合」 section + step note frontmatter の status 反映で先行履行を申し送る。

---

## 守破離の守完走判断 — strict reading reorient を builder 学習軸で reject

office-hours startup mode 等で「translation overkill / strict reading + 第三者 user」 系の reorient (shim path) 提案を premise 全 agree 後でも reject してよい。

**Why:** 工藤さんは UZUMAKI CEO で uzustack の真の user は本人 (learning + dogfooding)、 第三者は将来 option (離以降)。 早期に user 摩擦最適化に振ると守の完走 = 学習機会を losing する。 守を carbon copy してもいずれ離で独自軸が立ち、 そのとき守期間に得た深い理解が activation energy を最小化する。 startup mode の rigor (premise / wedge / Demand evidence) は valid だが、 optimization target が「user 体験」 ではなく「builder 学習投資」 のときは結論が反転する。

**How to apply:**
- office-hours / plan-ceo-review / plan-eng-review 等で「translation overkill」「shim で十分」「strict reading」「現方針 reorient」 系の提案が出たら、 まず builder の学習軸で評価。 user 体験軸 / 効率軸 / コスト軸の rigor を否定するのではなく、 別軸 (学習投資 / 守完走 / 離での独自価値) を pari passu で評価
- design doc は破棄せず保管（Status: CLOSED_NOT_ADOPTED 等で downstream skill に「採用されなかった」 と読ませる）。 離以降のフェーズで再訪 option として残す
- 守期間中は徹底翻訳 + voice 翻案 + 機構複製 + bin 全数翻訳 路線を継続。 これは「scope 縮小より機械化を優先」 規律と整合し、 reorient と衝突しない
