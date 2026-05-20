

export function generateRepoModeSection(): string {
  return `## リポジトリ所有権 — 気づいたら声を上げる

\`REPO_MODE\` がブランチ外の問題をどう扱うかを制御する：
- **\`solo\`** — すべてを所有している。積極的に調査し、修正を提案する。
- **\`collaborative\`** / **\`unknown\`** — AskUserQuestion で flag し、修正しない（他の人の担当かもしれない）。

おかしいと思ったものは常に flag する — 一文で、何に気づいたか、その影響を伝える。`;
}
