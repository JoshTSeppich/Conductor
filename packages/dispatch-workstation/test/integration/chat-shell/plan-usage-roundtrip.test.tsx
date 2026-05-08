// @vitest-environment happy-dom
//
// MB-T25 WB4 — integration: full-mount ChatShell + fake CoarchitectBridge
// with onRateLimitUpdate; assert plan-usage ring renders + updates +
// tints per RateLimitState fixtures simulating Terminal D's MB-T34
// WB-final broadcast emission (live broadcast verified via D's
// f326d21 origin/mbt34-worktree at WB5).
//
// Operator HALT 2 ack option (a) 2026-05-08: runtime electron smoke
// + live /v1/messages integration test deferred to operator-merge
// gate — D's preload.mts MB-T34 zone (canonical
// coarchitectBridge.onRateLimitUpdate authorship per HALT 1
// arbitration) is on a sibling worktree branch + not yet merged to
// main. THIS test exercises the consumer pipeline end-to-end against
// the data contract:
//
//   mountChatShell(opts)
//     → resolveTabs (Chat tab + Commits tab built from bridge)
//     → resolveRenderPlanUsageRing path 2 (via opts.bridge.onRateLimitUpdate)
//     → ChatShell renders chat-shell-header-bar
//       → renderPlanUsageRing closure → <PlanUsageRing bridge=...>
//         → useEffect subscribes to bridge.onRateLimitUpdate at mount
//         → state updates via fired RateLimitState
//         → DOM updates: SVG + tint testid + countdown text
//
// Coverage:
//   - mount.ts resolveRenderPlanUsageRing path-2 closure construction
//   - ChatShell sentinel-zone slot rendering position (header-bar)
//   - PlanUsageRing useEffect subscription + cleanup-fn return
//   - Ring math + tinting + countdown end-to-end against real fixtures

import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import {
  mountChatShell,
  type CoarchitectBridge,
} from '../../../src/chat-shell/mount.js';
import type { RateLimitState } from '../../../src/chat-shell/ring-helpers.js';

interface FakeBridge {
  bridge: CoarchitectBridge;
  fireUpdate: (state: RateLimitState) => void;
  cleanupCount: () => number;
  subscribeCount: () => number;
}

