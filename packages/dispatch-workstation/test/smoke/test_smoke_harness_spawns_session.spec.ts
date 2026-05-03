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
  it('opens the modal, fills the form, and waits for SPAWN_MODAL_OPENED + spawn-result', async () => {
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
    // SPAWN_MODAL_OPENED is the existing main.ts sentinel; SPAWN_RESULT_OK
    // is a new MB-T08 sentinel surfaced once the spawn-result IPC reply lands.
    expect(ctrl.sentinelsAwaited).toEqual(['SPAWN_MODAL_OPENED', 'SPAWN_RESULT_OK']);
  });
});
