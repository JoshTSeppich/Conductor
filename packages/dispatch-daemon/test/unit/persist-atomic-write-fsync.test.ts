/**
 * MB-F-DAEMON-REGISTRY-FIX WB2 — fsync-between-writeFile-and-rename
 * unit test.
 *
 * Closes the durability gap from Phase 1 §1.3 #1: today's
 * writeRegistryV2 calls writeFile + rename without an explicit fsync
 * between them. macOS APFS may flush data after the rename completes;
 * power loss between writeFile-completes and the kernel flushing data
 * blocks can leave a renamed-but-zero-content file. fsync guarantees
 * durable bytes before the rename.
 *
 * Probe asserts the fs ordering: open(tmp) → write → sync → close →
 * rename. Records the call sequence by mocking node:fs/promises with a
 * partial pass-through (vi.mock) and intercepting the FileHandle
 * methods.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { calls } = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: vi.fn(async (path: Parameters<typeof actual.open>[0], flags?: Parameters<typeof actual.open>[1]) => {
      const handle = await actual.open(path, flags as never);
      const origWrite = handle.write.bind(handle);
      const origSync = handle.sync.bind(handle);
      const origClose = handle.close.bind(handle);
      handle.write = (async (...a: Parameters<typeof origWrite>) => {
        calls.push('write');
        return origWrite(...a);
      }) as typeof handle.write;
      handle.sync = async () => {
        calls.push('sync');
        return origSync();
      };
      handle.close = async () => {
        calls.push('close');
        return origClose();
      };
      return handle;
    }),
    rename: vi.fn(async (...args: Parameters<typeof actual.rename>) => {
      calls.push('rename');
      return actual.rename(...args);
    }),
  };
});

const { writeAtomicJson } = await import('../../src/persist/atomic-write.js');

describe('WB2 — writeAtomicJson fsync gate', () => {
  let tmpDir: string | null = null;

  beforeEach(() => {
    calls.length = 0;
  });

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      tmpDir = null;
    }
  });

  async function mkPath(): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'fd-persist-fsync-'));
    return join(tmpDir, 'value.json');
  }

  it('P1 fsync — write→sync→close→rename ordering observed', async () => {
    const path = await mkPath();
    await writeAtomicJson(path, { a: 1 });

    const writeIdx = calls.indexOf('write');
    const syncIdx = calls.indexOf('sync');
    const closeIdx = calls.indexOf('close');
    const renameIdx = calls.indexOf('rename');
    expect(writeIdx).toBeGreaterThanOrEqual(0);
    expect(syncIdx).toBeGreaterThan(writeIdx);
    expect(closeIdx).toBeGreaterThan(syncIdx);
    expect(renameIdx).toBeGreaterThan(closeIdx);
  });

  it('P2 fsync:false opt — sync is skipped, write→close→rename still observed', async () => {
    const path = await mkPath();
    await writeAtomicJson(path, { a: 1 }, { fsync: false });

    expect(calls).not.toContain('sync');
    const writeIdx = calls.indexOf('write');
    const closeIdx = calls.indexOf('close');
    const renameIdx = calls.indexOf('rename');
    expect(writeIdx).toBeGreaterThanOrEqual(0);
    expect(closeIdx).toBeGreaterThan(writeIdx);
    expect(renameIdx).toBeGreaterThan(closeIdx);
  });
});
