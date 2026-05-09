# TaskNotes / Kanban rules — uzustack scope

TaskNotes 周辺（kanban-uzustack.base / step note frontmatter / drag-to-reorder 挙動）に関する規律。 一次情報の二層構造、 .base + frontmatter の組合せが真のデータ。

---

## TaskNotes Kanban の drag-to-reorder 挙動 (v4.5.3)

TaskNotes plugin v4.5.3 (`{LOCAL_VAULT}/.obsidian/plugins/tasknotes/`) の Kanban drag 仕様。 出典: main.js line 353-355 の embedded changelog（issue #1619 / #386 / #621）。

### カラム間 drag（inter-column）
- groupBy 対象 property を frontmatter に persist
- by-cluster view → `cluster` 値が更新
- by-status view → `status` 値が更新
- 即時視覚反映（plugin が re-render）

### カラム内 drag（intra-column）
- `tasknotes_manual_order` 数値を frontmatter に persist
- 周辺 card の order 値も振り直し
- **発動条件**: `.base` の `sort:` array に `tasknotes_manual_order` が含まれる場合のみ視覚反映
- sort key に未含なら drag 自体は起きるが refresh で sort rule に従って再ソート、 見た目が戻る

### 書き込み責務
- TaskNotes plugin (main.js) が drop event を intercept → Obsidian Vault API 経由で .md frontmatter を edit
- Claude / `.base` file は drag 時に touch されない
- Claude の body 部参照禁止規律と直交（plugin が書く ≠ Claude が読む）

### How to apply
- kanban で手動 priority を効かせたい → `.base` の `sort:` 第 1 位に `property: tasknotes_manual_order, direction: ASC` を入れる
- 自動 sort のみで運用したい → sort key に含めない（intra-column drag は no-op）
- カラム間 drag は sort key 設定に関係なく動く（groupBy property 更新は plugin core 機能）

### 参照
- main.js v4.5.3 内 string `sortOrder:"tasknotes_manual_order"` で property mapping 確認
- 設定: TaskNotes → General → Create Default Files で built-in `.base` template 再生成

---

## kanban の真のデータは .base sort rule + step note frontmatter の組合せ

kanban の現状を確認したいときは **2 つの source を組合せて読む**：

1. **`{LOCAL_VAULT}/00 Inbox/TaskNotes/Views/kanban-uzustack.base`** — sort / filter / groupBy / formulas（view 規則）
2. **`{LOCAL_VAULT}/02 Notes/uzustack-steps/*.md` の frontmatter** — cluster / status / phase / step / mikketsu_id / `tasknotes_manual_order`（live data、 plugin が auto-edit）

**Why:** 「rule + data の組合せが真のデータ」。 `.base` には sort rule のみで実 data がない。 frontmatter（plugin が live edit する layer）を併読しないと kanban 順序を再構築できない。 `.base` + frontmatter の併用が「真のデータ」 の正確な解釈。

**How to apply:**
- **sort rule の理解**: `.base` の `sort` / `filter` / `groupBy` / `formulas` section を Read
- **kanban 順序の autonomous 再構築**: 下記「autonomous 検知 procedure」 を実行
- **frontmatter access の境界**: YAML 部のみ抽出（`awk '/^---$/{n++; if(n==2) exit} {print}'` 等）、 body 部は読まない
- **step 詳細 / narrative**: 工藤さんに直接尋ねる
- 例外: 工藤さんから明示的に「step-X の本文を読んで」 と path 指示があれば body 単発 read 可

---

## kanban 状態は frontmatter + .base sort rule で autonomous 検知可能

工藤さんが Obsidian Kanban で手動操作（カラム間 drag、 カラム内 drag、 frontmatter 直接編集）した state は frontmatter に persist される。 Claude は **frontmatter access が許可されていれば autonomous 検知が可能**。

