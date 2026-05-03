// MB-T08 Cluster 4 — Test 3/4: smoke harness can fire the spawn-session flow.
//
// spawnSession() reuses the existing CLICK_SPAWN_BUTTON +
// FILL_AND_SUBMIT_SPAWN <repoPath>|<sessionName> stdin commands wired in
// main.ts:148–195. Pipe-separated payload format is the existing precedent;
// the harness just composes the line.
//
// Smoke-harness scope: assert command sequence + sentinel expectations.
// Real spawn pipeline (tmux + daemon-register) is unit-tested by MB-T05 and
// integration-tested by the operator-run smoke script against a live daemon.
//
// RED state: src/main/smoke-harness.ts absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { SmokeHarness } from '../../src/main/smoke-harness.js';

function makeFakeController() {
  const stdinCalls: string[] = [];
  const sentinelsAwaited: string[] = [];
  return {
    stdinCalls,
    sentinelsAwaited,
    isLaunched: () => true,
    launch: vi.fn(async () => {}),
    sendStdin: vi.fn(async (line: string) => {
      stdinCalls.push(line);
    }),
    waitForSentinel: vi.fn(async (name: string) => {
      sentinelsAwaited.push(name);
    }),
    exit: vi.fn(async () => 0),
  };
}

describe('MB-T08 cluster 4 — SmokeHarness.spawnSession', () => {
  it('opens the modal, waits for SPAWN_MODAL_OPENED, then fires the fill-submit', async () => {
    const ctrl = makeFakeController();
    const harness = new SmokeHarness({ processController: ctrl });
    await harness.spawnSession({
      repoPath: '/Users/test/code/sherpa',
      sessionName: 'smoke-session-1',
    });

    expect(ctrl.stdinCalls).toEqual([
      'CLICK_SPAWN_BUTTON',
      'FILL_AND_SUBMIT_SPAWN /Users/test/code/sherpa|smoke-session-1',
    ]);
    // Only SPAWN_MODAL_OPENED today — a spawn-completion sentinel is
    // followup-tracked as MB-F-MB-T08-SPAWN-RESULT-SENTINEL (renderer would
    // need to subscribe to workstation:spawn-result; that wiring crosses
    // MB-T05 territory and is excluded from MB-T08 scope).
    expect(ctrl.sentinelsAwaited).toEqual(['SPAWN_MODAL_OPENED']);
  });
});
