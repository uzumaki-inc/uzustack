import type { HostConfig } from '../scripts/host-config';

const kiro: HostConfig = {
  name: 'kiro',
  displayName: 'Kiro',
  cliCommand: 'kiro-cli',
  cliAliases: [],

  globalRoot: '.kiro/skills/uzustack',
  localSkillRoot: '.kiro/skills/uzustack',
  hostSubdir: '.kiro',
  usesEnvVars: true,

  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description'],
    descriptionLimit: null,
  },

  generation: {
    generateMetadata: false,
    skipSkills: ['codex'],  // Codex skill is a Claude wrapper around codex exec
  },

  pathRewrites: [
    { from: '~/.claude/skills/uzustack', to: '~/.kiro/skills/uzustack' },
    { from: '.claude/skills/uzustack', to: '.kiro/skills/uzustack' },
    { from: '.claude/skills', to: '.kiro/skills' },
    { from: '~/.codex/skills/uzustack', to: '~/.kiro/skills/uzustack' },
    { from: '.codex/skills', to: '.kiro/skills' },
  ],

  suppressedResolvers: ['GBRAIN_CONTEXT_LOAD', 'GBRAIN_SAVE_RESULTS'],

  runtimeRoot: {
    globalSymlinks: ['bin', 'browse/dist', 'browse/bin', 'uzustack-upgrade', 'ETHOS.md'],
    globalFiles: {
      'review': ['checklist.md', 'TODOS-format.md'],
    },
  },

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },

  learningsMode: 'basic',
};

export default kiro;
