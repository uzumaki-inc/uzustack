# API Contract Specialist Review Checklist

Scope: SCOPE_API=true のとき
Output: JSON object、1 finding 1 行。Schema:
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"api-contract","summary":"...","fix":"...","fingerprint":"path:line:api-contract","specialist":"api-contract"}
任意：line、fix、fingerprint、evidence、test_stub。
findings なし：`NO FINDINGS` のみ出力。

---

## カテゴリ

### Breaking Changes
- response body から field 削除（client が依存しているかも）
- field の型変更（string → number、object → array）
- 既存 endpoint に新規必須 parameter を追加
- HTTP method 変更（GET → POST）または status code 変更（200 → 201）
- 旧 path を redirect/alias として残さず endpoint 名変更
- 認証要件の変更（public → authenticated）

### Versioning Strategy
- version bump（v1 → v2）なしの破壊的変更
- 同 API 内に複数の versioning 戦略を混在（URL vs header vs query param）
- sunset timeline / migration guide 無しの deprecated endpoint
- controller 全体に散らばる version-specific logic、中央集約されていない

### Error Response Consistency
- 既存と異なる error format を返す新 endpoint
- 標準 field（error code、message、details）を欠く error response
- error type に match しない HTTP status code（error に 200、validation に 500）
- 内部実装詳細を leak する error message（stack trace、SQL）

### Rate Limiting & Pagination
- 類似 endpoint に rate limit があるのに新 endpoint には欠落
- backwards compatibility なしの pagination 変更（offset → cursor）
- 文書化なしの page size / default limit 変更
- paginated response に total count や next-page indicator が欠落

### Documentation Drift
- 新 endpoint や変更 param に合わせて update されていない OpenAPI/Swagger spec
- 変更後も旧挙動を記述する README / API doc
- 動かなくなった example request/response
- 新 endpoint や変更 parameter の文書化欠落

### Backwards Compatibility
- 旧 version の client：壊れるか？
- force-update できない mobile app：API はまだ動くか？
- 購読者通知なしの webhook payload 変更
- 新機能利用に必要な SDK / client library 変更
