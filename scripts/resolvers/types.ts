/**
 * Resolver type definitions.
 *
 * Phase 3 では Host = 'claude' のみ enabled、Resolver の中身は空 stub。
 * Phase 4+ で他 host や resolver 本体を加える時、ここの型はそのまま使える
 * よう gstack 本家の構造をなぞっている。
 */

import { ALL_HOST_CONFIGS } from '../../hosts/index';

/**
 * Host type — derived from host configs in hosts/*.ts.
 * Adding a new host: create hosts/<name>.ts + add to hosts/index.ts.
 * Do NOT hardcode host names here.
 */
export type Host = (typeof ALL_HOST_CONFIGS)[number]['name'];

export interface HostPaths {
  skillRoot: string;
  localSkillRoot: string;
  binDir: string;
}

/**
 * HOST_PATHS — derived from host configs.
 * Non-Claude hosts (Phase 4+) will use $UZUSTACK_ROOT env vars (set by preamble).
 */
function buildHostPaths(): Record<string, HostPaths> {
  const paths: Record<string, HostPaths> = {};
  for (const config of ALL_HOST_CONFIGS) {
    if (config.usesEnvVars) {
      paths[config.name] = {
        skillRoot: '$UZUSTACK_ROOT',
        localSkillRoot: config.localSkillRoot,
        binDir: '$UZUSTACK_BIN',
      };
    } else {
      const root = `~/${config.globalRoot}`;
      paths[config.name] = {
        skillRoot: root,
        localSkillRoot: config.localSkillRoot,
        binDir: `${root}/bin`,
      };
    }
  }
  return paths;
}

export const HOST_PATHS: Record<string, HostPaths> = buildHostPaths();

export interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];
  host: Host;
  paths: HostPaths;
  preambleTier?: number;
  interactive?: boolean;
}

/** Resolver function signature. args is populated for parameterized placeholders like {{INVOKE_SKILL:name}}. */
export type ResolverFn = (ctx: TemplateContext, args?: string[]) => string;
