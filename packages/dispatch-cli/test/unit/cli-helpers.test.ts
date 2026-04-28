/**
 * CLI-T01 — testable helpers unit tests.
 *
 * Per finding #36 framework: pure helpers (token loading,
 * daemon-error parsing, request-body builders, response
 * formatters) get red→green TDD; integration with the
 * shipped daemon endpoints is smoke-tested at CLI-T05 via
 * the existing fd v1 regression suite.
 *
 * Per Arbitration 1B (sequencing shape), T01 ships HTTP
 * variants alongside v1 functions; bin/fd.ts dispatches via
 * a thin layer that defaults to v1 (T04 inverts to probe-
 * HTTP-first). Existing 20 v1 tests stay green throughout
 * T01-T03 because the dispatcher's default keeps v1 path.
 *
 * Probes (5 total):
 *   P1 loadToken reads token from given path; throws helpful
 *      ENOENT-aware error when missing
 *   P2 formatDaemonError extracts {error: '...'} body when
 *      daemon-shape; falls back to status text otherwise
 *   P3 buildInitRequestBody({name, cwd, target}) → 4-field
 *      shape with handoff_path = join(cwd, 'HANDOFF.md')
 *      per v1 init.ts:32 convention
 *   P4 formatListOutput(sessions) → v1 list.ts:14-20
 *      verbatim shape (tab-separated, sorted, \n-terminated;
 *      empty array → empty string)
 *   P5 runInitDispatch (no useHttp opt) → invokes v1
 *      runInit (registry side effect observable; HTTP path
 *      would have required daemon; success without daemon
 *      proves v1 path was taken). Locks Shape-B-default-to-v1
 *      wiring against drift before T04 inverts.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRegistry } from 'dispatch-core/src/registry/read.js';
import { loadToken } from '../../src/lib/token.js';
import {
  formatDaemonError,
  buildInitRequestBody,
  formatListOutput,
} from '../../src/lib/daemon-client.js';
import { runInitDispatch } from '../../src/lib/dispatch.js';

describe('CLI-T01 — testable helpers', () => {
  let cleanupPaths: string[] = [];

  afterEach(async () => {
    for (const p of cleanupPaths) {
      await rm(p, { recursive: true, force: true }).catch(() => {
        /* best-effort */
      });
    }
    cleanupPaths = [];
  });

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-clit01-reg-'));
    cleanupPaths.push(dir);
    return join(dir, 'sessions.json');
  }

  it('P1 loadToken reads token from path; ENOENT throws helpful error', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fd-clit01-tok-'));
    cleanupPaths.push(dir);
    const tokenPath = join(dir, 'token');
    await writeFile(tokenPath, 'abc123-test-token\n', 'utf8');

    const value = await loadToken(tokenPath);
    expect(value).toBe('abc123-test-token');

    // Missing token: helpful error mentions path + suggests daemon-startup
    const missingPath = join(dir, 'does-not-exist');
    await expect(loadToken(missingPath)).rejects.toThrow(
      /token.+not found|daemon/i,
    );
  });

  it('P2 formatDaemonError extracts daemon-shape body or falls back', () => {
    // Daemon-shape body: {error: '...'}
    const fromBody = formatDaemonError(
      { status: 404, statusText: 'Not Found' } as Response,
      { error: 'no session registered as "sherpa"' },
    );
    expect(fromBody).toBe('no session registered as "sherpa"');

    // Body lacks error field — falls back to status text
    const fromStatus = formatDaemonError(
      { status: 500, statusText: 'Internal Server Error' } as Response,
      { unrelated: 'shape' },
    );
    expect(fromStatus).toContain('500');
    expect(fromStatus).toContain('Internal Server Error');

    // Body is null/undefined (network error, no JSON) — falls back
    const fromNull = formatDaemonError(
      { status: 0, statusText: '' } as Response,
      null,
    );
    expect(fromNull.length).toBeGreaterThan(0);
  });

  it('P3 buildInitRequestBody applies v1 init.ts:32 handoff_path convention', () => {
    const body = buildInitRequestBody({
      name: 'sherpa',
      cwd: '/Users/op/repos/sherpa',
      target: 'sherpa:0.0',
    });
    expect(body).toEqual({
      name: 'sherpa',
      cwd: '/Users/op/repos/sherpa',
      tmux_target: 'sherpa:0.0',
      handoff_path: '/Users/op/repos/sherpa/HANDOFF.md',
    });
  });

  it('P4 formatListOutput matches v1 list.ts:14-20 verbatim shape', () => {
    // Empty registry → empty string (v1 list.ts:18)
    expect(formatListOutput([])).toBe('');

    // Non-empty: sorted by name; tab-separated; \n-terminated
    const out = formatListOutput([
      { name: 'zebra', cwd: '/z', tmux_target: 'z:0.0' },
      { name: 'alpha', cwd: '/a', tmux_target: 'a:0.0' },
      { name: 'mango', cwd: '/m', tmux_target: 'm:0.0' },
    ]);
    expect(out).toBe(
      'alpha\t/a\ta:0.0\nmango\t/m\tm:0.0\nzebra\t/z\tz:0.0\n',
    );

    // Single entry: still trailing \n (v1 line 22 ends with + '\n')
    const single = formatListOutput([
      { name: 'one', cwd: '/o', tmux_target: 'o:0.0' },
    ]);
    expect(single).toBe('one\t/o\to:0.0\n');
  });

  it('P5 runInitDispatch default → v1 path (registry side effect observable)', async () => {
    const registryPath = await mkRegistryPath();
    // CLI-T05 adaptation per finding #29 (5th occurrence) +
    // finding #48 (cascade discovery): T04 inverted dispatcher
    // default to undefined-triggers-probe (was useHttp=false at
    // T01). Without explicit baseUrl, this test would probe the
    // default 127.0.0.1:7878 — passing under daemon-down env
    // (probe fails → v1) but FAILING under daemon-up env (probe
    // succeeds → HTTP → POSTs to real daemon's registry, NOT
    // the test's mkdtemp registry). Explicit unreachable baseUrl
    // 65535 makes the test daemon-environment-independent: probe
    // always fails → v1 path always taken → P5 assertion always
    // holds (matches T04 P2's daemon-independent pattern).
    await runInitDispatch(
      {
        name: 'sherpa',
        cwd: '/tmp/sherpa',
        target: 'sherpa:0.0',
        registryPath,
      },
      { baseUrl: 'http://127.0.0.1:65535' },
    );

    // v1 path wrote to the registry. HTTP path would have hit
    // the unreachable port + thrown before any registry write.
    // Successful registry write proves v1 was taken (regardless
    // of whether a real daemon happens to be running on 7878).
    const reg = await readRegistry(registryPath);
    expect(reg.sessions.sherpa).toBeDefined();
    expect(reg.sessions.sherpa?.cwd).toBe('/tmp/sherpa');
    expect(reg.sessions.sherpa?.tmux_target).toBe('sherpa:0.0');
  });
});
