---
name: retro
type: translated
preamble-tier: 2
version: 2.0.0
description: |
  週次のエンジニアリング振り返り。コミット履歴、作業パターン、コード品質メトリクスを分析し、
  履歴と傾向を継続的にトラッキングする。チーム対応：個人ごとの貢献を称賛と成長領域に分けて
  ブレイクダウンする。「週次レトロ」「engineering retrospective」「今週何を出した」と
  要求されたときに使用する。週末や sprint 末に積極的に提案する。
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - AskUserQuestion
triggers:
  - 週次レトロ
  - engineering retrospective
  - 今週何を出した
  - 週次振り返り
  - エンジニアリングの振り返り
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->





# /retro — 週次エンジニアリング振り返り

コミット履歴、作業パターン、コード品質メトリクスを分析し、包括的なエンジニアリング振り返りを生成する。チーム対応：コマンドを実行したユーザーを識別し、個人ごとの称賛と成長機会を伴って全 contributor を分析する。シニア IC / CTO レベルの builder が Claude Code を Force multiplier として使うことを想定して設計されている。

## ユーザー起動

ユーザーが `/retro` と入力したら、本 skill を実行する。

## 引数

- `/retro` — デフォルト：直近 7 日
- `/retro 24h` — 直近 24 時間
- `/retro 14d` — 直近 14 日
- `/retro 30d` — 直近 30 日
- `/retro compare` — 現在の窓と直前の同サイズ窓を比較
- `/retro compare 14d` — 明示的な窓で比較



## 手順

引数を解析して時間窓を決定する。引数なしならデフォルトで 7 日。すべての時刻は **ユーザーのローカルタイムゾーン** で報告する（システムデフォルトを使用、`TZ` を設定しない）。

**0 時起点の窓**：日（`d`）と週（`w`）の単位では、相対文字列ではなく **絶対日付**をローカル 0 時起点で計算する。例えば今日が 2026-03-18 で窓が 7 日なら、開始日は 2026-03-11。git log クエリには `--since="2026-03-11T00:00:00"` を使う ― 明示的な `T00:00:00` サフィックスで git が 0 時起点になる。これがないと git は現在の壁時計時刻を使う（例：23 時に `--since="2026-03-11"` だと 23 時起点、0 時起点ではない）。週単位の場合は 7 倍して日数にする（`2w` = 14 日前）。時間（`h`）単位では `--since="N hours ago"` を使う ― 1 日未満の窓では 0 時起点は適用しない。

**引数バリデーション**：引数が「数字 + `d`/`h`/`w`」、または `compare`（オプションで窓指定）のいずれにも合致しない場合、以下の usage を表示して停止する：
```
Usage: /retro [window | compare]
  /retro              — 直近 7 日（デフォルト）
  /retro 24h          — 直近 24 時間
  /retro 14d          — 直近 14 日
  /retro 30d          — 直近 30 日
  /retro compare      — 現在の期間と直前の期間を比較
  /retro compare 14d  — 明示的な窓で比較
```



### Step 1：生データの収集

まず origin を fetch して現在のユーザーを識別する：
```bash
git fetch origin <default> --quiet
# retro を実行している人物を特定
git config user.name
git config user.email
```

`git config user.name` が返す名前が **「あなた」** ― この retro を読んでいる人。それ以外の author はチームメイト。これを使って narrative を方向付ける：「あなたの」コミット vs チームメイトの貢献。

以下の git コマンドをすべて並列で実行する（互いに独立）：

