# Pre-Landing Review Checklist

## Instructions

`git diff origin/main` の出力を、下記 issue について review する。具体的に — `file:line` を引用して fix を提案する。問題ないものは skip。real な問題のみ flag する。

**Two-pass review:**
- **Pass 1（CRITICAL）:** SQL & Data Safety、Race Conditions、LLM Output Trust Boundary、Shell Injection、Enum Completeness を最初に走らせる。最高 severity。
- **Pass 2（INFORMATIONAL）:** 下記の残りカテゴリを走らせる。低 severity だが action する。
- **Specialist カテゴリ（並列 subagent が処理、本 checklist の対象外）:** Test Gaps、Dead Code、Magic Numbers、Conditional Side Effects、Performance & Bundle Impact、Crypto & Entropy。これらは `review/specialists/` を参照。

全 findings は Fix-First Review で action される：明らかに mechanical な fix は自動適用、真に曖昧な issue は 1 つの user question に batch される。

**出力形式:**

```
Pre-Landing Review: N issues (X critical, Y informational)

**AUTO-FIXED:**
- [file:line] Problem → fix applied

**NEEDS INPUT:**
- [file:line] Problem description
  Recommended fix: suggested fix
```

issue が無ければ：`Pre-Landing Review: No issues found.`

簡潔に。各 issue：1 行で問題、1 行で fix。前置き、要約、「looks good overall」は無し。

---

## Review カテゴリ

### Pass 1 — CRITICAL

#### SQL & Data Safety
- SQL の string interpolation（値が `.to_i`/`.to_f` でも）— parameterized query を使う（Rails: sanitize_sql_array/Arel; Node: prepared statements; Python: parameterized queries）
- TOCTOU race：atomic な `WHERE` + `update_all` であるべき check-then-set pattern
- 直接 DB write で model validations を bypass（Rails: update_column; Django: QuerySet.update(); Prisma: raw queries）
- N+1 query：loop / view で使う関連の eager loading 欠落（Rails: .includes(); SQLAlchemy: joinedload(); Prisma: include）

#### Race Conditions & Concurrency
- uniqueness 制約や duplicate key error catch + retry なしの read-check-write（例：`where(hash:).first` してから `save!`、concurrent insert を処理せず）
- unique DB index なしの find-or-create — concurrent call で重複生成
- atomic な `WHERE old_status = ? UPDATE SET new_status` を使わない status transition — concurrent update で transition が skip / 二重適用される
- ユーザー制御データに対する unsafe HTML rendering（Rails: .html_safe/raw(); React: dangerouslySetInnerHTML; Vue: v-html; Django: |safe/mark_safe）（XSS）

#### LLM Output Trust Boundary
- LLM 生成値（email、URL、name）が format 検証なしに DB write / mailer に渡る。永続化前に軽量 guard（`EMAIL_REGEXP`、`URI.parse`、`.strip`）を追加。
- 構造化された tool 出力（array、hash）が型 / shape check なしに DB write される。
- LLM 生成 URL が allowlist なしに fetch される — URL が内部 network を指す SSRF risk（Python: `urllib.parse.urlparse` → `requests.get`/`httpx.get` 前に hostname を blocklist で check）
- LLM 出力が sanitization なしに knowledge base / vector DB に保存される — stored prompt injection risk

#### Shell Injection（Python 固有）
- `subprocess.run()` / `subprocess.call()` / `subprocess.Popen()` で `shell=True` AND command 文字列に f-string/`.format()` interpolation — 代わりに argument array を使う
- 変数 interpolation を含む `os.system()` — argument array を使う `subprocess.run()` に置換
- sandbox なしの LLM 生成コードに対する `eval()` / `exec()`

