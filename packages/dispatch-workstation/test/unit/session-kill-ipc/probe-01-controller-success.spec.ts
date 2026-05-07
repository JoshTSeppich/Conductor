// MB-T11 WB3 probe-01 — happy-path: hasSession=true → killSession succeeds → patchSessionState succeeds → ok:true.

import { describe, expect, it, vi } from 'vitest';
import {
  SessionKillIpcController,
  type SessionKillDeps,
} from '../../../src/main/session-kill-ipc.js';

describe('SessionKillIpcController — happy path', () => {
  it('returns ok:true and calls all three deps in order', async () => {
    const calls: string[] = [];
    const deps: SessionKillDeps = {
      hasSession: vi.fn(async (name: string) => {
        calls.push(`hasSession:${name}`);
        return true;
      }),
      killSession: vi.fn(async (name: string) => {
        calls.push(`killSession:${name}`);
      }),
      patchSessionState: vi.fn(async (name, state) => {
        calls.push(`patchSessionState:${name}:${state}`);
      }),
    };
    const ctl = new SessionKillIpcController(deps);

    const reply = await ctl.handleKill({ sessionName: 'sess-x' });

    expect(reply).toEqual({ ok: true });
    expect(calls).toEqual([
      'hasSession:sess-x',
      'killSession:sess-x',
      'patchSessionState:sess-x:killed',
    ]);
    expect(deps.hasSession).toHaveBeenCalledTimes(1);
    expect(deps.killSession).toHaveBeenCalledTimes(1);
    expect(deps.patchSessionState).toHaveBeenCalledTimes(1);
    expect(deps.patchSessionState).toHaveBeenCalledWith('sess-x', 'killed');
  });
});
