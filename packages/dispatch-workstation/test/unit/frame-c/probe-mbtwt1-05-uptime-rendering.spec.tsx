// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB9 (red) — uptime module +
// SessionList rendering contract probe.
//
// Per ticket body `ec60622` §4 WB9 + Sub-Q-T1-D=(i) operator-acked
// "renderer infer spawnedAt/uptime" (2026-05-12) interpreted as
// renderer-internal mount-time per MB-T18 TileFooter Q-MBT18-3=a
// pattern:
//
//   NEW module `frame-c/uptime-format.ts` exports
//   `formatUptime(deltaMs: number): string` returning the wireframe
//   HH:MM format. Negative/non-finite inputs render '00:00' (no
//   crash; honest fallback).
//
//   SessionList row renders `<span data-testid="frame-c-session-row-
//   uptime-{name}">{HH:MM}</span>`. Mount-time is computed at row's
//   first-render-time via SessionList-internal useRef<Map<name, ms>>
//   + setInterval tick (1s) driving re-render. Tier 3 followup
//   MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE files this semantic gap
//   (Sub-Q-D=(i) renderer-mount-time ≠ true session-spawn-time;
//   resets on Frame A↔C toggle and workstation re-launch) at WB-
//   final docs.
//
// Encoded contract (5 conditions):
//   (1) Module imports + formatUptime function exported.
//   (2) formatUptime(0) → '00:00'
//   (3) formatUptime(60_000) → '00:01' (1 minute)
//   (4) formatUptime(3_661_000) → '01:01' (1 hour 1 minute; H is
//       1-or-more-digit per wireframe).
//   (5) SessionList row renders frame-c-session-row-uptime-{name}
//       span; text matches `/^\d{2,}:\d{2}$/` HH:MM format.
//
// RED state at HEAD `1b2c7a5` (post-WB8 GREEN):
//   - Module `frame-c/uptime-format.ts` does NOT exist → Conditions
//     (1)(2)(3)(4) FAIL on import-resolve.
//   - SessionList has no uptime span → Condition (5) FAILS on
//     querySelector returning null.
//
// WB10 GREEN target:
//   - NEW `frame-c/uptime-format.ts` exports formatUptime.
//   - MOD `frame-c/session-list.tsx` adds:
//       useRef<Map<string, number>> for per-session mount-time;
//       useEffect to register new sessions' mount-times;
//       useState<number>(Date.now()) + useEffect(setInterval(1s))
//         for tick-driven re-render;
//       per-row uptime span with formatUptime(now - mountTime).
//   - File Tier 3 followup MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE
//     at WB-final docs per ticket body §5.2.

import { describe, it, expect, beforeAll } from 'vitest';
import { act } from '@testing-library/react';

type FormatUptimeFn = (deltaMs: number) => string;
type MountFrameCAny = (
  container: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
) => { dispose(): void };

let formatUptime: FormatUptimeFn | undefined;
let formatImportError: Error | undefined;
let mountFrameC: MountFrameCAny | undefined;
let mountImportError: Error | undefined;

beforeAll(async () => {
  try {
    const formatModulePath = '../../../src/frame-c/uptime-format.js';
    const mod = await import(/* @vite-ignore */ formatModulePath);
    formatUptime = (mod as { formatUptime?: FormatUptimeFn }).formatUptime;
  } catch (e) {
    formatImportError = e instanceof Error ? e : new Error(String(e));
  }
  try {
    const mountModulePath = '../../../src/frame-c/mount.js';
    const mountMod = await import(/* @vite-ignore */ mountModulePath);
    mountFrameC = (mountMod as { mountFrameC?: MountFrameCAny }).mountFrameC;
  } catch (e) {
    mountImportError = e instanceof Error ? e : new Error(String(e));
  }
});

describe('MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB9 — uptime module + render contract', () => {
  describe('Condition (1): module imports + formatUptime function exists', () => {
    it('frame-c/uptime-format.ts exports formatUptime function', () => {
      if (formatImportError) {
        throw new Error(
          `module import failed (RED at WB9 — WB10 GREEN authors NEW frame-c/uptime-format.ts): ${formatImportError.message}`,
        );
      }
      expect(formatUptime).toBeDefined();
      expect(typeof formatUptime).toBe('function');
    });
  });

  describe('Condition (2): formatUptime(0) → "00:00"', () => {
    it('returns "00:00" for zero delta', () => {
      expect(formatUptime).toBeDefined();
      expect(formatUptime!(0)).toBe('00:00');
    });
  });

  describe('Condition (3): formatUptime(60_000) → "00:01"', () => {
    it('returns "00:01" for 1-minute delta', () => {
      expect(formatUptime).toBeDefined();
      expect(formatUptime!(60_000)).toBe('00:01');
    });
  });

  describe('Condition (4): formatUptime(3_661_000) → "01:01"', () => {
    it('returns "01:01" for 1h 1m delta', () => {
      expect(formatUptime).toBeDefined();
      expect(formatUptime!(3_661_000)).toBe('01:01');
    });
  });

  describe('Condition (5): SessionList renders uptime span per row', () => {
    it('frame-c-session-row-uptime-{name} span exists with HH:MM text', () => {
      if (mountImportError) {
        throw new Error(`mount import failed: ${mountImportError.message}`);
      }
      expect(mountFrameC).toBeDefined();
      const sessions = [{ name: 'sess-alpha' }];
      const container = document.createElement('div');
      document.body.appendChild(container);
      let handle: { dispose(): void } | null = null;
      try {
        act(() => {
          handle = mountFrameC!(container, { sessions });
        });
        const span = container.querySelector(
          '[data-testid="frame-c-session-row-uptime-sess-alpha"]',
        );
        expect(
          span,
          'uptime span must exist for sess-alpha (RED until WB10 GREEN adds span + useRef/useEffect tick)',
        ).not.toBeNull();
        expect(span!.textContent).toMatch(/^\d{2,}:\d{2}$/);
      } finally {
        handle?.dispose();
        container.remove();
      }
    });
  });
});
