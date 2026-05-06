/**
 * MB-F-DAEMON-REGISTRY-FIX WB5 — recovery-script CLI tests.
 *
 * Operator runs `node scripts/recover-sessions-json.mjs` post-merge
 * to repair the live ~/.foxworks-dispatch/sessions.json without
 * waiting for the next daemon restart's auto-recovery (WB4). The
 * script must:
 *
 *   - Be safe to run on a valid file (no-op, exit 0).
 *   - Detect the operator-observed corruption signature and recover
 *     by dropping the extra `}` past the valid JSON.
 *   - Backup original to <path>.corrupt-<ISO-timestamp> before any
 *     write, so the operator can manually restore if the recovery
 *     guess is wrong.
 *   - Write the recovered content via the same atomic-write helper
 *     used by the daemon (writeAtomicJson with v2 schema validator).
 *   - Refuse to write on unrecoverable garbage.
 *   - --dry-run never mutates state.
 *
 * Tests invoke the script via `node <path> ...` (child_process) and
 * assert exit code + filesystem state. Real I/O on mkdtemp-isolated
 * paths.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  appendFile,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const execFileP = promisify(execFile);

const SCRIPT = resolve(
  import.meta.dirname,
  '../../scripts/recover-sessions-json.mjs',
);

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function run(args: string[]): Promise<RunResult> {
  try {
    const r = await execFileP(process.execPath, [SCRIPT, ...args]);
    return { code: 0, stdout: r.stdout, stderr: r.stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

describe('WB5 — recover-sessions-json.mjs', () => {
  let tmpDir: string | null = null;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      tmpDir = null;
    }
  });

  async function mkPath(): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'fd-wb5-recover-'));
    return join(tmpDir, 'sessions.json');
  }

  function validV2(): string {
    return `${JSON.stringify({ version: 2, sessions: {} }, null, 2)}\n`;
  }

  it('R1 dry-run on valid file → exit 0, no mutation, no sidecar', async () => {
    const path = await mkPath();
    const original = validV2();
    await writeFile(path, original, 'utf8');

    const r = await run(['--in', path, '--dry-run']);
    expect(r.code).toBe(0);

    expect(await readFile(path, 'utf8')).toBe(original);
    const entries = await readdir(dirname(path));
    expect(entries.some((e) => e.includes('.corrupt-'))).toBe(false);
  });

  it('R2 dry-run on operator-style corruption → reports diagnosis on stderr, exit non-zero, no mutation', async () => {
    const path = await mkPath();
    const good = validV2();
    await writeFile(path, good, 'utf8');
    await appendFile(path, '}\n', 'utf8');
    const corruptBytes = await readFile(path, 'utf8');

    const r = await run(['--in', path, '--dry-run']);
    expect(r.code).not.toBe(0);
    // Diagnosis should mention something about JSON / parse / corrupt
    expect(r.stderr.length).toBeGreaterThan(0);

    expect(await readFile(path, 'utf8')).toBe(corruptBytes);
    const entries = await readdir(dirname(path));
    expect(entries.some((e) => e.includes('.corrupt-'))).toBe(false);
  });

  it('R3 in-place recovery of operator-style corruption → backup written, target valid + schema-validates', async () => {
    const path = await mkPath();
    const good = validV2();
    await writeFile(path, good, 'utf8');
    await appendFile(path, '}\n', 'utf8');
    const corruptBytes = await readFile(path, 'utf8');

    const r = await run(['--in', path]);
    expect(r.code).toBe(0);

    const targetBody = await readFile(path, 'utf8');
    expect(JSON.parse(targetBody)).toEqual({ version: 2, sessions: {} });

    const dir = dirname(path);
    const entries = await readdir(dir);
    const sidecars = entries.filter((e) => e.startsWith('sessions.json.corrupt-'));
    expect(sidecars).toHaveLength(1);
    expect(await readFile(join(dir, sidecars[0]!), 'utf8')).toBe(corruptBytes);
  });

  it('R4 unrecoverable garbage → exits non-zero, no backup, no mutation', async () => {
    const path = await mkPath();
    const garbage = 'this is not json and never was\n';
    await writeFile(path, garbage, 'utf8');

    const r = await run(['--in', path]);
    expect(r.code).not.toBe(0);

    expect(await readFile(path, 'utf8')).toBe(garbage);
    const entries = await readdir(dirname(path));
    expect(entries.some((e) => e.includes('.corrupt-'))).toBe(false);
  });

  it('R5 trailing-whitespace "corruption" → repaired to canonical newline-terminated form', async () => {
    const path = await mkPath();
    // Valid JSON but with stray trailing whitespace + missing
    // canonical trailing newline.
    const noisy = `${JSON.stringify({ version: 2, sessions: {} }, null, 2)}   \t   `;
    await writeFile(path, noisy, 'utf8');

    const r = await run(['--in', path]);
    expect(r.code).toBe(0);

    const targetBody = await readFile(path, 'utf8');
    // Canonical form: pretty-printed v2 + single trailing \n.
    expect(targetBody).toBe(validV2());

    const dir = dirname(path);
    const entries = await readdir(dir);
    const sidecars = entries.filter((e) => e.startsWith('sessions.json.corrupt-'));
    expect(sidecars).toHaveLength(1);
    expect(await readFile(join(dir, sidecars[0]!), 'utf8')).toBe(noisy);
  });
});