```bash
# 1. 窓内の全コミット：タイムスタンプ、subject、hash、AUTHOR、変更ファイル、insertions、deletions
git log origin/<default> --since="<window>" --format="%H|%aN|%ae|%ai|%s" --shortstat

# 2. コミットごとの test vs production LOC 内訳（author 付き）
#    各コミットブロックは COMMIT:<hash>|<author> で始まり、numstat 行が続く
#    test ファイル（test/|spec/|__tests__/ にマッチ）と production ファイルを分離する
git log origin/<default> --since="<window>" --format="COMMIT:%H|%aN" --numstat

# 3. セッション検出と時間別分布のためのコミットタイムスタンプ（author 付き）
git log origin/<default> --since="<window>" --format="%at|%aN|%ai|%s" | sort -n

# 4. 最も頻繁に変更されたファイル（ホットスポット分析）
git log origin/<default> --since="<window>" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn

# 5. コミットメッセージから PR/MR 番号（GitHub #NNN、GitLab !NNN）
git log origin/<default> --since="<window>" --format="%s" | grep -oE '[#!][0-9]+' | sort -t'#' -k1 | uniq

# 6. author ごとのファイルホットスポット（誰が何を触っているか）
git log origin/<default> --since="<window>" --format="AUTHOR:%aN" --name-only

# 7. author ごとのコミット数（簡易サマリ）
git shortlog origin/<default> --since="<window>" -sn --no-merges

# 8. TODOS.md backlog（あれば）
cat TODOS.md 2>/dev/null || true

# 9. test ファイル数
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' 2>/dev/null | grep -v node_modules | wc -l

# 10. 窓内の regression test コミット
git log origin/<default> --since="<window>" --oneline --grep="test(qa):" --grep="test(design):" --grep="test: coverage"

# 11. 窓内で変更された test ファイル
git log origin/<default> --since="<window>" --format="" --name-only | grep -E '\.(test|spec)\.' | sort -u | wc -l
```

### Step 2：メトリクスの算出

以下のメトリクスを算出してサマリ表として提示する：

| メトリクス | 値 |
|--------|-------|
| **出荷した機能数**（CHANGELOG + merged PR タイトルから） | N |
| main へのコミット数 | N |
| 重み付きコミット数（コミット数 × 平均ファイル変更数、コミットあたり 20 で cap） | N |
| Contributor 数 | N |
| Merged PR 数 | N |
| **追加された Logical SLOC**（空行・コメント以外 ― コードボリュームの主要メトリクス） | N |
| Raw LOC: insertions | N |
| Raw LOC: deletions | N |
| Raw LOC: net | N |
| Test LOC（insertions） | N |
| Test LOC 比率 | N% |
| バージョン範囲 | vX.Y.Z.W → vX.Y.Z.W |
| Active な日数 | N |
| 検出されたセッション数 | N |
| Avg raw LOC/session-hour | N |
| Test Health | N total tests · M added this period · K regression tests |

**メトリクス順の根拠（V1）**：出荷した機能数を先頭に ― ユーザーが何を得たか。コミット数と重み付きコミット数は「出荷意図」を反映する。追加された Logical SLOC は実際の新機能を反映する。Raw LOC は AI が膨らませがちなのでコンテキストに格下げ。良い修正の 10 行は scaffold の 1 万行と「出荷していない」ことにはならない。

直下に **author 別 leaderboard** を表示する：

```
Contributor         Commits   +/-          Top area
You (garry)              32   +2400/-300   browse/
alice                    12   +800/-150    app/services/
bob                       3   +120/-40     tests/
```

コミット数降順でソート。`git config user.name` から取得した現在のユーザーは常に先頭、「You (name)」とラベル付け。

**Backlog Health（TODOS.md があれば）**：`TODOS.md` を読む（Step 1 のコマンド 8 で取得）。以下を算出：
- Open TODO 総数（`## Completed` セクションの項目を除外）
- P0/P1 数（critical / urgent 項目）
- P2 数（important 項目）
- 期間内に完了した項目（Completed セクション内で retro 窓内の日付を持つもの）
- 期間内に追加された項目（窓内で TODOS.md を変更したコミットを git log でクロスリファレンス）

メトリクス表に含める：
```
| Backlog Health | N open (X P0/P1, Y P2) · Z completed this period |
```

`TODOS.md` が存在しなければ Backlog Health 行をスキップ。

### Step 3：コミット時間分布

ローカルタイムでの時間別ヒストグラムを bar chart で表示：

```
Hour  Commits  ████████████████
 00:    4      ████
 07:    5      █████
 ...
```

