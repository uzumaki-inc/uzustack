# 個人 vault rules — uzustack scope

工藤さん個人の Obsidian vault（個人 vault）に関する作業規律。 cross-edit 方針、 一次情報の所在、 frontmatter / wiki-link 規約。

---

## master plan ノートの所在

uzustack のプロジェクト計画・論点合意・残課題のマスター記録は：

```
{LOCAL_VAULT}/02 Notes/uzustack-notes/uzustack草案.md
```

### `02 Notes/uzustack-notes/` フォルダの位置付け

uzustack 関連の **概念ノート / 設計ノート / アーキテクチャ・ノート** を集約する場所。 step 進捗そのもの（実行管理）は `02 Notes/uzustack-steps/` 配下の step note frontmatter + TaskNotes plugin の view (kanban-uzustack.base) で管理する（uzustack-notes/ には載せない）。

### 関連 folder

| Folder | 役割 |
|---|---|
| `02 Notes/uzustack-notes/` | 概念マップ（uzustack草案 / mind / アーキテクチャ / TaskNotes 運用基盤 / skill 依存マップ等） |
| `02 Notes/uzustack-steps/` | 個別 step note + 未決 / archive item（frontmatter + body の 2 層） |
| `02 Notes/uzustack-issues/` | issue 草案ノート（OSS issue 起票前の草案） |
| `02 Notes/uzustack-template/` | TaskNotes 関連 template（schema / .base file） |

### いつ uzustack草案.md を読むか

- セッション開始時、 「今 Phase はどこ？」 となった時 → **草案ではなく kanban-uzustack.base + step note frontmatter** を見る方が live data
- 設計判断の根拠を確認したい時（合意済み論点 / 概念マップが集約されている）
- Phase の意図 / mind / アーキテクチャを参照したい時

### 派生ドキュメント

- `~/src/uzustack/README.md`（end user 向け）
- `~/src/uzustack/CONTRIBUTING.md`（メンテナー向け）

### 注意

個人 vault は工藤さんの個人 Obsidian vault（git 管理外）にあり、 メンテナー以外は読めない。 OSS contributor 向けの情報は README/CONTRIBUTING に集約する原則。

---

## uzustack草案.md は概念マップ専用、 Phase 進捗 row や実装詳細を配置しない

uzustack草案.md は **概念マップ専用** ノート。 Phase 進捗 row（`| **3.6** | TODO ... |` 形式の table）や実装詳細は **配置してはならない**。

**Why:** Phase 完遂時に inline 加筆すると master plan が肥大化し、 概念マップとしての可読性が落ちる。 Phase 進捗管理の責務は別 layer（kanban-uzustack.base + step note frontmatter）にあり、 草案に持ち込むと責務分離が壊れる。

**How to apply:**
1. 草案を update する時は、 既存 section heading 一覧を `grep '^#' file` で確認し責務軸を把握
2. 加筆候補が既存 section の責務に合わない場合は加筆を **拒否** し別ノート / kanban / step note に委譲
3. 「Phase 進捗 row」「実装詳細」「PR # / commit hash」 等は **uzustack草案 / mind ノートには書かない**

責務分離:
- **Phase 進捗** = step note frontmatter + kanban-uzustack.base view
- **詳細** = step note body
- **判断保留** = 未決 step（mikketsu schema、 `type: uzustack-mikketsu`）
- **規範 (user-scope)** = `~/.claude/CLAUDE.md`
- **規範 (uzustack-scope)** = `<uzustack repo>/.claude/rules/{topic}.md`
- **規範 (OSS contributor 向け)** = CONTRIBUTING.md

step 完遂のような master plan 級 milestone でも、 草案の section 内 inline 加筆ではなく step note の wiki link 経由で参照される設計が正解。

---

## uzustack 統合スプレッドシートの記法規約（uzustack草案.md 内）

`uzustack草案.md` に「未決事項」 の整理 table がある場合、 以下の記法規約に注意：

### Step 列の意味

- **数字（1〜29 等）**: actual step ID、 実装作業
- **`未決`**: active な TODO の懸念（pending decision / verification）
- **`-`**: 解消済みの履歴記録（過去の懸念で resolution 済み）。 **もはや active 未決ではない**

### TODO → DONE 化時の Step 列変更

未決事項が解消されたら（DONE 化時）、 Step 列を **`未決` → `-` に変更**。 同時に進捗列を `TODO` → `DONE` に。 これで「active な未決」 と「過去の解消済み懸念」 が視覚的に分離。

### wiki-link の表記規約

raw markdown の wiki-link:

```
[[未決-NN ファイル名|表示テキスト]]
```

- `未決-NN ファイル名` = ファイルシステム上の sort / lookup 用 identifier
- `表示テキスト` = Obsidian の rendered view で **唯一見える文字列**
- 表示テキストには **`未決-NN` prefix を含めない**（自然な日本語の description）

**重要:** 工藤さんが Obsidian で見ている view には `未決-NN` 表記は **出ない**。 `未決-NN` は Claude が file 操作で使う内部 identifier。

### 会話での参照スタイル

会話文で未決事項を参照する時は、 **description text** を使う：
- ✅ 「hook 機構の発動経路の検証」
- ❌ 「未決-16」（user 視点で意味不明、 raw view 専用）

ファイル操作（read / edit / create）の時のみ `未決-NN` のファイル名を使う。

### なぜこの convention に気づきにくいか

