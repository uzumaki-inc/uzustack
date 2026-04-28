import type { HostConfig } from '../scripts/host-config';

/**
 * Claude Code host config (Phase 3 で uzustack が現実に動かす唯一の host).
 *
 * runtimeRoot.globalSymlinks は **uzustack の現状に存在する asset のみ** に絞る。
 * gstack 本家は browse/dist や ETHOS.md を含むが uzustack には無いので入れない。
 * Phase 4+ で browse 等を取り込んだ時、ここに足す。
 */
const claude: HostConfig = {
  name: 'claude',
  displayName: 'Claude Code',
  cliCommand: 'claude',
  cliAliases: [],

  globalRoot: '.claude/skills/uzustack',
  localSkillRoot: '.claude/skills/uzustack',
  hostSubdir: '.claude',
  usesEnvVars: false,

  frontmatter: {
    mode: 'denylist',
    stripFields: ['sensitive', 'voice-triggers'],
    descriptionLimit: null,
  },

  generation: {
    generateMetadata: false,
  },

  pathRewrites: [],
  toolRewrites: {},
  // gbrain は uzustack 側で実体を持たない。Phase 4+ で要否を再検討するまで
  // resolver は registry に残しつつ Claude では空展開させる。
  suppressedResolvers: ['GBRAIN_CONTEXT_LOAD', 'GBRAIN_SAVE_RESULTS'],

  runtimeRoot: {
    globalSymlinks: ['bin'],
  },

  install: {
    prefixable: true,
    linkingStrategy: 'real-dir-symlink',
  },

  coAuthorTrailer: 'Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>',
  learningsMode: 'full',
};

export default claude;
