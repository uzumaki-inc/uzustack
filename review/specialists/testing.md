# Testing Specialist Review Checklist

Scope: 常時（全 review）
Output: JSON object、1 finding 1 行。Schema:
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"testing","summary":"...","fix":"...","fingerprint":"path:line:testing","specialist":"testing"}
任意：line、fix、fingerprint、evidence、test_stub。
findings なし：`NO FINDINGS` のみ出力。

---

## カテゴリ

### Missing Negative-Path Tests
- error / rejection / 不正 input を扱う新コード path で対応 test 無し
- guard clause / early return が untested
- try/catch、rescue、error boundary 内の error branch で failure-path test 無し
- コードで assert される permission / auth check で「denied」case が決して test されない

### Missing Edge-Case Coverage
- 境界値：ゼロ、負、max-int、空文字列、空 array、nil/null/undefined
- 単一要素 collection（loop の off-by-one）
- user 向け input の Unicode と特殊文字
- race condition test 無しの concurrent access pattern

### Test Isolation Violations
- mutable state（class 変数、global singleton、cleanup されない DB record）を共有する test
- 順序依存 test（順番通りなら pass、randomize すると fail）
- system clock、timezone、locale に依存する test
- stub/mock を使わず実 network call を行う test

### Flaky Test Patterns
- timing 依存 assertion（sleep、setTimeout、tight timeout 付き waitFor）
- unordered result の順序に対する assertion（hash key、Set iteration、async resolution 順）
- fallback なしに外部サービス（API、DB）に依存する test
- seed 制御なしの randomized test data

### Security Enforcement Tests Missing
- 「unauthorized」case test 無しの controller の auth/authz check
- 実際に block することを証明する test 無しの rate limiting logic
- malicious input test 無しの input sanitization
- integration test 無しの CSRF/CORS 設定

### Coverage Gaps
- test coverage ゼロの新 public method/function
- 既存 test が旧挙動のみ cover し新 branch を cover しない変更 method
- 複数箇所から call されるが間接的にしか test されない utility 関数
