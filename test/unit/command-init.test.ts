import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from '../../src/commands/init.js';
import { readRegistry } from 'dispatch-core/src/registry/read.js';
import { writeRegistry } from 'dispatch-core/src/registry/write.js';

describe('runInit', () => {
  async function setup(): Promise<{ dir: string; registryPath: string }> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t06-'));
    return { dir, registryPath: join(dir, 'sessions.json') };
  }

  it('registers a new session with the expected entry', async () => {
    const { dir, registryPath } = await setup();
    try {
      await runInit({
        name: 'sherpa',
        cwd: '/tmp',
        target: 'sherpa:0.0',
        registryPath,
      });
      const registry = await readRegistry(registryPath);
      expect(registry.sessions.sherpa).toEqual({
        cwd: '/tmp',
        tmux_target: 'sherpa:0.0',
        handoff_path: '/tmp/HANDOFF.md',
        last_prompt_sent_at: null,
        last_handoff_pulled_at: null,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('errors (does not overwrite) when a session with the same name exists', async () => {
    const { dir, registryPath } = await setup();
    try {
      await writeRegistry(registryPath, {
        version: 1,
        sessions: {
          sherpa: {
            cwd: '/existing/path',
            tmux_target: 'sherpa:0.0',
            handoff_path: '/existing/path/HANDOFF.md',
            last_prompt_sent_at: null,
            last_handoff_pulled_at: null,
          },
        },
      });
      await expect(
        runInit({
          name: 'sherpa',
          cwd: '/different/path',
          target: 'sherpa:1.0',
          registryPath,
        }),
      ).rejects.toThrow(/already registered/);
      const registry = await readRegistry(registryPath);
      expect(registry.sessions.sherpa.cwd).toBe('/existing/path');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('errors cleanly when the tmux target format is invalid', async () => {
    const { dir, registryPath } = await setup();
    try {
      await expect(
        runInit({
          name: 'sherpa',
          cwd: '/tmp',
          target: 'not-a-valid-target',
          registryPath,
        }),
      ).rejects.toThrow(/tmux_target|target|format/i);
      // Registry should not have been written.
      const registry = await readRegistry(registryPath);
      expect(registry.sessions).toEqual({});
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
