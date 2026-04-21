import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Writable } from 'node:stream';
import { archiveRoot as defaultArchiveRoot } from '../lib/paths.js';
import { copyToClipboard as defaultClipboard } from '../lib/clipboard.js';
import { readRegistry } from '../registry/read.js';
import { writeRegistry } from '../registry/write.js';

export interface PullArgs {
  name: string;
  registryPath?: string;
  archiveRoot?: string;
  now?: Date;
  stdout?: Writable;
  stderr?: Writable;
  clipboard?: (content: string) => Promise<void>;
}

/**
 * Read the registered session's HANDOFF.md, print it to stdout, copy it
 * to the clipboard via pbcopy, archive a time-stamped copy under
 * <archiveRoot>/<name>/, and stamp last_handoff_pulled_at on the registry.
 *
 * If the hand-off file's mtime is older than the last prompt we sent to
 * this session, warn on stderr but still print the content — the
 * operator decides whether the hand-off is fresh enough.
 */
export async function runPull(args: PullArgs): Promise<void> {
  const stdout = args.stdout ?? process.stdout;
  const stderr = args.stderr ?? process.stderr;
  const clipboard = args.clipboard ?? defaultClipboard;

  const registry = await readRegistry(args.registryPath);
  const session = registry.sessions[args.name];
  if (!session) {
    throw new Error(
      `no session registered as "${args.name}". Check "fd list".`,
    );
  }

  let content: string;
  try {
    content = await readFile(session.handoff_path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `expected HANDOFF.md at ${session.handoff_path} — not found. ` +
          `Is the Claude Code session still working? Check the pane directly with "tmux attach -t ${session.tmux_target}".`,
      );
    }
    throw err;
  }

  if (session.last_prompt_sent_at) {
    const handoffStat = await stat(session.handoff_path);
    const sentAt = new Date(session.last_prompt_sent_at);
    if (handoffStat.mtime < sentAt) {
      stderr.write(
        `warning: hand-off at ${session.handoff_path} is stale ` +
          `(mtime=${handoffStat.mtime.toISOString()}, ` +
          `last prompt sent at ${session.last_prompt_sent_at}). ` +
          `Printing anyway — verify the session actually wrote a fresh note.\n`,
      );
    }
  }

  stdout.write(content);
  await clipboard(content);

  const now = args.now ?? new Date();
  const ts = now.toISOString().replace(/:/g, '-');
  const archiveDir = join(args.archiveRoot ?? defaultArchiveRoot(), args.name);
  await mkdir(archiveDir, { recursive: true });
  await writeFile(join(archiveDir, `${ts}.handoff.md`), content, 'utf8');

  session.last_handoff_pulled_at = now.toISOString();
  await writeRegistry(args.registryPath, registry);
}
