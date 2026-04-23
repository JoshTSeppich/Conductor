import { join } from 'node:path';
import { readRegistry } from '../../packages/dispatch-core/src/registry/read.js';
import { writeRegistry } from '../../packages/dispatch-core/src/registry/write.js';
import type { Session } from '../../packages/dispatch-core/src/registry/schema.js';

const TARGET_RE = /^[^:]+:\d+\.\d+$/;

export interface InitArgs {
  name: string;
  cwd: string;
  target: string;
  registryPath?: string;
}

export async function runInit(args: InitArgs): Promise<void> {
  if (!TARGET_RE.test(args.target)) {
    throw new Error(
      `invalid tmux_target "${args.target}"; expected <session>:<window>.<pane>, e.g. sherpa:0.0`,
    );
  }

  const registry = await readRegistry(args.registryPath);
  if (registry.sessions[args.name]) {
    throw new Error(
      `session "${args.name}" is already registered. Pick a different name or remove the existing entry from the registry first.`,
    );
  }

  const session: Session = {
    cwd: args.cwd,
    tmux_target: args.target,
    handoff_path: join(args.cwd, 'HANDOFF.md'),
    last_prompt_sent_at: null,
    last_handoff_pulled_at: null,
  };
  registry.sessions[args.name] = session;
  await writeRegistry(args.registryPath, registry);
}