**Why:** TaskNotes plugin が cluster / status / `tasknotes_manual_order` を live edit していて frontmatter が **fresh data layer**。 `.base` の sort rule（filter / groupBy / sort）と組み合わせれば plugin と同じ kanban 順序を CLI 側で計算できる。

### autonomous 検知 procedure

1. **対象 cluster の frontmatter を集計**:
   ```bash
   cd "{LOCAL_VAULT}/02 Notes/uzustack-steps"
   for f in *.md; do
     fm=$(awk '/^---$/{n++; if(n==2) exit} {print}' "$f")
     cl=$(echo "$fm" | awk -F': ' '/^cluster:/ {print $2}')
     if [ "$cl" = "Phase 4 絆を結ぶ" ]; then
       st=$(echo "$fm" | awk -F': ' '/^status:/ {print $2}')
       sp=$(echo "$fm" | awk -F': ' '/^step:/ {print $2}')
       mid=$(echo "$fm" | awk -F': ' '/^mikketsu_id:/ {print $2}')
       mo=$(echo "$fm" | awk -F': ' '/^tasknotes_manual_order:/ {print $2}')
       echo "status=$st | step=$sp | mid=$mid | manual_order=$mo | file=$f"
     fi
   done
   ```
2. **`.base` の sort rule を読む**: `{LOCAL_VAULT}/00 Inbox/TaskNotes/Views/kanban-uzustack.base`
3. **sort 適用**（current rule = `tasknotes_manual_order ASC → formula.statusPriority ASC → phase ASC → step ASC → mikketsu_id ASC`）：
   - `tasknotes_manual_order` 値あり card が先頭、 null は次の key へ fallback
   - statusPriority: DOING=1 / TODO=2 / DONE=3
   - step ASC は文字列 lexicographic、 日本語（"未決" 等）は ASCII の後ろ
4. **filter 適用**: `type == uzustack-step OR uzustack-mikketsu`、 `status != ABANDONED AND != SUPERSEDED`

### 一致確認方法（要 screenshot のとき）

- 工藤さんが「予想と違う」 と言ったら screenshot を依頼、 frontmatter 集計結果と突合
- frontmatter は plugin の vault save 後に反映される、 drag 直後 / 大量変更直後は数秒待って再 grep する

---

## uzustack-steps step note の参照規律 — 二層構造

`02 Notes/uzustack-steps/` 配下の step note は **frontmatter / body の二層構造** を意識して扱う:

- **frontmatter（`---` で挟まれた YAML 部）**: TaskNotes plugin が drag / status 変更ごとに live edit する **fresh data**。 読んでよい
- **body 部（`---` 以下の markdown 本文）**: 工藤さんが note 化したときの narrative / メモ。 追記頻度が落ちて **stale 化**。 読まない

**Why:** TaskNotes plugin が frontmatter（cluster / status / `tasknotes_manual_order` 等）を auto-managed live data として保持。 frontmatter は live、 body は stale という二層解釈で「frontmatter は読んでよい / body は読まない」 が両立。

**How to apply:**
- **frontmatter 読み取り（許可）**:
  - `awk '/^---$/{n++; if(n==2) exit} {print}' <file>` で YAML 部のみ抽出
  - `grep -l "tasknotes_manual_order" *.md` で drag された card を特定
  - kanban 状態を autonomous に再構築するときは frontmatter + `.base` sort rule の組合せで計算
- **body 部読み取り（禁止）**:
  - `Read` で全文読みは body も含むので避ける、 frontmatter のみ抽出する形で
  - step 詳細 / narrative が必要なら工藤さんに直接尋ねる
- **例外**: 工藤さんから明示的に「step-X の本文を読んで」 と指示があった場合のみ body 単発 read 可
- **context 依存規律**: 上記は live status 把握の文脈規律。 duplicate check / project 決定の root cause を辿る等、 別文脈では body 含む全体を読むことが正解の場合もある（segregate 作業時の事例）
