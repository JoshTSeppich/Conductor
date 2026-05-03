// MB-T08 Cluster 4 — Test 1/4: smoke harness launches the workstation app.
//
// Vision §8.2: "Per MB-T08, smoke harness exists for v3.0 capability
// checklist. Each §8.1 capability has a corresponding smoke test that can be
// run against a built `.app`."
//
// The harness is the entry point for ship-gate validation. Unit-test scope
// for cluster 4: verify the harness's API contract (launch / runOnboarding /
// spawnSession / exit) using an injectable ProcessController so the unit
// tests don't actually launch Electron. Real-Electron exercise lives in the
// `npm run smoke` pnpm script, gated behind a built `dist/`.
//
// RED state: src/main/smoke-harness.ts absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { SmokeHarness } from '../../src/main/smoke-harness.js';

function makeFakeController() {
  const launchCalls: Array<{ headless: boolean; env: Record<string, string> }> = [];
  const exitCalls: Array<{ code: number | null }> = [];
  let launched = false;
  return {
    launchCalls,
    exitCalls,
    isLaunched: () => launched,
    launch: vi.fn(async (opts: { headless: boolean; env: Record<string, string> }) => {
      launchCalls.push(opts);
      launched = true;
    }),
    sendStdin: vi.fn(async () => {}),
    waitForSentinel: vi.fn(async () => {}),
    exit: vi.fn(async () => {
      exitCalls.push({ code: 0 });
      launched = false;
      return 0;
    }),
  };
}

describe('MB-T08 cluster 4 — SmokeHarness.launch', () => {
  it('invokes the controller with headless=true and MB_TEST_HOOKS=1', async () => {
    const ctrl = makeFakeController();
    const harness = new SmokeHarness({ processController: ctrl });
    await harness.launch();

    expect(ctrl.launch).toHaveBeenCalledTimes(1);
    expect(ctrl.launchCalls[0].headless).toBe(true);
    expect(ctrl.launchCalls[0].env.MB_TEST_HOOKS).toBe('1');
  });

  it('reports launched=true after launch resolves', async () => {
    const ctrl = makeFakeController();
    const harness = new SmokeHarness({ processController: ctrl });
    expect(harness.isLaunched()).toBe(false);
    await harness.launch();
    expect(harness.isLaunched()).toBe(true);
  });
});
