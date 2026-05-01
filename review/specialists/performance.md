# Performance Specialist Review Checklist

Scope: SCOPE_BACKEND=true OR SCOPE_FRONTEND=true のとき
Output: JSON object、1 finding 1 行。Schema:
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"performance","summary":"...","fix":"...","fingerprint":"path:line:performance","specialist":"performance"}
任意：line、fix、fingerprint、evidence、test_stub。
findings なし：`NO FINDINGS` のみ出力。

---

## カテゴリ

### N+1 Queries
- eager loading（.includes、joinedload、include）なしに loop で traverse される ActiveRecord/ORM 関連
- batch 化できる iteration block（each、map、forEach）内の DB query
- lazy-loaded 関連を trigger する nested serializer
- batch せず field ごとに query する GraphQL resolver（DataLoader 利用を check）

### Missing Database Indexes
- index なしの column に対する新 WHERE 句（migration file / schema を check）
- index されていない column に対する新 ORDER BY
- composite index なしの composite query（WHERE a AND b）
- index なしで追加された foreign key column

### Algorithmic Complexity
- O(n^2) 以上の pattern：collection に対する nested loop、Array.map 内の Array.find
- hash/map/set lookup を使えば良い反復線形 search
- loop 内の string concatenation（join や StringBuilder を使う）
- 1 回で済む大 collection の sort/filter を複数回行う

### Bundle Size Impact (Frontend)
- 既知の重い production dependency 追加（moment.js、lodash full、jquery）
- deep import（'library/specific' から）ではなく barrel import（'library' から）
- 最適化なしで commit された大 static asset（image、font）
- route レベル chunk の code splitting 欠落

### Rendering Performance (Frontend)
- Fetch waterfall：parallel（Promise.all）にできる sequential API call
- unstable な参照（render 内の新 object/array）からの不要 re-render
- 高コスト computation での React.memo、useMemo、useCallback 欠落
- loop で DOM property を read してから write することによる layout thrashing
- below-fold image での `loading="lazy"` 欠落

### Missing Pagination
- unbounded result を返す list endpoint（LIMIT なし、pagination param なし）
- データ量と共に成長する LIMIT なし DB query
- ID と expansion ではなく full nested object を embed する API response

### Blocking in Async Contexts
- async 関数内の synchronous I/O（file read、subprocess、HTTP request）
- event-loop based handler 内の time.sleep() / Thread.sleep()
- worker offload なしに main thread を block する CPU 集約 computation
