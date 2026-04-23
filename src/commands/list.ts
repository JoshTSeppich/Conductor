import { readRegistry } from '../../packages/dispatch-core/src/registry/read.js';

export interface ListArgs {
  registryPath?: string;
}

/**
 * Return a machine-parseable listing of registered sessions: one line per
 * session, tab-separated fields `<name>\t<cwd>\t<tmux_target>`, each line
 * terminated with \n. Empty registry → empty string (so `fd list` prints
 * nothing and exits 0). Sessions are sorted by name for deterministic
 * diff-friendly output.
 */
export async function runList(args: ListArgs = {}): Promise<string> {
  const registry = await readRegistry(args.registryPath);
  const entries = Object.entries(registry.sessions).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  if (entries.length === 0) return '';
  return (
    entries
      .map(([name, s]) => `${name}\t${s.cwd}\t${s.tmux_target}`)
      .join('\n') + '\n'
  );
}
