# Obsidian notes rules — uzustack scope

Obsidian ノートの操作規律（Edit race / wiki-link 整合 / frontmatter 形式）。 ノート移動 / file rename 時の grep 連動更新方針も含む。

---

## frontmatter date 値は HH:MM 付き形式を使う

frontmatter の date 系 field（`date-created` / `date-modified` / `category_judged_at` 等）は **`YYYY-MM-DD HH:MM` 形式** で書く。 `YYYY-MM-DD` 単独は禁止。

**Why:** Obsidian は frontmatter の `YYYY-MM-DD` 単独値を Daily-note（`YYYY-MM-DD.md`）への auto-link として表示する。 time component が付くとパターンが崩れて auto-link しない。 個人 vault の確立された慣例（着手準備.md / 未決-NN 等）はすべて HH:MM 付き形式。

**How to apply:**
- 新規 date 系 field を frontmatter に追加するときは必ず `YYYY-MM-DD HH:MM` 形式（実時刻 or `00:00`）
- bash heredoc / 一括生成スクリプトで子ノート作成する際も時間付き形式を template に組み込む
- 既存ノートを参考にするときは「手書きノート（着手準備.md / 未決-NN）」 の慣例を一次資料とし、 bulk 生成済ノートを慣例の根拠にしない（生成スクリプト自体が間違っている可能性）
- date 系 field 追加後の動作確認: Obsidian で当該ノートを開き、 frontmatter 値が auto-link 化されていないことを目視確認（または `grep -lE "^(date-...): [0-9]{4}-[0-9]{2}-[0-9]{2}$"` で残存検出）
- **migration script による自動 enforce**: `{LOCAL_VAULT_BACKUP}/audit-and-migrate.py` の `audit` モードが `date_no_hhmm:` を検出、 `migrate --apply` で `00:00` 自動付与

---

## Obsidian race による Edit bug は許容、 closing 依頼しない

個人 vault の Markdown ファイル（特に `uzustack草案.md` のような master plan 系）を Obsidian で開いた状態で Edit すると、 Obsidian 側の auto-link / linter が同時に rewrite して race が起きる可能性がある。 **ただしこの bug は許容する方針が確定している**。

### 行動原則

- **closing 依頼を出さない**（「Obsidian で閉じてもらえますか」 のような依頼は禁止）
- **closing 確認の質問もしない**（「閉じてあるか確認させてください」 も禁止）
- 個人 vault 内のファイル Edit は **race リスクを取って直接実行**
- race が発生して Edit fail / Obsidian 側で上書き / 破損行が発生したら、 その時点で工藤さんに通知して対処（retry or 手動修正案を提示）

**Why:** closing 依頼は工藤さんの作業を妨げる（Obsidian で参照しながら判断したい場面が多い）。 race の確率は中程度で、 毎回 closing を依頼するコストが race 対応コストを上回る。 「答えで今すぐの行動が変わるものだけ確認」 規律にも合致: closing 確認を取っても私は Edit を実行する（行動が変わらない）ので、 確認すべきでない。

**How to apply:**
- 個人 vault のファイル Edit は依頼や確認を挟まずに即実行
- race が起きた時のみ通知、 能動的予防はしない
- 影響を受けやすいファイル: master plan 表系（`uzustack草案.md`）、 frequent linking 系（README草案、 CONTRIBUTING草案、 step ノート）

---

## uzustack草案 の `# 重要` section から embed link が消失する bug

`uzustack草案.md` の `# 重要` section に登録した **embed link** (`![[...]]`) が、 何らかのタイミングで消失する bug が **複数回観測** されている。

embed link が消える bug の正体: `![[<note>]]` は Obsidian の embed syntax（`!` prefix で link 先の内容を inline 展開）。 これにより `# 重要` section に他ノートの内容が展開表示される。 `!` prefix が消える / link 全体が消えると、 embed が解除されて preview から内容が消失。

**Why:** 上記 Edit race の延長と推定される。 同じセッションで別 個人 vault file を Edit すると、 Obsidian の backlink update / preview re-render の副作用で `uzustack草案.md` 周辺の rendering / save も走り、 結果として embed link が壊れる pattern。 個人 vault が **git 管理外** なので、 消失検知も復元も手動依存。

**How to apply:**
- セッション中に **複数 個人 vault file を Edit した後**、 `uzustack草案.md` の `# 重要` section の中身を **念のため確認** する習慣（特に step DONE 化の複数 個人 vault file 編集場面）
- 消失していたら工藤さんに報告 + 復元を即実行（Edit race 規律「依頼や確認を挟まずに即実行、 race は許容」 の延長）
- 復元時は **embed 形式 `![[...]]` を必ず使う**（普通の link `[[...]]` だと内容が展開されない）
- 復元位置は **末尾追加が保守的**（既存 link を動かさない）
- 根本対応候補（工藤さん側の運用判断）: 個人 vault を git init で履歴を持つ、 または Obsidian File Recovery plugin を有効化（Settings > File recovery、 1 分単位の snapshot）