以下を識別して言及する：
- ピークの時間帯
- 死んでいる時間帯
- パターンが二峰性（朝 / 夕方）か継続的か
- 深夜のコーディングクラスタ（22 時以降）

### Step 4：作業セッションの検出

連続するコミット間の **45 分ギャップ**を閾値としてセッションを検出する。セッションごとに以下を報告：
- 開始 / 終了時刻
- コミット数
- 分単位の duration

セッションを分類：
- **ディープセッション**（50 分以上）
- **ミディアムセッション**（20-50 分）
- **マイクロセッション**（20 分未満、典型的にはシングルコミットの fire-and-forget）

以下を算出：
- アクティブ・コーディング合計時間（セッションの所要時間合計）
- 平均セッション長
- アクティブ時間あたりの LOC

### Step 5：コミットタイプの内訳

conventional commit prefix（feat/fix/refactor/test/chore/docs）で分類。パーセンテージ bar として表示：

```
feat:     20  (40%)  ████████████████████
fix:      27  (54%)  ███████████████████████████
refactor:  2  ( 4%)  ██
```

fix 比率が 50% を超えたら警告 ― これは「速く出して速く直す」パターンを示し、レビューのギャップを示唆する可能性がある。

### Step 6：ホットスポット分析

最も変更されたファイル top 10 を表示。以下を flag：
- 5 回以上変更されたファイル（churn ホットスポット）
- ホットスポットリストに含まれる test ファイル vs production ファイル
- VERSION/CHANGELOG の頻度（バージョン規律の指標）

### Step 7：PR サイズ分布

コミット diff から PR サイズを推定して bucket に分ける：
- **Small**（100 LOC 未満）
- **Medium**（100-500 LOC）
- **Large**（500-1500 LOC）
- **XL**（1500 LOC 以上）

### Step 8：Focus Score + Ship of the Week

**Focus score**：最も変更された top-level ディレクトリ（例：`app/services/`、`app/views/`）に触れたコミットの割合を算出する。スコアが高いほど深い集中作業。低いほど散漫なコンテキストスイッチ。「Focus score: 62% (app/services/)」のように報告する。

**Ship of the week**：窓内で最も LOC が大きい単一の PR を自動識別する。以下をハイライト：
- PR 番号と title
- 変更 LOC
- なぜ重要か（コミットメッセージと触ったファイルから推測）

### Step 9：チームメンバー分析

各 contributor（現在のユーザー含む）について以下を算出：

1. **コミット数と LOC** ― 総コミット数、insertions、deletions、net LOC
2. **フォーカス領域** ― 最も触ったディレクトリ / ファイル（top 3）
3. **コミットタイプの mix** ― 個人の feat/fix/refactor/test 内訳
4. **セッションパターン** ― いつコーディングするか（個人のピーク時間）、セッション数
5. **テスト規律** ― 個人の test LOC 比率
6. **最大の出荷物** ― 窓内で最もインパクトの大きい単一コミット or PR

**現在のユーザー（「You」）について**：このセクションは最も詳細に扱う。ソロ retro の詳細をすべて含む ― セッション分析、時間パターン、focus スコア。一人称で表現する：「あなたのピーク時間は ...」「あなたの最大の出荷物は ...」。

**各チームメイトについて**：何に取り組んだか、そのパターンを 2-3 文で書く。続いて：

- **称賛**（具体的に 1-2 個）：実際のコミットに anchor する。「素晴らしい」ではなく ― 何が良かったかを正確に言う。例：「auth middleware のリライト全体を集中した 3 セッションで出荷、テストカバレッジ 45%」「すべての PR が 200 LOC 以下 ― 規律ある分解」
- **成長機会**（具体的に 1 個）：批判ではなくレベルアップの提案として表現する。実データに anchor。例：「今週の test 比率が 12% だった ― payment モジュールが複雑化する前にテストカバレッジを追加すれば効果が出る」「同じファイルの 5 つの fix コミットは、元の PR がもう 1 度のレビュー pass を必要としていたことを示唆する」

**Contributor が一人だけの場合（ソロ repo）**：チーム内訳をスキップして従来通り進める ― retro は個人的なものになる。

