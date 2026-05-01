# Security Specialist Review Checklist

Scope: SCOPE_AUTH=true OR (SCOPE_BACKEND=true AND diff > 100 行) のとき
Output: JSON object、1 finding 1 行。Schema:
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"security","summary":"...","fix":"...","fingerprint":"path:line:security","specialist":"security"}
任意：line、fix、fingerprint、evidence、test_stub。
findings なし：`NO FINDINGS` のみ出力。

---

本 checklist は main CRITICAL pass より深く入る。main agent は既に SQL injection、race condition、LLM trust、enum completeness を check 済。本 specialist は auth/authz pattern、cryptographic 誤用、attack surface 拡張に focus する。

## カテゴリ

### Input Validation at Trust Boundaries
- controller/handler レベルで validation なしに受け入れられる user input
- DB query / file path で直接使われる query parameter
- 型 check / schema validation なしに受け入れられる request body field
- 型/size/content 検証なしの file upload
- signature verification なしに処理される webhook payload

### Auth & Authorization Bypass
- 認証 middleware を欠く endpoint（route 定義を check）
- 「deny」ではなく「allow」を default とする authorization check
- role 昇格 path（user が自身の role/permission を modify できる）
- 直接 object reference 脆弱性（user A が ID 変更で user B のデータに access）
- session fixation / session hijacking の機会
- 期限切れを check しない token / API key validation

### Injection Vector（SQL 以外）
- user 制御 argument を持つ subprocess call による command injection
- user input を含む template injection（Jinja2、ERB、Handlebars）
- directory query での LDAP injection
- user 制御 URL を経由した SSRF（fetch、redirect、webhook target）
- user 制御 file path 経由の path traversal（../../etc/passwd）
- HTTP header の user 制御値経由の header injection

### Cryptographic Misuse
- security-sensitive 操作に弱い hash algorithm（MD5、SHA1）
- token / secret に予測可能な乱数（Math.random、rand()）
- secret / token / digest に対する非定数時間比較（==）
- hardcode された暗号化 key / IV
- password hash の salt 欠落

### Secrets Exposure
- ソースコード（comment 内も）の API key、token、password
- アプリケーション log や error message に log される secret
- URL 内の credential（query parameter または URL の basic auth）
- user に返される error response 内の sensitive data
- 暗号化が想定される PII の plaintext 保存

### XSS via Escape Hatch
- Rails: user 制御データへの .html_safe、raw()
- React: user content への dangerouslySetInnerHTML
- Vue: user content への v-html
- Django: user input への |safe、mark_safe()
- 一般：未 sanitize データへの innerHTML 代入

### Deserialization
- untrusted data の deserialization（pickle、Marshal、YAML.load、executable type の JSON.parse）
- schema validation なしに user input / 外部 API から serialize された object を受け入れ
