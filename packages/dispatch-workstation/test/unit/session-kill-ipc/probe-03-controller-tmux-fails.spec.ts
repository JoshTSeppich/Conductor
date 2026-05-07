// MB-T11 WB3 probe-03 — killSession rejects → TmuxKillError; patchSessionState NOT called.

import { describe, expect, it, vi } from 'vitest';
import {
  SessionKillIpcController,
  type SessionKillDeps,
} from '../../../src/main/session-kill-ipc.js';

describe('SessionKillIpcController — tmux kill failure', () => {
  it('returns TmuxKillError when killSession throws an Error', async () => {
    const deps: SessionKillDeps = {
      hasSession: vi.fn(async () => true),
      killSession: vi.fn(async () => {
        throw new Error('tmux: server not running');
      }),
      patchSessionState: vi.fn(async () => {}),
    };
    const ctl = new SessionKillIpcController(deps);

    const reply = await ctl.handleKill({ sessionName: 'sess-x' });

    expect(reply.ok).toBe(false);
    if (!reply.ok) {
      expect(reply.error.error_type).toBe('TmuxKillError');
      if (reply.error.error_type === 'TmuxKillError') {
        expect(reply.error.sessionName).toBe('sess-x');
        expect(reply.error.reason).toMatch(/tmux/);
      }
    }
    expect(deps.killSession).toHaveBeenCalledTimes(1);
    expect(deps.patchSessionState).not.toHaveBeenCalled();
  });

  it('TmuxKillError reason carries the underlying error message', async () => {
    const deps: SessionKillDeps = {
      hasSession: vi.fn(async () => true),
      killSession: vi.fn(async () => {
        throw new Error('exit 1: cant find session: ghost');
      }),
      patchSessionState: vi.fn(async () => {}),
    };
    const ctl = new SessionKillIpcController(deps);

    const reply = await ctl.handleKill({ sessionName: 'ghost' });

    expect(reply.ok).toBe(false);
    if (!reply.ok && reply.error.error_type === 'TmuxKillError') {
      expect(reply.error.reason).toBe('exit 1: cant find session: ghost');
    }
  });

  it('TmuxKillError reason has fallback when killSession throws non-Error', async () => {
    const deps: SessionKillDeps = {
      hasSession: vi.fn(async () => true),
      killSession: vi.fn(async () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'string-thrown';
      }),
      patchSessionState: vi.fn(async () => {}),
    };
    const ctl = new SessionKillIpcController(deps);

    const reply = await ctl.handleKill({ sessionName: 'sess-x' });

    expect(reply.ok).toBe(false);
    if (!reply.ok && reply.error.error_type === 'TmuxKillError') {
      expect(reply.error.reason).toBe('string-thrown');
    }
  });
});
