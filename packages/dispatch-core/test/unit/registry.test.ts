import { describe, it, expect } from 'vitest';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRegistry } from '../../src/registry/read.js';
import { writeRegistry } from '../../src/registry/write.js';
import { RegistrySchema } from '../../src/registry/schema.js';
import type { Registry } from '../../src/registry/schema.js';

describe('readRegistry', () => {
  it('returns the default registry when sessions.json does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t01-'));
    try {
      const path = join(dir, 'sessions.json');
      const registry = await readRegistry(path);
      expect(registry).toEqual({ version: 1, sessions: {} });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('RegistrySchema', () => {
  const validSession = {
    cwd: '/Users/op/code/sherpa',
    tmux_target: 'sherpa:0.0',
    handoff_path: '/Users/op/code/sherpa/HANDOFF.md',
    last_prompt_sent_at: null,
    last_handoff_pulled_at: null,
  };

  it('parses a valid registry cleanly', () => {
    const input = {
      version: 1,
      sessions: { sherpa: validSession },
    };
    const result = RegistrySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessions.sherpa).toEqual(validSession);
    }
  });

  it('fails when `version` is missing', () => {
    const input = { sessions: {} };
    const result = RegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('fails when a session is missing `cwd`', () => {
    const { cwd: _cwd, ...rest } = validSession;
    const input = {
      version: 1,
      sessions: { sherpa: rest },
    };
    const result = RegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('fails when a session is missing `tmux_target`', () => {
    const { tmux_target: _t, ...rest } = validSession;
    const input = {
      version: 1,
      sessions: { sherpa: rest },
    };
    const result = RegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('fails when a session name key is the empty string', () => {
    const input = {
      version: 1,
      sessions: { '': validSession },
    };
    const result = RegistrySchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('registry read/write round-trip', () => {
  const sampleRegistry: Registry = {
    version: 1,
    sessions: {
      sherpa: {
        cwd: '/Users/op/code/sherpa',
        tmux_target: 'sherpa:0.0',
        handoff_path: '/Users/op/code/sherpa/HANDOFF.md',
        last_prompt_sent_at: '2026-04-21T12:00:00.000Z',
        last_handoff_pulled_at: null,
      },
    },
  };

  it('writeRegistry then readRegistry round-trips losslessly', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t03-'));
    try {
      const path = join(dir, 'sessions.json');
      await writeRegistry(path, sampleRegistry);
      const roundTripped = await readRegistry(path);
      expect(roundTripped).toEqual(sampleRegistry);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('readRegistry on malformed JSON throws an error that names the file path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t03-'));
    try {
      const path = join(dir, 'sessions.json');
      await writeFile(path, '{not valid json', 'utf8');
      await expect(readRegistry(path)).rejects.toThrow(path);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('writeRegistry creates the parent directory if it is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t03-'));
    try {
      const nested = join(dir, 'deep', 'nested', 'dir');
      const path = join(nested, 'sessions.json');
      await writeRegistry(path, sampleRegistry);
      const dirStat = await stat(nested);
      expect(dirStat.isDirectory()).toBe(true);
      const roundTripped = await readRegistry(path);
      expect(roundTripped).toEqual(sampleRegistry);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
