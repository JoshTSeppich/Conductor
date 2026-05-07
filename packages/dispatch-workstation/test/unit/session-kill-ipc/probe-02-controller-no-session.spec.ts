// MB-T11 WB3 probe-02 — hasSession=false → SessionNotFoundError; kill + patch NOT called.

import { describe, expect, it, vi } from 'vitest';
import {
  SessionKillIpcController,
  type SessionKillDeps,
} from '../../../src/main/session-kill-ipc.js';

describe('SessionKillIpcController — no session', () => {
  it('returns SessionNotFoundError when hasSession=false; skips kill + patch', async () => {
    const deps: SessionKillDeps = {
      hasSession: vi.fn(async () => false),
      killSession: vi.fn(async () => {
        throw new Error('killSession should not be called');
      }),
      patchSessionState: vi.fn(async () => {
        throw new Error('patchSessionState should not be called');
      }),
    };
    const ctl = new SessionKillIpcController(deps);

    const reply = await ctl.handleKill({ sessionName: 'no-such' });

    expect(reply).toEqual({
      ok: false,
      error: {
        error_type: 'SessionNotFoundError',
        sessionName: 'no-such',
      },
    });
    expect(deps.hasSession).toHaveBeenCalledTimes(1);
    expect(deps.killSession).not.toHaveBeenCalled();
    expect(deps.patchSessionState).not.toHaveBeenCalled();
  });

  it('returns SchemaValidationError on missing sessionName', async () => {
    const deps: SessionKillDeps = {
      hasSession: vi.fn(async () => true),
      killSession: vi.fn(async () => {}),
      patchSessionState: vi.fn(async () => {}),
    };
    const ctl = new SessionKillIpcController(deps);

    const reply = await ctl.handleKill({});

    expect(reply.ok).toBe(false);
    if (!reply.ok) {
      expect(reply.error.error_type).toBe('SchemaValidationError');
    }
    expect(deps.hasSession).not.toHaveBeenCalled();
  });

  it('returns SchemaValidationError on empty sessionName', async () => {
    const deps: SessionKillDeps = {
      hasSession: vi.fn(async () => true),
      killSession: vi.fn(async () => {}),
      patchSessionState: vi.fn(async () => {}),
    };
    const ctl = new SessionKillIpcController(deps);

    const reply = await ctl.handleKill({ sessionName: '' });

    expect(reply.ok).toBe(false);
    if (!reply.ok) {
      expect(reply.error.error_type).toBe('SchemaValidationError');
    }
  });
});
