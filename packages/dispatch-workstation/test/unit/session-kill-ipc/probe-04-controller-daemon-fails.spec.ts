// MB-T11 WB3 probe-04 — patchSessionState rejects → DaemonUnreachable with tmuxKillSucceeded:true.

import { describe, expect, it, vi } from 'vitest';
import {
  SessionKillIpcController,
  type SessionKillDeps,
} from '../../../src/main/session-kill-ipc.js';

describe('SessionKillIpcController — daemon patch failure', () => {
  it('returns DaemonUnreachable with tmuxKillSucceeded:true when patch throws', async () => {
    const calls: string[] = [];
    const deps: SessionKillDeps = {
      hasSession: vi.fn(async () => {
        calls.push('hasSession');
        return true;
      }),
      killSession: vi.fn(async () => {
        calls.push('killSession');
      }),
      patchSessionState: vi.fn(async () => {
        calls.push('patchSessionState');
        throw new Error('daemon returned HTTP 503');
      }),
    };
    const ctl = new SessionKillIpcController(deps);

    const reply = await ctl.handleKill({ sessionName: 'sess-x' });

    expect(reply.ok).toBe(false);
    if (!reply.ok) {
      expect(reply.error.error_type).toBe('DaemonUnreachable');
      if (reply.error.error_type === 'DaemonUnreachable') {
        expect(reply.error.sessionName).toBe('sess-x');
        expect(reply.error.tmuxKillSucceeded).toBe(true);
        expect(reply.error.reason).toMatch(/HTTP 503/);
      }
    }
    expect(calls).toEqual(['hasSession', 'killSession', 'patchSessionState']);
  });

  it('DaemonUnreachable reason has fallback when patch throws non-Error', async () => {
    const deps: SessionKillDeps = {
      hasSession: vi.fn(async () => true),
      killSession: vi.fn(async () => {}),
      patchSessionState: vi.fn(async () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'string-thrown';
      }),
    };
    const ctl = new SessionKillIpcController(deps);

    const reply = await ctl.handleKill({ sessionName: 'sess-x' });

    expect(reply.ok).toBe(false);
    if (!reply.ok && reply.error.error_type === 'DaemonUnreachable') {
      expect(reply.error.reason).toBe('string-thrown');
      expect(reply.error.tmuxKillSucceeded).toBe(true);
    }
  });
});
