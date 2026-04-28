/**
 * Host config registry.
 *
 * Phase 3: claude のみ enabled。
 * Phase 4+ で他 host を足す時は hosts/<name>.ts を作って
 * ALL_HOST_CONFIGS に push するだけで通る構造を維持する。
 */

import type { HostConfig } from '../scripts/host-config';
import claude from './claude';

/** All registered host configs. Add new hosts here. */
export const ALL_HOST_CONFIGS: HostConfig[] = [claude];

/** Map from host name to config. */
export const HOST_CONFIG_MAP: Record<string, HostConfig> = Object.fromEntries(
  ALL_HOST_CONFIGS.map(c => [c.name, c])
);

/** Union type of all host names, derived from configs. */
export type Host = (typeof ALL_HOST_CONFIGS)[number]['name'];

/** All host names as a string array (for CLI arg validation, etc.). */
export const ALL_HOST_NAMES: string[] = ALL_HOST_CONFIGS.map(c => c.name);

/** Get a host config by name. Throws if not found. */
export function getHostConfig(name: string): HostConfig {
  const config = HOST_CONFIG_MAP[name];
  if (!config) {
    throw new Error(`Unknown host '${name}'. Valid hosts: ${ALL_HOST_NAMES.join(', ')}`);
  }
  return config;
}

/**
 * Resolve a host name from a CLI argument, handling aliases.
 */
export function resolveHostArg(arg: string): string {
  if (HOST_CONFIG_MAP[arg]) return arg;

  for (const config of ALL_HOST_CONFIGS) {
    if (config.cliAliases?.includes(arg)) return config.name;
  }

  throw new Error(`Unknown host '${arg}'. Valid hosts: ${ALL_HOST_NAMES.join(', ')}`);
}

/**
 * Get hosts that are NOT the primary host (Claude).
 * Phase 3 では空配列。Phase 4+ で他 host を入れた時、generated docs を
 * 必要とするのはこの集合になる。
 */
export function getExternalHosts(): HostConfig[] {
  return ALL_HOST_CONFIGS.filter(c => c.name !== 'claude');
}

export { claude };
