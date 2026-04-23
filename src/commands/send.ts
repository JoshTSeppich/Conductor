import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { archiveRoot as defaultArchiveRoot } from 'dispatch-core/src/lib/paths.js';
import { assemble } from 'dispatch-core/src/prompt/assemble.js';
import { readRegistry } from 'dispatch-core/src/registry/read.js';
import { writeRegistry } from 'dispatch-core/src/registry/write.js';
import { hasSession, sendKeys } from 'dispatch-core/src/transport/tmux.js';

export interface SendArgs {
  name: string;
  promptFile: string;
  registryPath?: string;
  archiveRoot?: string;
  now?: Date;
}

/**
 * Read the prompt file, append the frozen hand-off footer (via assemble),
 * deliver the result to the registered tmux pane, archive the assembled
 * prompt, and update last_prompt_sent_at on the registry entry.
 *
 * Errors are human-readable and name the specific session/target so the
 * operator can see exactly what failed without reading a raw tmux stderr.
 */
export async function runSend(args: SendArgs): Promise<void> {
  const registry = await readRegistry(args.registryPath);
  const session = registry.sessions[args.name];
  if (!session) {
    throw new Error(
      `no session registered as "${args.name}". ` +
        `Run "fd init ${args.name} --cwd <path> --target <tmux-target>" first, ` +
        `or check "fd list" for existing names.`,
    );
  }

  const alive = await hasSession(session.tmux_target);
  if (!alive) {
    throw new Error(
      `session "${args.name}" is registered but its tmux target "${session.tmux_target}" is not currently running. ` +
        `Start the tmux pane first, then retry.`,
    );
  }

  const body = await readFile(args.promptFile, 'utf8');
  const assembled = assemble(body);
  await sendKeys(session.tmux_target, assembled);

  const now = args.now ?? new Date();
  const ts = now.toISOString().replace(/:/g, '-');
  const archiveDir = join(args.archiveRoot ?? defaultArchiveRoot(), args.name);
  await mkdir(archiveDir, { recursive: true });
  await writeFile(join(archiveDir, `${ts}.prompt.md`), assembled, 'utf8');

  session.last_prompt_sent_at = now.toISOString();
  await writeRegistry(args.registryPath, registry);
}
