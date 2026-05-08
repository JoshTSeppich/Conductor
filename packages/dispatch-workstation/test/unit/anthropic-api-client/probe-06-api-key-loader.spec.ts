// MB-T34 WB1 RED — probe-06: loadApiKey file-first / env-var fallback.
//
// Asserts:
//   1. file present + non-empty → returns trimmed content
//   2. file with trailing newline → trimmed (matches operator-stated
//      "single line, no trailing newline" intent for the source file)
//   3. file present + whitespace-only → falls through to env var
//   4. file missing + env var set → returns env var
//   5. file missing + env var unset → returns null
//   6. file present + non-empty AND env var set → file wins (file-first)
//
// Q-MBT34-3=(b) operator-acked HALT 0 2026-05-08.
//
// WB1 RED: loadApiKey stub returns null. WB5 turns this probe GREEN.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadApiKey } from '../../../src/main/anthropic-api-client.js';

let tmpDir: string;
let keyFile: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mb-t34-probe-06-'));
  keyFile = path.join(tmpDir, 'api-key');
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('MB-T34 WB1 RED — loadApiKey file-first + env fallback', () => {
  it('returns trimmed file content when file present and non-empty', async () => {
    await fs.writeFile(keyFile, 'sk-ant-secret-key-x', 'utf-8');
    const key = await loadApiKey({
      filePath: keyFile,
      envKey: 'TEST_ANTHROPIC_KEY',
      env: {},
    });
    expect(key).toBe('sk-ant-secret-key-x');
  });

  it('trims trailing newline / whitespace from file content', async () => {
    await fs.writeFile(keyFile, 'sk-ant-secret-key-x\n', 'utf-8');
    const key = await loadApiKey({
      filePath: keyFile,
      envKey: 'TEST_ANTHROPIC_KEY',
      env: {},
    });
    expect(key).toBe('sk-ant-secret-key-x');
  });

  it('falls through to env var when file is whitespace-only', async () => {
    await fs.writeFile(keyFile, '   \n\n', 'utf-8');
    const key = await loadApiKey({
      filePath: keyFile,
      envKey: 'TEST_ANTHROPIC_KEY',
      env: { TEST_ANTHROPIC_KEY: 'env-key-fallback' },
    });
    expect(key).toBe('env-key-fallback');
  });

  it('uses env var when file is missing', async () => {
    const key = await loadApiKey({
      filePath: path.join(tmpDir, 'nonexistent'),
      envKey: 'TEST_ANTHROPIC_KEY',
      env: { TEST_ANTHROPIC_KEY: 'env-only-key' },
    });
    expect(key).toBe('env-only-key');
  });

  it('returns null when both file missing and env var unset', async () => {
    const key = await loadApiKey({
      filePath: path.join(tmpDir, 'nonexistent'),
      envKey: 'TEST_ANTHROPIC_KEY',
      env: {},
    });
    expect(key).toBeNull();
  });

  it('file-first: file content wins when both file and env are set', async () => {
    await fs.writeFile(keyFile, 'file-key', 'utf-8');
    const key = await loadApiKey({
      filePath: keyFile,
      envKey: 'TEST_ANTHROPIC_KEY',
      env: { TEST_ANTHROPIC_KEY: 'env-key' },
    });
    expect(key).toBe('file-key');
  });
});