#### Enum & Value Completeness
diff が新 enum 値、status 文字列、tier 名、type 定数を導入した場合：
- **全 consumer に traceする。** その値で switch する、filter する、display する各 file を Read（grep ではなく READ）。新値を扱わない consumer があれば flag。よくある miss：frontend dropdown には値を追加したが backend model/compute method が永続化しない。
- **allowlist / filter array を check。** sibling 値を含む array や `%w[]` list を search（例：tier に "revise" を追加するなら、`%w[quick lfg mega]` 全てを見つけ、必要な箇所に "revise" が含まれるか検証）。
- **`case` / `if-elsif` chain を check。** 既存コードが enum に branch していたら、新値が wrong default に落ちないか？
これを行うには：sibling 値の全参照を Grep（例：tier consumer 全てを見つけるため "lfg" や "mega" を grep）。各 match を Read。本 step は diff の OUTSIDE のコードを読む必要がある。

### Pass 2 — INFORMATIONAL

#### Async/Sync Mixing（Python 固有）
- `async def` endpoint 内の同期 `subprocess.run()`、`open()`、`requests.get()` — event loop を block する。代わりに `asyncio.to_thread()`、`aiofiles`、`httpx.AsyncClient` を使う。
- async 関数内の `time.sleep()` — `asyncio.sleep()` を使う
- async context での `run_in_executor()` wrap なしの sync DB call

#### Column/Field Name Safety
- ORM query（`.select()`、`.eq()`、`.gte()`、`.order()`）の column 名を実 DB schema に対して検証 — 間違った column 名は silent に空 result を返すか、swallow された error を投げる
- query 結果に対する `.get()` call が、実際に select された column 名を使っているか check
- 利用可能なら schema documentation と cross-reference

#### Dead Code & Consistency（version/changelog のみ — 他項目は maintainability specialist が処理）
- PR title と VERSION/CHANGELOG file 間の version mismatch
- 変更を不正確に記述する CHANGELOG entry（例：X が存在しなかったのに「changed from X to Y」）

#### LLM Prompt Issues
- prompt 内の 0-indexed list（LLM は確実に 1-indexed を返す）
- 利用可能な tool / capability を列挙する prompt text が、実際に `tool_classes`/`tools` array に wire up されたものと一致しない
- 複数箇所に書かれて drift する可能性がある word/token limit

#### Completeness Gaps
- 完全版が CC 時間 30 分未満で済む shortcut 実装（例：partial enum handling、不完全な error path、追加が容易な edge case の missing）
- 人間チーム effort のみで提示された option — 人間と CC+uzustack 両方の時間を表示すべき
- test coverage gap で、抜けている test を追加することが「ocean」ではなく「lake」（例：negative-path test の欠落、happy-path 構造を mirror する edge case test の欠落）
- 100% が控えめな追加コードで達成可能な状況での 80-90% 実装

#### Time Window Safety
- 「today」が 24h を cover すると仮定する date-key lookup — 8am PT の report は today key 配下で midnight→8am のみ見える
- 関連 feature 間の時間 window mismatch — 一方が hourly bucket、他方が同データに対する daily key

#### Type Coercion at Boundaries
- Ruby→JSON→JS 境界を跨ぐ値で型が変わり得る箇所（数値 vs 文字列）— hash/digest 入力は型を normalize しなければならない
- serialization 前に `.to_s` 等を call しない hash/digest 入力 — `{ cores: 8 }` と `{ cores: "8" }` は異なる hash を生む

#### View/Frontend
- partial 内の inline `<style>` block（render ごとに re-parse）
- view での O(n*m) lookup（`index_by` hash の代わりに loop 中の `Array#find`）
- DB result に対する Ruby 側 `.select{}` filter で `WHERE` 句にできるもの（leading-wildcard `LIKE` を意図的に避けている場合を除く）

