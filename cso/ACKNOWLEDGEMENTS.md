# Acknowledgements

/cso v2 は security audit landscape 全体の研究に基づいて設計されている。以下に credits：

- **[Sentry Security Review](https://github.com/getsentry/skills)** — confidence-based reporting system（HIGH 信頼度の findings のみ報告）と "research before reporting" 手法（データフローを追跡、上流 validation を check）が、daily mode の 8/10 信頼度 gate の妥当性を裏付けた。TimOnWeb は test した 5 件の security skill のうち install する価値があるのは唯一これだけと評価。
- **[Trail of Bits Skills](https://github.com/trailofbits/skills)** — audit-context-building 手法（bug を狩る前に mental model を構築）が Phase 0 に直接 inspire を与えた。彼らの variant analysis 概念（脆弱性が 1 件見つかったら、コードベース全体で同じ pattern を search）が Phase 12 の variant analysis ステップに inspire を与えた。
- **[Shannon by Keygraph](https://github.com/KeygraphHQ/shannon)** — XBOW benchmark で 96.15%（100/104 exploits）を達成した自律 AI pentester。AI が checklist scan だけでなく、実際の security testing を行えることを示した。Phase 12 の能動的検証は Shannon が live で行うことの static-analysis 版。
- **[afiqiqmal/claude-security-audit](https://github.com/afiqiqmal/claude-security-audit)** — AI/LLM 固有の security check（prompt injection、RAG poisoning、tool calling permission）が Phase 7 に inspire を与えた。framework-level の auto-detection（"Node/TypeScript" だけでなく "Next.js" を検出）が Phase 0 の framework detection ステップに inspire を与えた。
- **[Snyk ToxicSkills 調査](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)** — AI agent skill の 36% にセキュリティ flaw、13.4% は malicious という発見が Phase 8（Skill Supply Chain scanning）の inspire 源。
- **[Daniel Miessler's Personal AI Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure)** — incident response playbook と protection file 概念が、修正と LLM security phase に取り入れられた。
- **[McGo/claude-code-security-audit](https://github.com/McGo/claude-code-security-audit)** — 共有可能な report と actionable epic を生成する着想が、本 report 形式の進化に取り入れられた。
- **[Claude Code Security Pack](https://dev.to/myougatheaxo/automate-owasp-security-audits-with-claude-code-security-pack-4mah)** — modular approach（/security-audit、/secret-scanner、/deps-check の skill 分離）がこれらは別個の関心事であることの妥当性を示した。本 skill は modularity を犠牲にして cross-phase reasoning を取った。
- **[Anthropic Claude Code Security](https://www.anthropic.com/news/claude-code-security)** — multi-stage 検証と confidence scoring が並列 finding 検証の妥当性を裏付けた。OSS で 500 以上の zero-day を発見。
- **[@gus_argon](https://x.com/gus_aragon/status/2035841289602904360)** — v1 の致命的盲点を特定：stack detection が無い（全言語 pattern を実行）、Claude Code の Grep tool ではなく bash grep を使う、`| head -20` が結果を黙って切り捨てる、preamble bloat。これらが直接的に v2 の stack-first approach と Grep tool 必須化を形作った。
