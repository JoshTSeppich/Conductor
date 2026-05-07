// MB-T11 WB7 probe-01 — tier4-fan-out: empty registry, populated registry,
// daemon-down case (graceful degrade).

import { describe, expect, it, vi } from 'vitest';
import type { SessionContextSnapshot } from 'dispatch-core/dist/v3/schema.js';
import { buildTier4Payload } from '../../../src/main/tier4-fan-out.js';
import type { Tier4FanOutDeps } from '../../../src/main/tier4-fan-out.js';
import { AutopilotLoop } from '../../../src/main/autopilot-loop.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeAutopilot(): AutopilotLoop {
  // Each test sets MB_AUTOPILOT_STATE_DIR per-call to a tmpdir (via env);
  // the AutopilotLoop default deps then read/write to that dir.
  return new AutopilotLoop();
}

function fakeSessionListResponse(
  names: string[],
  killedNames: string[] = [],
): { sessions: { name: string; state?: string }[] } {
  return {
    sessions: [
      ...names.map((n) => ({ name: n, state: 'armed' })),
      ...killedNames.map((n) => ({ name: n, state: 'killed' })),
    ],
  };
}

function fakeSnapshot(name: string): SessionContextSnapshot {
  return {
    recent_handoff: `handoff-for-${name}`,
    recent_console_tail: `console-for-${name}`,
    pending_intents: [], // daemon-side hardcode
    last_action_fired_at: null, // daemon-side hardcode
    last_operator_typed_at: null,
  };
}

