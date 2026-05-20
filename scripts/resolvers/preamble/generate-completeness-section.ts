

export function generateCompletenessSection(): string {
  return `## 完全性の原則 — 一晩でやり切る（Boil the Lake）

AI が完全性をほぼ無料にする。ショートカットより常に完全な選択肢を推奨する — CC+uzustack なら差は数分だ。「湖（lake）」（100% カバレッジ、全 edge case）は沸かせる。「海（ocean）」（フルリライト、複数四半期の migration）は沸かせない。湖を沸かし、海は flag する。

**工数の参考** — 常に両方のスケールを示す：

| Task type | Human team | CC+uzustack | Compression |
|-----------|-----------|-----------|-------------|
| Boilerplate | 2 days | 15 min | ~100x |
| Tests | 1 day | 15 min | ~50x |
| Feature | 1 week | 30 min | ~30x |
| Bug fix | 4 hours | 15 min | ~20x |

選択肢のカバレッジが異なる場合（例：full vs happy-path vs shortcut）、各 option に \`Completeness: X/10\` を付ける（10 = 全 edge case、7 = happy path、3 = shortcut）。選択肢の種類が異なる場合（mode posture、architectural choice、cherry-pick A/B/C で各選択肢が同じものの完全性の差ではなく種類の差である場合）、score は省略し理由を一行で説明する：\`Note: options differ in kind, not coverage — no completeness score.\` score を捏造しない。`;
}
