# Maintainability Specialist Review Checklist

Scope: 常時（全 review）
Output: JSON object、1 finding 1 行。Schema:
{"severity":"INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"maintainability","summary":"...","fix":"...","fingerprint":"path:line:maintainability","specialist":"maintainability"}
任意：line、fix、fingerprint、evidence、test_stub。
findings なし：`NO FINDINGS` のみ出力。

---

## カテゴリ

### Dead Code & Unused Imports
- 変更 file 内で assign されたが never read な変数
- define されたが never call な function/method（repo 全体に対して Grep で check）
- 変更後参照されなくなった import/require
- comment-out されたコードブロック（削除するか、なぜ存在するか説明）

### Magic Numbers & String Coupling
- logic で使われる bare な数値リテラル（threshold、limit、retry count）— 名前付き定数にすべき
- query filter / 条件として他所で使われる error message 文字列
- config にすべき hardcode された URL、port、hostname
- 複数 file 間で重複するリテラル値

### Stale Comments & Docstrings
- 本 diff でコードが変更された後も旧挙動を記述する comment
- 完了済の作業を参照する TODO/FIXME comment
- 現関数 signature と一致しない parameter list の docstring
- もはやコード flow と一致しない comment 内 ASCII 図

### DRY Violations
- diff 内で複数回現れる類似コードブロック（3 行以上）
- 共有 helper の方が clean な copy-paste pattern
- test file 間で重複する config / setup logic
- lookup table / map にできる繰り返し条件 chain

### Conditional Side Effects
- 条件で branch するが片方の branch で side effect を忘れたコード path
- action 発生を主張するが action が条件的に skip された log message
- 一方の branch が関連 record を update するが他方が update しない state transition
- happy path のみ fire し、error / edge path で missing な event 発火

### Module Boundary Violations
- 別 module の内部実装に reach（private-by-convention method への access）
- service/model を経由すべきが controller/view 内で直接 DB query
- interface 経由で通信すべき component 間の tight coupling
