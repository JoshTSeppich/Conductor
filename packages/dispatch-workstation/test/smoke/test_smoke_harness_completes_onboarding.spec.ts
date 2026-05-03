// MB-T08 Cluster 4 — Test 2/4: smoke harness drives onboarding to completion.
//
// runOnboarding() must:
//   1. Wait for the ONBOARDING_READY sentinel (renderer-side console message,
//      surfaced via existing main.ts:54 MB_TEST_HOOKS forwarder).
//   2. Send stdin commands that drive the modal through the three steps:
//      WELCOME_NEXT, ONBOARDING_API_KEY <key>, ONBOARDING_DONE.
//   3. Wait for the ONBOARDING_COMPLETE sentinel.
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

describe('MB-T08 cluster 4 — SmokeHarness.runOnboarding', () => {
  it('drives the three onboarding steps via stdin and waits for completion sentinel', async () => {
    const ctrl = makeFakeController();
    const harness = new SmokeHarness({ processController: ctrl });
    await harness.runOnboarding({ apiKey: 'sk-ant-smoke-test' });

    // Awaited sentinels: the harness waits for ONBOARDING_READY before driving,
    // and ONBOARDING_COMPLETE after the Done click.
    expect(ctrl.sentinelsAwaited).toEqual(['ONBOARDING_READY', 'ONBOARDING_COMPLETE']);

    // Stdin commands: in order.
    expect(ctrl.stdinCalls).toEqual([
      'ONBOARDING_NEXT',
      'ONBOARDING_API_KEY sk-ant-smoke-test',
      'ONBOARDING_DONE',
    ]);
  });
});
