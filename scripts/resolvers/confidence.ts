/**
 * Confidence calibration resolver
 *
 * review を produce する skill に confidence scoring rubric を追加する。
 * 全 finding に 1-10 score を付けて display を gate する：
 *   7+: 通常表示
 *   5-6: caveat 付きで表示
 *   <5: 主 report からは抑制
 */
import type { TemplateContext } from './types';

export function generateConfidenceCalibration(_ctx: TemplateContext): string {
  return `## Confidence Calibration

全 finding に confidence score (1-10) を **必ず** 付与する：

| Score | 意味 | Display rule |
|-------|------|-------------|
| 9-10 | 具体 code を読んで検証済。 具体的な bug or exploit を実証。 | 通常表示 |
| 7-8 | 高 confidence の pattern match。 ほぼ確実に正しい。 | 通常表示 |
| 5-6 | 中程度。 false positive の可能性あり。 | caveat 付き表示：「Medium confidence、 実際に issue かどうか verify してください」 |
| 3-4 | Low confidence。 pattern は怪しいが問題ない可能性あり。 | 主 report からは抑制。 appendix にのみ含める。 |
| 1-2 | 推測。 | severity が P0 相当の時のみ report。 |

**Finding format:**

\\\`[SEVERITY] (confidence: N/10) file:line — description\\\`

例：
\\\`[P1] (confidence: 9/10) app/models/user.rb:42 — where 句の string interpolation で SQL injection\\\`
\\\`[P2] (confidence: 5/10) app/controllers/api/v1/users_controller.rb:18 — N+1 query の可能性、 production log で verify せよ\\\`

**Calibration learning:** confidence < 7 で report した finding を user が「実際に real issue」 と confirm した場合、 それは calibration event。 初期 confidence が低すぎた。 修正済 pattern を learning として記録し、 将来の review で高 confidence でキャッチできるようにする。`;
}
