# DX Hall of Fame Reference

current レビュー pass の section のみを読め。ファイル全体を load するな。

## Pass 1: Getting Started

**Gold standard：**
- **Stripe**：カードに課金するために 7 行のコード。ログインしていれば docs があなたの test API key を pre-fill。Stripe Shell が docs ページの中で CLI を実行。local install 不要。
- **Vercel**：`git push` = HTTPS 付きの global CDN で live サイト。すべての PR が preview URL を得る。1 つの CLI command：`vercel`。
- **Clerk**：`<SignIn />`、`<SignUp />`、`<UserButton />`。3 つの JSX コンポーネント、メール / ソーシャル / MFA 付きの動作する auth が箱から。
- **Supabase**：Postgres テーブルを作成、REST API + Realtime + 自己ドキュメント化された docs を瞬時に auto-generate。
- **Firebase**：`onSnapshot()`。3 行ですべてのクライアント間 real-time sync、オフライン persistence built-in。
- **Twilio**：コンソールでの Virtual Phone。番号購入なし、クレジットカードなしで SMS を送受信。結果：activation で 62% 改善。

**Anti-pattern：**
- value 提供前のメール認証（フローを break する）
- sandbox 前にクレジットカード必須
- 複数パスを持つ「Choose your own adventure」（決定疲労；one golden path が勝つ）
- 設定に隠された API key（Stripe はそれをコード例に pre-fill）
- 言語切り替えなしの static なコード例
- ダッシュボードと別の docs サイト（context switching）

## Pass 2: API/CLI/SDK Design

**Gold standard：**
- **Stripe prefixed ID**：charge には `ch_`、customer には `cus_`。自己ドキュメント化。間違った ID type を渡すのは impossible。
- **Stripe expandable object**：default は ID 文字列を返す。`expand[]` が full object を inline で取得。最大 4 段階のネスト expansion。
- **Stripe idempotency key**：mutation で `Idempotency-Key` header を渡す。安全な retry。「2 重課金したか？」不安なし。
- **Stripe API versioning**：最初の call がアカウントをその日のバージョンに pin。`Stripe-Version` header 経由で request 単位に新バージョンをテスト。
- **GitHub CLI**：terminal vs pipe を auto-detect。terminal で human-readable、pipe で tab-delimited。`gh pr <tab>` ですべての PR action を表示。
- **SwiftUI progressive disclosure**：`Button("Save") { save() }` から full customization まで、すべてのレベルで同じ API。
- **htmx**：HTML 属性が JS を置き換える。合計 14KB。`hx-get="/search" hx-trigger="keyup changed delay:300ms"`。build step ゼロ。
- **shadcn/ui**：ソースコードを project にコピー。すべての行を own する。dependency なし、バージョン衝突なし。

**Anti-pattern：**
- chatty な API：1 つの user-visible action に 5 call が必要
- 一貫性のない命名：`/users`（複数形）vs `/user/123`（単数形）vs `/create-order`（URL に動詞）
- implicit な failure：response body にネストされた error と共に 200 OK
- god endpoint：subset ごとに異なる behavior の 47 parameter 組み合わせ
- documentation 必須 API：最初の call の前に 3 ページの docs = 過剰な ceremony

## Pass 3: Error Message と Debugging

**エラー品質の 3 tier：**

**Tier 1、Elm（Conversational Compiler）：**
```
-- TYPE MISMATCH ---- src/Main.elm
I cannot do addition with String values like this one:
42|   "hello" + 1
     ^^^^^^^
Hint: To put strings together, use the (++) operator instead.
```
一人称、完全な文、正確な location、suggested fix、further reading。

**Tier 2、Rust（Annotated Source）：**
```
error[E0308]: mismatched types
 --> src/main.rs:4:20
help: consider borrowing here
  |
4 |     let name: &str = &get_name();
  |                       +
```
Error code が tutorial にリンク。primary + secondary label。Help section が exact な edit を示す。

**Tier 3、Stripe API（doc_url 付き structured）：**
```json
{"error":{"type":"invalid_request_error","code":"resource_missing","message":"No such customer: 'cus_nonexistent'","param":"customer","doc_url":"https://stripe.com/docs/error-codes/resource-missing"}}
```
5 fields、ゼロ ambiguity。

