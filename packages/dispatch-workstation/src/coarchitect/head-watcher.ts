import { execSync } from 'node:child_process';

/** Return the current HEAD commit SHA for a git repository. */
export async function getHeadSha(repoRoot: string): Promise<string> {
  return execSync('git rev-parse HEAD', {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

interface HeadWatcherOptions {
  pollIntervalMs?: number;
}

/**
 * Polls the HEAD SHA of a git repository at a configurable interval.
 * Fires onChange(newSha, previousSha) when HEAD advances.
 * Implementation choice: polling (simple, cross-platform) per P-0.5 §8 deferred
 * item; fs.watch on .git/refs/heads/<branch> considered but polling chosen for
 * reliability across all git operations (rebase, detach, etc.).
 */
export class HeadWatcher {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSha: string | null = null;

  constructor(
    private readonly repoRoot: string,
    private readonly onChange: (newSha: string, previousSha: string) => void,
    private readonly opts: HeadWatcherOptions = {},
  ) {}

  start(): void {
    const interval = this.opts.pollIntervalMs ?? 5_000;

    // Capture initial SHA without firing onChange
    void (async () => {
      try {
        this.lastSha = await getHeadSha(this.repoRoot);
      } catch {
        // repo not ready yet
      }
    })();

    this.timer = setInterval(() => {
      void (async () => {
        try {
          const sha = await getHeadSha(this.repoRoot);
          if (this.lastSha !== null && sha !== this.lastSha) {
            const prev = this.lastSha;
            this.lastSha = sha;
            this.onChange(sha, prev);
          } else {
            this.lastSha = sha;
          }
        } catch {
          // repo temporarily inaccessible — ignore
        }
      })();
    }, interval);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
