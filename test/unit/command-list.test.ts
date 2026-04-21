import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runList } from '../../src/commands/list.js';
import { writeRegistry } from '../../src/registry/write.js';

describe('runList', () => {
  async function setup(): Promise<{ dir: string; registryPath: string }> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t07-'));
    return { dir, registryPath: join(dir, 'sessions.json') };
  }

  it('prints nothing when the registry is empty', async () => {
    const { dir, registryPath } = await setup();
    try {
      const out = await runList({ registryPath });
      expect(out).toBe('');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints one tab-separated line per session (name\\tcwd\\ttmux_target)', async () => {
    const { dir, registryPath } = await setup();
    try {
      await writeRegistry(registryPath, {
        version: 1,
        sessions: {
          alpha: {
            cwd: '/a',
            tmux_target: 'alpha:0.0',
            handoff_path: '/a/HANDOFF.md',
            last_prompt_sent_at: null,
            last_handoff_pulled_at: null,
          },
          bravo: {
            cwd: '/b',
            tmux_target: 'bravo:1.0',
            handoff_path: '/b/HANDOFF.md',
            last_prompt_sent_at: null,
            last_handoff_pulled_at: null,
          },
        },
      });
      const out = await runList({ registryPath });
      const lines = out.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(lines).toContain('alpha\t/a\talpha:0.0');
      expect(lines).toContain('bravo\t/b\tbravo:1.0');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