**The formula：** 何が起きた + なぜ + どう fix する + どこで learn する + 引き起こした実値。

**Anti-pattern：** TypeScript は長い error chain の BOTTOM に「Did you mean?」を埋める。最も actionable な情報は FIRST に現れるべき。

## Pass 4: Documentation と Learning

**Gold standard：**
- **Stripe docs**：3 カラム layout（nav / content / live code）。ログイン時に API key を inject。言語切り替えがすべてのページで持続。Hover-to-highlight。in-browser API call のための Stripe Shell。Markdoc を build しオープンソース化。docs が finalized されるまで feature は ship しない。docs 貢献は performance review に影響。
- developer の 52% は documentation 不足で blocked（Postman 2023）
- world-class docs を持つ会社は 2.5 倍の採用増を見る
- 「Docs as product」：feature と共に ship する、さもなければ feature は ship しない

## Pass 5: Upgrade と Migration Path

**Gold standard：**
- **Next.js**：`npx @next/codemod upgrade major`。1 コマンドで Next.js、React、React DOM をアップグレード、すべての関連 codemod を実行。
- **AG Grid**：v31+ からのすべての release に codemod を含む。
- **Stripe API versioning**：内部で 1 つの codebase。アカウントごとのバージョン pinning。breaking change が surprise しない。
- **Martin Fowler の pipeline pattern**：1 つの monolithic codemod ではなく、small で testable な transformation を組み合わせる。
- Maven Central の breaking change の 21.9% は文書化されていない（Ochoa et al., 2021）

## Pass 6: Developer Environment と Tooling

**Gold standard：**
- **Bun**：npm install より 100 倍速い、Node.js runtime より 4 倍速い。Speed IS DX。
- 1 日平均 87 件の中断；各々から回復するのに 25 分。dev は 1 日 2〜4 時間しかコードを書かない。
- DXI 1 ポイント改善 = developer あたり週 13 分節約。
- **GitHub Copilot**：55.8% 速いタスク完了。PR 時間が 9.6 日から 2.4 日へ。

## Pass 7: Community と Ecosystem

- Dev tool は購入前に約 14 回の exposure が必要（Matt Biilmann、Netlify）。四半期 OKR サイクルと incompatible。
- 強い developer experience を持つチームに対して 4〜5 倍のパフォーマンス multiplier（DevEx framework）。

## Pass 8: DX Measurement

**3 つの academic framework：**
1. **SPACE**（Microsoft Research、2021）：Satisfaction、Performance、Activity、Communication、Efficiency。少なくとも 3 dimension を measure。
2. **DevEx**（ACM Queue、2023）：Feedback Loop、Cognitive Load、Flow State。perceptual + workflow データを組み合わせる。
3. **Fagerholm & Munch**（IEEE、2012）：Cognition、Affect、Conation。「trilogy of mind」の心理的フレーム。

## Claude Code Skill DX Checklist

Claude Code skill、MCP サーバー、AI agent ツールの plan をレビューするときに使う。

- [ ] **AskUserQuestion design**：1 issue per call。context（project、branch、task）を re-ground。visual feedback のためのブラウザハンドオフ。
- [ ] **State storage**：Global（~/.tool/）vs per-project（$SLUG/）vs per-session。audit trail のための append-only JSONL。
- [ ] **Progressive consent**：marker file 付きの 1 回限り prompt。決して再質問しない。Reversible。
- [ ] **Auto-upgrade**：cache + snooze backoff 付きバージョンチェック。Migration script。Inline offer。
- [ ] **Skill composition**：Benefits-from chain。Review chaining。section skipping 付き inline 起動。
- [ ] **Error recovery**：failure からの resume。partial result が保存される。Checkpoint-safe。
- [ ] **Session continuity**：Timeline event。compaction recovery。Cross-session learning。
- [ ] **Bounded autonomy**：明確な操作制限。destructive action のための mandatory escalation。Audit trail。

reference 実装：uzustack の design-shotgun loop、auto-upgrade フロー、progressive consent、階層的ストレージ。
