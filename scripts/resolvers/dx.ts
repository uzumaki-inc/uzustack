/**
 * DX Framework resolver
 *
 * /plan-devex-review と /devex-review が共有する principles / characteristics /
 * cognitive patterns / scoring rubric。 コンパクト (~150 行)。
 *
 * Hall of Fame examples はここには含めない。
 * plan-devex-review/dx-hall-of-fame.md に住み、 prompt bloat 回避のため
 * pass ごとに on-demand で load する。
 */
import type { TemplateContext } from './types';

export function generateDxFramework(ctx: TemplateContext): string {
  const hallOfFamePath = `${ctx.paths.skillRoot}/plan-devex-review/dx-hall-of-fame.md`;

  return `## DX First Principles

これが法。 全 recommendation はこのいずれかに traces back する。

1. **T0 で zero friction。** 最初の 5 分が全てを決める。 起動は 1 click。 docs を読まずに hello world。 credit card 不要。 demo call 不要。
2. **段階的なステップ。** developer が「system 全体」 を理解しないと一部の value を得られない状態は禁止。 cliff ではなく gentle ramp。
3. **手を動かして学ぶ。** playground、 sandbox、 context 内で動く copy-paste code。 reference docs は必要だが十分ではない。
4. **私の代わりに decide、 ただし override させて。** opinionated default は feature。 escape hatch は requirement。 strong opinions, loosely held。
5. **不確実性と戦う。** developer が必要なもの: 次に何をするか、 それが動いたか、 動かない時にどう直すか。 全 error に「problem + cause + fix」 を載せる。
6. **context 込みで code を見せる。** hello world は嘘。 real auth、 real error handling、 real deployment を見せる。 問題の 100% を解く。
7. **速度は feature。** iteration 速度が全て。 response 時間、 build 時間、 task をこなすのに必要な code 行数、 学ぶべき concept 数。
8. **magical moment を作る。** 何が「magic に感じる」 か？ Stripe の即時 API response、 Vercel の push-to-deploy。 自分の magic を見つけて、 developer が最初に体験する場所に配置する。

## The Seven DX Characteristics

| # | Characteristic | 意味 | Gold Standard |
|---|---------------|------|---------------|
| 1 | **Usable** | install / setup / 使用が simple。 直観的な API。 fast feedback。 | Stripe: 1 key、 1 curl、 money が動く |
| 2 | **Credible** | reliable / predictable / consistent。 clear deprecation。 secure。 | TypeScript: gradual adoption、 JS を壊さない |
| 3 | **Findable** | 発見 + 内部での help 検索が容易。 強い community。 良い search。 | React: 全質問が SO で答えられる |
| 4 | **Useful** | real problem を解く。 feature が実 use case に match。 scale する。 | Tailwind: CSS need の 95% を cover |
| 5 | **Valuable** | friction を計測可能に減らす。 time を save。 dependency 価値あり。 | Next.js: SSR / routing / bundling / deploy が 1 つに |
| 6 | **Accessible** | role / 環境 / preference を横断して動く。 CLI + GUI。 | VS Code: junior から principal まで動く |
| 7 | **Desirable** | best-in-class tech。 reasonable pricing。 community momentum。 | Vercel: dev が「使いたい」 と願う、 仕方なく使うのではない |

## Cognitive Patterns — 偉大な DX Leader の思考法

これを internalize する。 列挙だけして終わりにしない。

1. **Chef-for-chefs** — あなたの user は product を build して生活している。 全てに気づくので bar は高い。
2. **最初の 5 分への執着** — 新 dev が到着、 clock スタート。 docs / sales / credit card なしで hello-world できるか？
3. **error message への共感** — 全 error は痛み。 problem を identify、 cause を explain、 fix を見せ、 docs に link しているか？
4. **escape hatch awareness** — 全 default に override が要る。 escape hatch なし = trust なし = scale 時の adoption なし。
5. **journey の whole 性** — DX は discover → evaluate → install → hello world → integrate → debug → upgrade → scale → migrate。 全 gap = 失う dev。
6. **context switching cost** — dev が tool を離れる (docs / dashboard / error lookup) たび、 10-20 分失う。
7. **upgrade fear** — これは production app を壊すか？ clear changelog、 migration guide、 codemod、 deprecation warning。 upgrade は退屈であるべき。
8. **SDK の完全性** — dev が自分で HTTP wrapper を書いたら、 失敗。 SDK が 5 言語中 4 つしかなければ、 5 番目の community に憎まれる。
9. **Pit of Success** — 「我々は customer が単純に良 practice に fall into することを望む」 (Rico Mariani)。 正しいことを easy に、 誤りを hard にする。
10. **Progressive disclosure** — simple case が production-ready (toy ではない)。 complex case が同じ API を使う。 SwiftUI: \\\`Button("Save") { save() }\\\` → full customization、 同じ API。

## DX Scoring Rubric (0-10 calibration)

| Score | 意味 |
|-------|------|
| 9-10 | Best-in-class。 Stripe / Vercel tier。 developer が rave する。 |
| 7-8 | 良い。 developer が frustration なく使える。 minor gap のみ。 |
| 5-6 | 許容範囲。 動くが friction あり。 developer は我慢して使う。 |
| 3-4 | Poor。 developer が complain。 adoption が伸びない。 |
| 1-2 | Broken。 最初の試行で developer が abandon する。 |
| 0 | 未対応。 この dimension に思考が向けられていない。 |

**The gap method:** 各 score について、 この product にとって 10 がどう見えるかを explain。 そして 10 に向かって fix する。

## TTHW Benchmarks (Time to Hello World)

| Tier | Time | Adoption Impact |
|------|------|-----------------|
| Champion | < 2 min | 3-4x higher adoption |
| Competitive | 2-5 min | Baseline |
| Needs Work | 5-10 min | 大きく drop-off |
| Red Flag | > 10 min | 50-70% abandon |

## Hall of Fame Reference

各 review pass で、 該当 section を以下から load する:
\\\`${hallOfFamePath}\\\`

現 pass の section のみ (例: "## Pass 1" for Getting Started) を読む。
file 全体を一度に読まない。 これで context が focused に保たれる。`;
}
