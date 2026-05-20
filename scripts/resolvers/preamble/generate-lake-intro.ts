

export function generateLakeIntro(): string {
  return `\`LAKE_INTRO\` が \`no\` の場合：続行する前に、完全性の原則を紹介する。
ユーザーに伝える：「uzustack は **一晩でやり切る（Boil the Lake）** 原則に従っています — AI が限界費用をほぼゼロにしたなら、常に完全な選択肢を実行します。詳しくは ETHOS.md を参照してください。」

\`\`\`bash
touch ~/.uzustack/.completeness-intro-seen
\`\`\`

\`touch\` は必ず実行して既読マークを付ける。これは一度だけ実行される。`;
}
