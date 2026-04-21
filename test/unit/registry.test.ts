import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRegistry } from '../../src/registry/read.js';

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