Claude の見ている世界（raw markdown / ファイル名 / frontmatter）と工藤さんの見ている世界（Obsidian rendered view）が **重ならない部分** が大きい。 raw markdown 上の `未決-NN` は Claude には見えるが、 工藤さんには見えない。 同様に rendered view の column 配置の意味（`未決` vs `-`）は Claude には ambiguous だが、 工藤さんには明確。

将来同じ間違いをしないため、 **「工藤さんが table view で見ている表示」 を想像して reference する** 習慣を持つ。

---

## uzustack と 個人 vault は cross-edit してよい

uzustack のセッションから 個人 vault のファイルを absolute path で Read / Edit してよい。 逆方向（個人 vault のセッションから uzustack を触る）も同じく OK。 どちらのディレクトリで claude code を起動するかは、 その時の作業中心がどちらかで自然に決めるだけで、 機械的なルールにしない。

**Why:** 工藤さんの実運用では、 起動 directory と編集対象 directory は必ずしも一致せず、 両方向の cross-edit が日常的になっている。 「Type 2 = 個人 vault でセッション再起動」 のような固いルールは現実と合わない（実例: context-restore 直後に「個人 vault で再起動を」 と促してしまった事故）。

**How to apply:**
- uzustack の Phase 進行で 個人 vault の `uzustack草案.md` を読む / 更新するときは、 その場で absolute path を使って Read / Edit。 「個人 vault でセッションを開き直してください」 と機械的に促さない
- 逆方向も同じ。 ただし master plan の真実源が 個人 vault `uzustack草案.md` である事実は変わらない
- 例外として残すルール: Obsidian で開いているファイルへの Edit は race する（rules `obsidian-notes.md` 参照）。 race は許容して直接 Edit、 closing 依頼や確認はしない

---

## ノート / フォルダ移動は逐次伝えない、 私が grep で連動更新

工藤さんが `個人 vault` 内のフォルダ整理 / ファイル移動を行ったとき、 「○○を△△に移動した」 という明示的な通知は **逐次出さない**。 私（Claude）が **次の作業着手前に grep で path drift を検知 → 即修正** する規律を持つ。

検知方法（私が能動的に走らせる）:

1. **memory 全体 grep**:
   ```
   grep -rn "00 Inbox\|02 Notes/<旧 folder 名>" {HOME}/.claude/projects/{CLAUDE_CODE_PROJECT}/memory/
   ```
   （segregate 後は `~/.claude/CLAUDE.md` + `<uzustack repo>/.claude/rules/` を grep 対象に追加）
2. **集約ノート / step ノート grep**: 絶対 path 形式で書いてあれば修正、 wiki-link 形式（`[[ファイル名]]`）は Obsidian が vault 内検索で resolution するので **修正不要**
3. **検知タイミング**:
   - セッション開始時: master plan を Read する前に grep で path 確認
   - 作業中に「ファイルが見つからない」 系 error が出たら即 grep

**Why:** フォルダ整理は工藤さんが定期的にやる作業。 逐次明示通知は工藤さんの手間が大きい。 私が能動的に grep して追従する方が運用コストが低い。 fold 移動は wiki-link を壊さない（Obsidian 内検索で resolution）が、 私の絶対パス参照は drift する → grep が唯一の検知手段。

**How to apply:**

- **絶対パス参照を rules / docs に書く時の注意**: 可能な限り wiki-link 形式 `[[ファイル名]]`（拡張子抜き）か、 フォルダ名 + ファイル名を分離した記述で書く。 完全 path より drift しにくい
- **drift 検知時の連動更新範囲**: rules / CLAUDE.md / 編集中の step ノート / plan ファイル / 草案。 Obsidian の wiki-link は修正対象外
- **能動 grep を「セッション開始時の儀式」 に組み込む**: context-restore や master plan 読み込みの前に 1 回 grep を流す習慣

---

## step note のタイトルとファイル名は完全一致

`02 Notes/uzustack-steps/` 内の step note について、 個人 vault 内 wiki-link テキスト `[[step-NN <description>]]` と、 対応する step ノート `step-NN <description>.md` のファイル名（拡張子抜き）は **完全一致** させる。

**Why:** Obsidian の wiki-link はファイル名で参照解決する仕組み。 不一致は orphan link / 重複ノート / 検索失敗の原因になる。 step note 間 / 概念ノートからの遷移と Backlinks 機能が壊れる。

**How to apply:**

- **新規 step 起票時**: wiki-link を書いた瞬間に、 同名のファイル `step-NN ....md` を `02 Notes/uzustack-steps/` 配下に作る。 orphan link を残さない
- **タイトル変更時**: wiki-link テキストとファイル名を **同時に更新**（rename + 行修正）。 片方だけ更新は禁止
- **H1 行（`# step-NN: ...`）はファイル名と微妙に違ってよい**: コロン挿入 / `（step-XX retry）` 等の追加情報は H1 にだけ入れる例が既に存在。 ただし wiki-link テキスト = ファイル名（拡張子抜き）は厳密一致が必須
- **ファイル名に path separator 文字（`/` `\`）を使わない**: OS と Obsidian の両方が path separator として解釈し、 意図しないディレクトリが作られる事故あり。 `docs/uzustack` のような path 表現は避け、 `docs` 単体や `docs ディレクトリ` 等で言い換える
- **コロン `:` も避ける**（macOS で `/` 同様、 Finder が `:` を path separator 扱いする bug あり）。 記号として使いたい時は ` — `（emdash）や ` + ` で代替