**Co-Authored-By trailer がある場合**：コミットメッセージ内の `Co-Authored-By:` 行を解析する。primary author と並んで該当 author をコミットの credit に含める。AI co-author（例：`noreply@anthropic.com`）は note するが、チームメンバーには含めない ― 代わりに「AI 支援コミット」を別メトリクスとしてトラッキング。





### Step 10：Week-over-Week トレンド（窓 >= 14d の場合）

時間窓が 14 日以上なら週次 bucket に分割してトレンドを表示：
- 週ごとのコミット数（合計と author 別）
- 週ごとの LOC
- 週ごとの test 比率
- 週ごとの fix 比率
- 週ごとのセッション数

### Step 11：ストリークトラッキング

origin/<default> に少なくとも 1 コミットがある連続日数を、今日から逆算してカウントする。チームストリークと個人ストリークの両方をトラッキング：

```bash
# チームストリーク：すべてのユニークなコミット日（ローカルタイム）― ハードな cutoff なし
git log origin/<default> --format="%ad" --date=format:"%Y-%m-%d" | sort -u

# 個人ストリーク：現在のユーザーのコミットのみ
git log origin/<default> --author="<user_name>" --format="%ad" --date=format:"%Y-%m-%d" | sort -u
```

今日から逆算 ― 連続して 1 つ以上のコミットがある日が何日続いているか。これは全履歴に対して問い合わせるので、どの長さのストリークも正確に報告される。両方を表示：
- 「Team shipping streak: 47 consecutive days」
- 「Your shipping streak: 32 consecutive days」

### Step 12：履歴の読込みと比較

新スナップショットを保存する前に、過去の retro 履歴を確認する：

```bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
ls -t .context/retros/*.json 2>/dev/null
```

**過去の retro が存在する場合**：Read tool で最新版を読み込む。主要メトリクスの delta を算出して **Trends vs Last Retro** セクションを含める：
```
                    Last        Now         Delta
Test ratio:         22%    →    41%         ↑19pp
Sessions:           10     →    14          ↑4
LOC/hour:           200    →    350         ↑75%
Fix ratio:          54%    →    30%         ↓24pp (improving)
Commits:            32     →    47          ↑47%
Deep sessions:      3      →    5           ↑2
```

**過去の retro が存在しない場合**：比較セクションをスキップして「First retro recorded — run again next week to see trends.」を追記する。

### Step 13：Retro 履歴の保存

すべてのメトリクス（ストリーク含む）を算出し、過去履歴を比較用に読み込んだ後、JSON snapshot を保存する：

```bash
mkdir -p .context/retros
```

今日の次の sequence 番号を決定する（`$(date +%Y-%m-%d)` を実際の日付で置換）：
```bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
# 今日の既存 retro 数を数えて次の sequence 番号を取得
today=$(date +%Y-%m-%d)
existing=$(ls .context/retros/${today}-*.json 2>/dev/null | wc -l | tr -d ' ')
next=$((existing + 1))
# .context/retros/${today}-${next}.json として保存
```

Write tool で以下のスキーマで JSON ファイルを保存する：
```json
{
  "date": "2026-03-08",
  "window": "7d",
  "metrics": {
    "commits": 47,
    "contributors": 3,
    "prs_merged": 12,
    "insertions": 3200,
    "deletions": 800,
    "net_loc": 2400,
    "test_loc": 1300,
    "test_ratio": 0.41,
    "active_days": 6,
    "sessions": 14,
    "deep_sessions": 5,
    "avg_session_minutes": 42,
    "loc_per_session_hour": 350,
    "feat_pct": 0.40,
    "fix_pct": 0.30,
    "peak_hour": 22,
    "ai_assisted_commits": 32
  },
  "authors": {
    "Garry Tan": { "commits": 32, "insertions": 2400, "deletions": 300, "test_ratio": 0.41, "top_area": "browse/" },
    "Alice": { "commits": 12, "insertions": 800, "deletions": 150, "test_ratio": 0.35, "top_area": "app/services/" }
  },
  "version_range": ["1.16.0.0", "1.16.1.0"],
  "streak_days": 47,
  "tweetable": "Week of Mar 1: 47 commits (3 contributors), 3.2k LOC, 38% tests, 12 PRs, peak: 10pm"
}
```

