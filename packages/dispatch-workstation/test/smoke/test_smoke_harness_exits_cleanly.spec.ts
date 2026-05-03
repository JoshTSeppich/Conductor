// MB-T08 Cluster 4 — Test 4/4: smoke harness exits cleanly without orphaning
// processes.
//
// exit() sends the QUIT stdin sentinel (existing precedent: main.ts:132)
// and waits for the controller to report exit. The harness must report
// isLaunched()=false post-exit so a retry/cleanup pass is unambiguous.
//
// RED state: src/main/smoke-harness.ts absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { SmokeHarness } from '../../src/main/smoke-harness.js';

function makeFakeController() {
  const stdinCalls: string[] = [];
  let launched = true;
  return {
    stdinCalls,
    isLaunched: () => launched,
    launch: vi.fn(async () => {
      launched = true;
    }),
    sendStdin: vi.fn(async (line: string) => {
      stdinCalls.push(line);
    }),
    waitForSentinel: vi.fn(async () => {}),
    exit: vi.fn(async () => {
      launched = false;
      return 0;
    }),
  };
}

describe('MB-T08 cluster 4 — SmokeHarness.exit', () => {
  it('sends QUIT stdin and waits for controller exit', async () => {
    const ctrl = makeFakeController();
    const harness = new SmokeHarness({ processController: ctrl });
    const code = await harness.exit();

    expect(ctrl.stdinCalls).toContain('QUIT');
    expect(ctrl.exit).toHaveBeenCalledTimes(1);
    expect(code).toBe(0);
  });

  it('reports isLaunched=false after exit resolves', async () => {
    const ctrl = makeFakeController();
    const harness = new SmokeHarness({ processController: ctrl });
    expect(harness.isLaunched()).toBe(true);
    await harness.exit();
    expect(harness.isLaunched()).toBe(false);
  });
});
