/**
 * MB-T10 — Probe P6: recent_console_tail returns last ≤2KB of console
 * output via whole-line accumulation, oldest-fully-included-first.
 *
 * Q-MBT10-5=a: whole-line accumulation. The 2048-byte budget caps the
 * buffer; the OLDEST fully-included line first, walking backward from
 * newest until including one more line would exceed the budget. May
 * return <2048 bytes when the last line considered exceeds remaining
 * budget. Output is chronological (oldest-included → newest).
 *
 * Seeds cc_console_buffer rows directly via dispatch-daemon's
 * console/buffer.ts appendLine helper (the fixture exposes the db
 * handle). Three seeded scenarios:
 *   (a) buffer-empty: no rows → recent_console_tail: null
 *   (b) all-fits: total bytes < 2048 → all lines returned chronologically
 *   (c) overflow: total bytes > 2048 → only the newest lines that fit;
 *       oldest line that would have pushed past 2048 is dropped entirely.
 *
 * RED at WB2: route absent → 404 → recent_console_tail never asserted.
 * GREEN at WB3: handler reads via getLinesBefore(db, name, null, N)
 * and assembles tail per Q-MBT10-5.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';
import { appendLine } from '../../../src/console/buffer.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('MB-T10 — P6 recent_console_tail returns last ≤2KB whole-line accumulation', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  async function mkdtempPath(prefix: string, filename: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    return join(dir, filename);
  }

  function authHeaders(token: string | undefined): Record<string, string> {
    return { 'x-conductor-token': token ?? '' };
  }

  async function setupServerWithSession(
    namePrefix: string,
  ): Promise<TestServer> {
    const registryPath = await mkdtempPath(`mbt10-p06-${namePrefix}-reg-`, 'sessions.json');
    const session: SessionV2 = {
      cwd: '/tmp/sherpa',
      tmux_target: 'sherpa:0.0',
      handoff_path: '/tmp/no-handoff-here',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
    };
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: session },
    });
    return spawnTestServer({
      tokenPath: await mkdtempPath(`mbt10-p06-${namePrefix}-tok-`, 'token'),
      registryPath,
    });
  }

  it('returns null when no console buffer rows exist for the session', async () => {
    ts = await setupServerWithSession('a');
    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recent_console_tail: string | null };
    expect(body.recent_console_tail).toBeNull();
  });

  it('returns all lines chronologically when total bytes < 2048', async () => {
    ts = await setupServerWithSession('b');
    // 3 lines × ~40 bytes each = ~120 bytes total. All fit.
    const lines = ['first line of output', 'second line of output', 'third line of output'];
    let seq = 1;
    for (const line of lines) {
      appendLine(ts.db, 'sherpa', seq++, Buffer.from(line + '\n', 'utf8'), 'utf8', Date.now());
    }
    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recent_console_tail: string | null };
    expect(typeof body.recent_console_tail).toBe('string');
    // Chronological order: first → second → third.
    const tail = body.recent_console_tail!;
    expect(tail.indexOf('first line')).toBeGreaterThanOrEqual(0);
    expect(tail.indexOf('second line')).toBeGreaterThan(tail.indexOf('first line'));
    expect(tail.indexOf('third line')).toBeGreaterThan(tail.indexOf('second line'));
  });

  it('drops the oldest lines that would exceed 2048 bytes; whole-line boundary preserved', async () => {
    ts = await setupServerWithSession('c');
    // 30 lines × 100 bytes each = 3000 bytes total. The newest ~20 lines
    // (~2000 bytes) fit; the oldest ~10 lines must be dropped entirely.
    // Use distinguishable content per line so we can assert precisely.
    const PER_LINE = 100;
    let seq = 1;
    for (let i = 0; i < 30; i++) {
      const idx = String(i).padStart(3, '0');
      const filler = 'x'.repeat(PER_LINE - 5);
      const line = `${idx}-${filler}\n`; // exactly PER_LINE bytes
      appendLine(ts.db, 'sherpa', seq++, Buffer.from(line, 'utf8'), 'utf8', Date.now());
    }
    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recent_console_tail: string | null };
    expect(typeof body.recent_console_tail).toBe('string');
    const tail = body.recent_console_tail!;

    // Whole-line accumulation invariants:
    //   - Total bytes ≤ 2048
    //   - Newest line (029) is included
    //   - Oldest line (000) is NOT included (dropped because adding it
    //     would push past 2048 — the oldest-fully-included rule)
    expect(Buffer.byteLength(tail, 'utf8')).toBeLessThanOrEqual(2048);
    expect(tail.includes('029-')).toBe(true);
    expect(tail.includes('000-')).toBe(false);

    // Whole-line boundary: tail must end on a complete line (no
    // mid-line truncation). Each line ends with '\n'; the whole-line
    // accumulation never splits a line.
    expect(tail.endsWith('\n')).toBe(true);

    // Source order preserved across the included lines (oldest-included
    // → newest). Pick two adjacent included indices and check ordering.
    const i1 = tail.indexOf('029-');
    const i2 = tail.indexOf('028-');
    expect(i2).toBeGreaterThanOrEqual(0);
    expect(i1).toBeGreaterThan(i2);
  });
});
