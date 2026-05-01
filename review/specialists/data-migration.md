# Data Migration Specialist Review Checklist

Scope: SCOPE_MIGRATIONS=true のとき
Output: JSON object、1 finding 1 行。Schema:
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"data-migration","summary":"...","fix":"...","fingerprint":"path:line:data-migration","specialist":"data-migration"}
任意：line、fix、fingerprint、evidence、test_stub。
findings なし：`NO FINDINGS` のみ出力。

---

## カテゴリ

### Reversibility
- 本 migration はデータ損失なしで rollback できるか？
- 対応する down/rollback migration があるか？
- rollback が実際に変更を undo するか、それとも no-op か？
- rollback すると現アプリケーションコードが壊れないか？

### Data Loss Risk
- データを保持する column を削除（先に deprecation 期間を）
- データを切り詰める column 型変更（varchar(255) → varchar(50)）
- 参照コードが無いことを検証せずに table を削除
- 全参照（ORM、raw SQL、view）を更新せずに column rename
- 既存 NULL 値を持つ column に NOT NULL 制約を追加（先に backfill 必要）

### Lock Duration
- 大 table に対する CONCURRENTLY なしの ALTER TABLE（PostgreSQL）
- 100K 超 row の table に対する CONCURRENTLY なしの index 追加
- 1 つの lock 取得に combine できる複数 ALTER TABLE
- peak traffic 時間帯に exclusive lock を取得する schema 変更

### Backfill Strategy
- DEFAULT 値なしの新 NOT NULL column（制約前に backfill 必要）
- batch 投入が必要な computed default を持つ新 column
- 既存 record 用 backfill script / rake task が欠落
- batch せず全 row を一度に update する backfill（table を lock）

### Index Creation
- production table への CONCURRENTLY なし CREATE INDEX
- 重複 index（新 index が既存と同 column を cover）
- 新 foreign key column に index 欠落
- full index の方が有用な箇所での partial index（または逆）

### Multi-Phase Safety
- application code と特定順序で deploy する必要がある migration
- 現 running code を壊す schema 変更（先にコード deploy、その後 migrate）
- deploy 境界を仮定する migration（旧コード + 新 schema = crash）
- rolling deploy 中の旧/新コード混在を扱う feature flag が欠落