**Note**：`backlog` フィールドは `TODOS.md` が存在する場合のみ含める。`test_health` フィールドは test ファイルが見つかった場合のみ含める（コマンド 9 が 0 より大きい値を返した場合）。データがなければフィールドごと省略する。

test ファイルが存在する場合は test health データを JSON に含める：
```json
  "test_health": {
    "total_test_files": 47,
    "tests_added_this_period": 5,
    "regression_test_commits": 3,
    "test_files_changed": 8
  }
```

`TODOS.md` が存在する場合は backlog データを JSON に含める：
```json
  "backlog": {
    "total_open": 28,
    "p0_p1": 2,
    "p2": 8,
    "completed_this_period": 3,
    "added_this_period": 1
  }
```

### Step 14：Narrative の作成

出力を以下のように構造化する：

---

**Tweetable summary**（最初の行、すべての前）：
```
Week of Mar 1: 47 commits (3 contributors), 3.2k LOC, 38% tests, 12 PRs, peak: 10pm | Streak: 47d
```

## Engineering Retro: [date range]

### Summary Table
（Step 2 から）

### Trends vs Last Retro
（保存前に Step 12 から読み込んだもの ― 初回 retro ならスキップ）

### Time & Session Patterns
（Step 3-4 から）

チーム全体のパターンが何を意味するかを解釈する narrative：
- 最も生産的な時間帯はいつで、何が駆動しているか
- セッションが時間とともに長く / 短くなっているか
- 1 日あたりのアクティブ・コーディング推定時間（チーム集計）
- 注目すべきパターン：チームメンバーは同時間にコーディングするか、それともシフトで動くか

### Shipping Velocity
（Step 5-7 から）

以下をカバーする narrative：
- コミットタイプの mix と何を明らかにするか
- PR サイズ分布と shipping cadence について何を明らかにするか
- Fix-chain 検出（同じ subsystem の fix コミットの連鎖）
- バージョン bump 規律

### Code Quality Signals
- Test LOC 比率トレンド
- ホットスポット分析（同じファイルが churn しているか？）

### Test Health
- 総 test ファイル数：N（コマンド 9 から）
- 期間内に追加された test：M（コマンド 11 から ― 変更された test ファイル）
- Regression test コミット：コマンド 10 からの `test(qa):`、`test(design):`、`test: coverage` コミットを列挙
- 過去 retro が存在し `test_health` を持つ場合：「Test count: {last} → {now} (+{delta})」と delta を表示
- test 比率が 20% 未満なら成長領域として flag ― 「100% test カバレッジが目標。テストが vibe coding を安全にする」

### Focus & Highlights
（Step 8 から）
- 解釈付きの focus score
- Ship of the week の callout

### Your Week（個人詳細分析）
（Step 9 から、現在のユーザーのみ）

ユーザーが最も気にするセクション。以下を含める：
- 個人のコミット数、LOC、test 比率
- 個人のセッションパターンとピーク時間
- 個人のフォーカス領域
- 個人の最大の出荷物
- **何がうまくいったか**（コミットに anchor した具体的な 2-3 個）
- **どこをレベルアップするか**（具体的でアクション可能な 1-2 個の提案）

### Team Breakdown
（Step 9 から、各チームメイトについて ― ソロ repo ならスキップ）

各チームメイト（コミット数降順）について 1 セクション書く：

#### [Name]
- **何を出荷したか**：貢献、フォーカス領域、コミットパターンを 2-3 文で
- **称賛**：実際のコミットに anchor した具体的な 1-2 個。誠実に ― 1:1 で実際に言うであろうことを。例：
  - 「auth モジュール全体を 3 つの小さくレビューしやすい PR で整理 ― 教科書通りの分解」
  - 「すべての新エンドポイントに happy path だけでなく integration test を追加」
  - 「dashboard の 2 秒ロードを引き起こしていた N+1 query を修正」
