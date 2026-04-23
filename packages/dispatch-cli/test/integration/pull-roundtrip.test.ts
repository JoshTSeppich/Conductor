/**
 * FD-T09 — integration tests for `fd pull`.
 *
 * The pull command is pure filesystem + pbcopy — no tmux. So instead of a
 * real pbcopy invocation (which would pollute the developer's clipboard
 * every time the suite runs), we vi.mock('node:child_process') here.
 *
 * The mock captures any execFile call to pbcopy (command + args + stdin
 * payload) into a module-local record, so test 6 can assert pbcopy was
 * invoked with the hand-off content. Tests 1–5 also run under the mock,
 * but they don't inspect the pbcopy record — the mock just silently
 * consumes the call and lets the test complete.
 *
 * The filesystem side stays real (per §5 reminder #4): mkdtemp-backed
 * temp workdirs, real HANDOFF.md files, real utimes for mtime control.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Writable } from 'node:stream';

// ---- vi.mock setup --------------------------------------------------------
// Captured pbcopy invocations. Reset in beforeEach.
interface PbcopyRecord {
  cmd: string;
  args: string[];
  stdin: string;
}
const pbcopyRecords: PbcopyRecord[] = [];

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

beforeEach(() => {
  pbcopyRecords.length = 0;
  execFileMock.mockReset();
  execFileMock.mockImplementation(
    (cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
      let stdinData = '';
      const child = {
        stdin: {
          end: (data?: string) => {
            if (data !== undefined) stdinData = data;
            if (cmd === 'pbcopy') {
              pbcopyRecords.push({ cmd, args, stdin: stdinData });
            }
            setImmediate(() => cb(null, '', ''));
          },
        },
      };
      return child as unknown;
    },
  );
});

// Imports that depend on node:child_process must come AFTER the vi.mock.
// vi.mock is hoisted by vitest to the top of the module, so this order is
// only relevant visually.
import { runPull } from '../../src/commands/pull.js';
import { readRegistry } from 'dispatch-core/src/registry/read.js';
import { writeRegistry } from 'dispatch-core/src/registry/write.js';
import type { Registry } from 'dispatch-core/src/registry/schema.js';

// ---- test helpers ---------------------------------------------------------
function makeRegistry(
  handoffPath: string,
  cwd: string,
  opts: { last_prompt_sent_at?: string | null } = {},
): Registry {
  return {
    version: 1,
    sessions: {
      testname: {
        cwd,
        tmux_target: 'sherpa:0.0',
        handoff_path: handoffPath,
        last_prompt_sent_at: opts.last_prompt_sent_at ?? null,
        last_handoff_pulled_at: null,
      },
    },
  };
}

function sink(): { write: Writable; chunks: string[] } {
  const chunks: string[] = [];
  const write = new (require('node:stream').Writable)({
    write(chunk: Buffer, _enc: BufferEncoding, cb: () => void) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  return { write, chunks };
}

// ---- tests ----------------------------------------------------------------
describe('runPull', () => {
  let workDir: string;
  let registryPath: string;
  let archiveTmp: string;
  let handoffPath: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'fd-t09-'));
    registryPath = join(workDir, 'sessions.json');
    archiveTmp = join(workDir, 'archive');
    handoffPath = join(workDir, 'HANDOFF.md');
  });

  afterEach(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it('prints HANDOFF.md content to stdout', async () => {
    const content = 'phase 0 complete — see SPIKES.md\n';
    await writeFile(handoffPath, content, 'utf8');
    await writeRegistry(registryPath, makeRegistry(handoffPath, workDir));

    const { write: stdout, chunks } = sink();
    const { write: stderr } = sink();
    await runPull({
      name: 'testname',
      registryPath,
      archiveRoot: archiveTmp,
      stdout,
      stderr,
    });
    expect(chunks.join('')).toBe(content);
  });

  it('archives the hand-off to <archiveRoot>/<name>/<ts>.handoff.md', async () => {
    const content = 'hand-off body\n';
    await writeFile(handoffPath, content, 'utf8');
    await writeRegistry(registryPath, makeRegistry(handoffPath, workDir));

    const fixedNow = new Date('2026-04-21T14:00:00.000Z');
    const { write: stdout } = sink();
    await runPull({
      name: 'testname',
      registryPath,
      archiveRoot: archiveTmp,
      stdout,
      now: fixedNow,
    });

    const sessionArchive = join(archiveTmp, 'testname');
    const files = await readdir(sessionArchive);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.handoff\.md$/);
    expect(files[0]).toContain('2026-04-21T14-00-00');
    const archived = await readFile(join(sessionArchive, files[0]), 'utf8');
    expect(archived).toBe(content);
  });

  it('updates last_handoff_pulled_at after the pull', async () => {
    await writeFile(handoffPath, 'done', 'utf8');
    await writeRegistry(registryPath, makeRegistry(handoffPath, workDir));
    const fixedNow = new Date('2026-04-21T15:00:00.000Z');

    const { write: stdout } = sink();
    await runPull({
      name: 'testname',
      registryPath,
      archiveRoot: archiveTmp,
      stdout,
      now: fixedNow,
    });
    const registry = await readRegistry(registryPath);
    expect(registry.sessions.testname.last_handoff_pulled_at).toBe(fixedNow.toISOString());
  });

  it('errors cleanly when HANDOFF.md is missing, naming the expected path', async () => {
    // NOTE: handoffPath file is not created in this test.
    await writeRegistry(registryPath, makeRegistry(handoffPath, workDir));

    const { write: stdout } = sink();
    await expect(
      runPull({
        name: 'testname',
        registryPath,
        archiveRoot: archiveTmp,
        stdout,
      }),
    ).rejects.toThrow(handoffPath);
  });

  it('warns on stderr when HANDOFF.md mtime is older than last_prompt_sent_at (but still prints the content)', async () => {
    const content = 'stale hand-off';
    await writeFile(handoffPath, content, 'utf8');
    // Force mtime into the past.
    const past = new Date('2026-04-21T10:00:00.000Z');
    await utimes(handoffPath, past, past);
    const afterPast = new Date('2026-04-21T11:00:00.000Z');
    await writeRegistry(
      registryPath,
      makeRegistry(handoffPath, workDir, { last_prompt_sent_at: afterPast.toISOString() }),
    );

    const { write: stdout, chunks: stdoutChunks } = sink();
    const { write: stderr, chunks: stderrChunks } = sink();
    await runPull({
      name: 'testname',
      registryPath,
      archiveRoot: archiveTmp,
      stdout,
      stderr,
    });

    expect(stdoutChunks.join('')).toBe(content);
    expect(stderrChunks.join('')).toMatch(/stale/i);
  });

  it('copies the hand-off to the clipboard via pbcopy', async () => {
    const content = 'clipboard content\n';
    await writeFile(handoffPath, content, 'utf8');
    await writeRegistry(registryPath, makeRegistry(handoffPath, workDir));

    const { write: stdout } = sink();
    await runPull({
      name: 'testname',
      registryPath,
      archiveRoot: archiveTmp,
      stdout,
    });

    expect(pbcopyRecords).toHaveLength(1);
    expect(pbcopyRecords[0].cmd).toBe('pbcopy');
    expect(pbcopyRecords[0].args).toEqual([]);
    expect(pbcopyRecords[0].stdin).toBe(content);
  });
});