function makeFakeBridge(): FakeBridge {
  let captured: ((state: RateLimitState) => void) | null = null;
  let cleanups = 0;
  let subscribes = 0;
  const bridge: CoarchitectBridge = {
    fetchHistory: async () => [],
    postMessage: async () =>
      ({
        id: 'fake',
        role: 'assistant',
        content: 'fake',
        createdAt: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    sendAndStream: () => {},
    onStreamChunk: () => () => {},
    onStreamDone: () => () => {},
    onStreamError: () => () => {},
    onRateLimitUpdate: (cb) => {
      captured = cb;
      subscribes += 1;
      return () => {
        cleanups += 1;
      };
    },
  };
  const fireUpdate = (state: RateLimitState) => {
    if (!captured) {
      throw new Error(
        'integration: cb not captured — onRateLimitUpdate not invoked at mount',
      );
    }
    captured(state);
  };
  return {
    bridge,
    fireUpdate,
    cleanupCount: () => cleanups,
    subscribeCount: () => subscribes,
  };
}

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function lowUsageFixture(now: number): RateLimitState {
  // 5% used (95% remaining) → green tint
  return {
    requests: { limit: 1000, remaining: 950, reset: now + FIVE_HOURS_MS },
    tokens: {
      limit: 2_000_000,
      remaining: 1_900_000,
      reset: now + FIVE_HOURS_MS,
    },
    inputTokens: {
      limit: 1_000_000,
      remaining: 950_000,
      reset: now + FIVE_HOURS_MS,
    },
    outputTokens: {
      limit: 500_000,
      remaining: 480_000,
      reset: now + FIVE_HOURS_MS,
    },
  };
}

function midUsageFixture(now: number): RateLimitState {
  // 75% used → yellow tint
  return {
    ...lowUsageFixture(now),
    tokens: {
      limit: 2_000_000,
      remaining: 500_000,
      reset: now + FIVE_HOURS_MS,
    },
  };
}

function highUsageFixture(now: number): RateLimitState {
  // 90% used → red tint
  return {
    ...lowUsageFixture(now),
    tokens: {
      limit: 2_000_000,
      remaining: 200_000,
      reset: now + 30 * 60 * 1000,
    },
  };
}

function setupRoot(): { rootId: string; cleanup: () => void } {
  const rootId = 'mb-t25-integration-root';
  const root = document.createElement('div');
  root.id = rootId;
  document.body.appendChild(root);
  return {
    rootId,
    cleanup: () => {
      try {
        document.body.removeChild(root);
      } catch {
        // already removed
      }
    },
  };
}

describe('MB-T25 WB4 — plan-usage ring full-mount integration', () => {
  it('mounts ChatShell + auto-renders plan-usage slot from bridge.onRateLimitUpdate (path 2)', () => {
    const { rootId, cleanup } = setupRoot();
    const { bridge, subscribeCount } = makeFakeBridge();
    let unmount: () => void = () => {};
    act(() => {
      unmount = mountChatShell({ rootElementId: rootId, bridge });
    });

    const slot = document.querySelector(
      '[data-testid="chat-shell-plan-usage-slot"]',
    );
    expect(slot).toBeTruthy();
    expect(subscribeCount()).toBe(1);
    // Initial state: no RateLimitState observed → em-dash placeholder + no SVG
    expect(
      document.querySelector('[data-testid="chat-shell-plan-usage-countdown"]')
        ?.textContent,
    ).toBe('—');
    expect(
      document.querySelector('[data-testid="chat-shell-plan-usage-ring-svg"]'),
    ).toBeNull();

    unmount();
    cleanup();
  });

  it('updates ring + countdown when bridge fires RateLimitState (low-usage = green)', () => {
    const { rootId, cleanup } = setupRoot();
    const { bridge, fireUpdate } = makeFakeBridge();
    let unmount: () => void = () => {};
    act(() => {
      unmount = mountChatShell({ rootElementId: rootId, bridge });
    });

    const now = Date.now();
    act(() => fireUpdate(lowUsageFixture(now)));

    // SVG ring now rendered
    const svg = document.querySelector(
      '[data-testid="chat-shell-plan-usage-ring-svg"]',
    );
    expect(svg).toBeTruthy();
    // Tint should be green (5% used)
    expect(
      document.querySelector(
        '[data-testid="chat-shell-plan-usage-ring-tint-green"]',
      ),
    ).toBeTruthy();
    // Countdown should reflect ~5h (allow 4h 59m or 5h 00m for Date.now drift)
    const countdownText = document.querySelector(
      '[data-testid="chat-shell-plan-usage-countdown"]',
    )?.textContent;
    expect(countdownText).toMatch(/^(?:4h 5\dm|5h 00m)$/);

    unmount();
    cleanup();
  });

  it('reflects yellow tint for mid-band usage (75%)', () => {
    const { rootId, cleanup } = setupRoot();
    const { bridge, fireUpdate } = makeFakeBridge();
    let unmount: () => void = () => {};
    act(() => {
      unmount = mountChatShell({ rootElementId: rootId, bridge });
    });

    act(() => fireUpdate(midUsageFixture(Date.now())));

    expect(
      document.querySelector(
        '[data-testid="chat-shell-plan-usage-ring-tint-yellow"]',
      ),
    ).toBeTruthy();
    // green and red tint testids should NOT be present
    expect(
      document.querySelector(
        '[data-testid="chat-shell-plan-usage-ring-tint-green"]',
      ),
    ).toBeNull();
    expect(
      document.querySelector(
        '[data-testid="chat-shell-plan-usage-ring-tint-red"]',
      ),
    ).toBeNull();

    unmount();
    cleanup();
  });

  it('reflects red tint for >85% usage', () => {
    const { rootId, cleanup } = setupRoot();
    const { bridge, fireUpdate } = makeFakeBridge();
    let unmount: () => void = () => {};
    act(() => {
      unmount = mountChatShell({ rootElementId: rootId, bridge });
    });

    act(() => fireUpdate(highUsageFixture(Date.now())));

    expect(
      document.querySelector(
        '[data-testid="chat-shell-plan-usage-ring-tint-red"]',
      ),
    ).toBeTruthy();

    unmount();
    cleanup();
  });

  it('cleanup-fn invoked on unmount (subscription tear-down)', () => {
    const { rootId, cleanup } = setupRoot();
    const { bridge, cleanupCount } = makeFakeBridge();
    let unmount: () => void = () => {};
    act(() => {
      unmount = mountChatShell({ rootElementId: rootId, bridge });
    });

    expect(cleanupCount()).toBe(0);
    unmount();
    expect(cleanupCount()).toBe(1);

    cleanup();
  });

  it('plan-usage slot renders BEFORE cost-meter slot in header-bar DOM order (Q-MBT25-3)', () => {
    // Slot ordering per Q-MBT24-4=far-left + Q-MBT25-3:
    //   [Auto/Ask MB-T24] | [plan-usage MB-T25] | [cost-meter MB-T26] | [model-mix MB-T27]
    // MB-T24 zone is on Terminal A's branch (not merged to mbt25-worktree
    // yet); this test verifies the LOCAL slot ordering: MB-T25 BEFORE
    // MB-T26 in the chat-shell-header-bar children sequence.
    const { rootId, cleanup } = setupRoot();
    const { bridge, fireUpdate } = makeFakeBridge();
    let unmount: () => void = () => {};
    act(() => {
      unmount = mountChatShell({ rootElementId: rootId, bridge });
    });
    act(() => fireUpdate(lowUsageFixture(Date.now())));

    const header = document.querySelector(
      '[data-testid="chat-shell-header-bar"]',
    );
    expect(header).toBeTruthy();
    const planUsageSlot = document.querySelector(
      '[data-testid="chat-shell-plan-usage-slot"]',
    );
    expect(planUsageSlot).toBeTruthy();
    expect(header!.contains(planUsageSlot!)).toBe(true);

    // Verify position: plan-usage child index < any cost-meter child index
    // (cost-meter not present here because bridge has no onCostUpdate, but
    // we still verify the slot is the FIRST child of header-bar).
    const headerChildren = Array.from(header!.children);
    const planUsageIdx = headerChildren.findIndex(
      (c) => c.getAttribute('data-testid') === 'chat-shell-plan-usage-slot',
    );
    expect(planUsageIdx).toBe(0);

    unmount();
    cleanup();
  });
});