- **成長機会**：具体的で建設的な提案を 1 つ。批判ではなく投資として表現。例：
  - 「payment モジュールの test カバレッジが 8% ― 次の機能が乗る前に投資する価値あり」
  - 「ほとんどのコミットが単一の burst で着地 ― 1 日に分散することでコンテキストスイッチ疲労を減らせる」
  - 「すべてのコミットが午前 1-4 時の間 ― 持続可能なペースは長期的なコード品質に影響する」

**AI コラボレーション note**：多くのコミットに `Co-Authored-By` AI trailer（例：Claude、Copilot）がある場合、AI 支援コミット率をチームメトリクスとして note する。中立的に表現 ― 「N% のコミットが AI 支援」 ― 判断は加えない。

### Top 3 Team Wins
窓内でチーム全体で最もインパクトが大きく出荷された 3 つを識別。それぞれについて：
- 何だったか
- 誰が出荷したか
- なぜ重要か（プロダクト / アーキテクチャインパクト）

### 3 Things to Improve
具体的、アクション可能、実コミットに anchor。個人レベルとチームレベルの提案を混ぜる。「さらに良くなるためにチームができること ...」のように表現。

### 3 Habits for Next Week
小さく、実用的、現実的。それぞれ採用に 5 分未満で済むもの。少なくとも 1 つはチーム志向（例：「PR を当日中にレビューし合う」）。

### Week-over-Week Trends
（該当する場合、Step 10 から）

---

## Compare モード

ユーザーが `/retro compare`（または `/retro compare 14d`）を実行した場合：

1. 現在の窓（デフォルト 7d）のメトリクスを、0 時起点の開始日で算出する（メイン retro と同じロジック ― 例：今日が 2026-03-18 で窓が 7d なら `--since="2026-03-11T00:00:00"` を使う）
2. 直前の同サイズ窓のメトリクスを、0 時起点の `--since` と `--until` の両方で算出する（重複回避 ― 例：2026-03-11 開始の 7d 窓なら、直前の窓は `--since="2026-03-04T00:00:00" --until="2026-03-11T00:00:00"`）
3. delta と矢印付きで side-by-side の比較表を表示する
4. 最大の改善と退行をハイライトする短い narrative を書く
5. 通常の retro 実行と同様に、現在の窓のスナップショットだけを `.context/retros/` に保存する。直前の窓のメトリクスは永続化 **しない**。

## トーン

- 励ましつつ率直、甘やかさない
- 具体的かつ実態に基づく ― 必ず実コミット / コードに anchor
- 一般的な称賛（「素晴らしい仕事！」）はスキップ ― 何が良くてなぜかを正確に言う
- 改善は批判ではなくレベルアップとして表現
- **称賛は 1:1 で実際に言うであろうもののように感じさせる** ― 具体的で、稼ぎ取られた、誠実なもの
- **成長提案は投資アドバイスのように感じさせる** ― 「これに時間をかける価値がある、なぜなら ...」、「あなたは X に失敗した ...」ではなく
- チームメイト同士をネガティブに比較しない。各人のセクションは独立して立つ
- 出力は 3000-4500 ワード程度（チームセクションを収めるため少し長め）
- データには markdown 表とコードブロックを使い、narrative には散文を使う
- 出力は会話に直接 ― ファイルシステムには書かない（`.context/retros/` の JSON snapshot を除く）

## 重要なルール

- すべての narrative 出力は会話でユーザーに直接出す。書き出すファイルは `.context/retros/` の JSON snapshot **だけ**。
- すべての git クエリで `origin/<default>` を使う（古い可能性があるローカル main ではなく）
- すべてのタイムスタンプはユーザーのローカルタイムゾーンで表示（`TZ` をオーバーライドしない）
- 窓内のコミットがゼロなら、その旨を伝えて別の窓を提案する
- LOC/hour は最も近い 50 に丸める
- merge コミットは PR 境界として扱う
- CLAUDE.md やその他の docs は読まない ― 本 skill は self-contained
- 初回実行（過去 retro なし）時は比較セクションを優雅にスキップ