#### Distribution & CI/CD Pipeline
- CI/CD workflow 変更（`.github/workflows/`）：build tool version が project 要件と合致するか、artifact 名 / path が正しいか、secret が hardcode ではなく `${{ secrets.X }}` を使っているか検証
- 新 artifact 種別（CLI binary、library、package）：publish/release workflow が存在し正しい platform を target しているか検証
- Cross-platform build：CI matrix が全 target OS/arch 組合せを cover しているか、または untested を documented しているか
- version tag format consistency：`v1.2.3` vs `1.2.3` — VERSION file、git tag、publish script で match しなければならない
- publish step idempotency：publish workflow を re-run しても fail しないこと（例：`gh release create` の前に `gh release delete`）

**DO NOT flag:**
- 既存 auto-deploy pipeline を持つ web サービス（Docker build + K8s deploy）
- チーム外に配布されない internal tool
- test only な CI 変更（test step 追加、publish step ではない）

---

## Severity 分類

```
CRITICAL (highest severity):      INFORMATIONAL (main agent):      SPECIALIST (parallel subagents):
├─ SQL & Data Safety              ├─ Async/Sync Mixing             ├─ Testing specialist
├─ Race Conditions & Concurrency  ├─ Column/Field Name Safety      ├─ Maintainability specialist
├─ LLM Output Trust Boundary      ├─ Dead Code (version only)      ├─ Security specialist
├─ Shell Injection                ├─ LLM Prompt Issues             ├─ Performance specialist
└─ Enum & Value Completeness      ├─ Completeness Gaps             ├─ Data Migration specialist
                                   ├─ Time Window Safety            ├─ API Contract specialist
                                   ├─ Type Coercion at Boundaries   └─ Red Team (conditional)
                                   ├─ View/Frontend
                                   └─ Distribution & CI/CD Pipeline

全 findings は Fix-First Review で action される。Severity が
提示順序と AUTO-FIX vs ASK の分類を決める — critical findings は
ASK 寄り（より risky）、informational findings は AUTO-FIX 寄り
（より mechanical）。
```

---

## Fix-First Heuristic

本 heuristic は `/review` と `/ship` の両方が参照する。agent が finding を auto-fix するかユーザーに ask するかを決定する。

```
AUTO-FIX (agent fixes without asking):     ASK (needs human judgment):
├─ Dead code / 未使用変数                  ├─ Security (auth, XSS, injection)
├─ N+1 query (eager loading 欠落)          ├─ Race condition
├─ コードと矛盾する古いコメント            ├─ Design 決定
├─ Magic number → 名前付き定数             ├─ 大きい fix（>20 行）
├─ LLM output validation 欠落              ├─ Enum completeness
├─ Version/path mismatch                   ├─ 機能の削除
├─ assign されたが never read な変数       └─ user-visible な挙動を変える全て
└─ Inline style、O(n*m) view lookup
```

**Rule of thumb:** fix が mechanical で、senior engineer が議論なしに適用するなら AUTO-FIX。reasonable な engineer が fix について意見が割れ得るなら ASK。

**Critical findings は ASK 寄り**（本質的に risky）。
**Informational findings は AUTO-FIX 寄り**（より mechanical）。

---

## Suppressions — flag しない

- 「X は Y と冗長」だが冗長性が無害で可読性を助ける場合（例：`length > 20` と冗長な `present?`）
- 「この threshold/定数が選ばれた理由を説明する comment を追加せよ」 — threshold は tuning 中に変わり、comment は腐る
- 「この assertion はもっと tight にできる」だが既に挙動を cover している場合
- consistency-only な変更を提案（他定数が guard されている形に合わせて値を conditional で wrap）
- 「regex が edge case X を扱わない」だが入力が constrained で X が実際には起こらない場合
- 「test が複数 guard を同時に実行している」 — それは fine、test は全 guard を isolate する必要は無い
- eval threshold 変更（max_actionable、min score）— 経験的に tuning され constantly 変わる
- 無害な no-op（例：array に never いない要素に対する `.reject`）
- review 中の diff で **既に対処済の全て** — comment 前に diff を FULL に読む