describe('tier4-fan-out — probe 01: empty + populated + degrade', () => {
  it('empty registry → empty Tier4Payload sessions_context', async () => {
    let dir = '';
    try {
      dir = mkdtempSync(join(tmpdir(), 'mbt11-wb7-empty-'));
      process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
      const fetchImpl = vi.fn(async () => new Response('{}'));
      const deps: Tier4FanOutDeps = {
        sessionListClient: { listSessions: async () => fakeSessionListResponse([]) },
        autopilot: makeAutopilot(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        daemonUrl: 'http://fixture',
        daemonToken: 'fixture-token',
      };
      const result = await buildTier4Payload(deps);
      expect(result.sessions_context).toEqual({});
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      delete process.env['MB_AUTOPILOT_STATE_DIR'];
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('populated registry → fans out + merges autopilot state', async () => {
    let dir = '';
    try {
      dir = mkdtempSync(join(tmpdir(), 'mbt11-wb7-populated-'));
      process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
      const autopilot = makeAutopilot();
      // Pre-populate autopilot state for sess-a
      autopilot.startIntent({
        sessionName: 'sess-a',
        intent_summary: 'plan',
        expected_steps: 3,
      });
      const fetchImpl = vi.fn(async (url: string | URL) => {
        const u = typeof url === 'string' ? url : url.toString();
        const m = /\/v3\/sessions\/([^/]+)\/context-snapshot$/.exec(u);
        if (!m) throw new Error('unexpected url ' + u);
        return new Response(JSON.stringify(fakeSnapshot(m[1]!)));
      });
      const deps: Tier4FanOutDeps = {
        sessionListClient: {
          listSessions: async () =>
            fakeSessionListResponse(['sess-a', 'sess-b']),
        },
        autopilot,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        daemonUrl: 'http://fixture',
        daemonToken: 'fixture-token',
      };
      const result = await buildTier4Payload(deps);
      expect(Object.keys(result.sessions_context).sort()).toEqual([
        'sess-a',
        'sess-b',
      ]);
      // sess-a has autopilot state merged in
      const a = result.sessions_context['sess-a']!;
      expect(a.recent_handoff).toBe('handoff-for-sess-a');
      expect(a.pending_intents.length).toBe(1);
      expect(a.pending_intents[0]!.intent_summary).toBe('plan');
      expect(a.last_action_fired_at).not.toBeNull();
      // sess-b has empty autopilot state (no intent started)
      const b = result.sessions_context['sess-b']!;
      expect(b.pending_intents).toEqual([]);
      expect(b.last_action_fired_at).toBeNull();
    } finally {
      delete process.env['MB_AUTOPILOT_STATE_DIR'];
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('killed sessions are excluded from the fan-out', async () => {
    let dir = '';
    try {
      dir = mkdtempSync(join(tmpdir(), 'mbt11-wb7-killed-'));
      process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
      const fetchImpl = vi.fn(async (url: string | URL) => {
        const u = typeof url === 'string' ? url : url.toString();
        const m = /\/v3\/sessions\/([^/]+)\/context-snapshot$/.exec(u);
        if (!m) throw new Error('unexpected url ' + u);
        return new Response(JSON.stringify(fakeSnapshot(m[1]!)));
      });
      const deps: Tier4FanOutDeps = {
        sessionListClient: {
          listSessions: async () =>
            fakeSessionListResponse(['sess-alive'], ['sess-dead']),
        },
        autopilot: makeAutopilot(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        daemonUrl: 'http://fixture',
        daemonToken: 'fixture-token',
      };
      const result = await buildTier4Payload(deps);
      expect(Object.keys(result.sessions_context)).toEqual(['sess-alive']);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env['MB_AUTOPILOT_STATE_DIR'];
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('daemon-list failure → empty Tier4Payload (graceful degrade)', async () => {
    let dir = '';
    try {
      dir = mkdtempSync(join(tmpdir(), 'mbt11-wb7-list-fail-'));
      process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
      const fetchImpl = vi.fn();
      const deps: Tier4FanOutDeps = {
        sessionListClient: {
          listSessions: async () => {
            throw new Error('daemon down');
          },
        },
        autopilot: makeAutopilot(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        daemonUrl: 'http://fixture',
        daemonToken: 'fixture-token',
      };
      const result = await buildTier4Payload(deps);
      expect(result.sessions_context).toEqual({});
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      delete process.env['MB_AUTOPILOT_STATE_DIR'];
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('per-session snapshot failure → stub snapshot for that session, others succeed', async () => {
    let dir = '';
    try {
      dir = mkdtempSync(join(tmpdir(), 'mbt11-wb7-partial-'));
      process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
      const fetchImpl = vi.fn(async (url: string | URL) => {
        const u = typeof url === 'string' ? url : url.toString();
        if (u.includes('sess-bad')) {
          return new Response('error', { status: 500 });
        }
        const m = /\/v3\/sessions\/([^/]+)\/context-snapshot$/.exec(u);
        return new Response(JSON.stringify(fakeSnapshot(m![1]!)));
      });
      const deps: Tier4FanOutDeps = {
        sessionListClient: {
          listSessions: async () =>
            fakeSessionListResponse(['sess-good', 'sess-bad']),
        },
        autopilot: makeAutopilot(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        daemonUrl: 'http://fixture',
        daemonToken: 'fixture-token',
      };
      const result = await buildTier4Payload(deps);
      // Both keyed; bad session has stub snapshot.
      expect(Object.keys(result.sessions_context).sort()).toEqual([
        'sess-bad',
        'sess-good',
      ]);
      expect(result.sessions_context['sess-bad']!.recent_handoff).toBeNull();
      expect(result.sessions_context['sess-good']!.recent_handoff).toBe(
        'handoff-for-sess-good',
      );
    } finally {
      delete process.env['MB_AUTOPILOT_STATE_DIR'];
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('null daemon token → all sessions get stub snapshots (token-required path rejects)', async () => {
    let dir = '';
    try {
      dir = mkdtempSync(join(tmpdir(), 'mbt11-wb7-no-token-'));
      process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
      const fetchImpl = vi.fn();
      const deps: Tier4FanOutDeps = {
        sessionListClient: {
          listSessions: async () => fakeSessionListResponse(['sess-a']),
        },
        autopilot: makeAutopilot(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        daemonUrl: 'http://fixture',
        daemonToken: null,
      };
      const result = await buildTier4Payload(deps);
      expect(Object.keys(result.sessions_context)).toEqual(['sess-a']);
      // Stub fields per assembleTier4Payload's per-session graceful degrade.
      expect(result.sessions_context['sess-a']!.recent_handoff).toBeNull();
    } finally {
      delete process.env['MB_AUTOPILOT_STATE_DIR'];
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });
});
