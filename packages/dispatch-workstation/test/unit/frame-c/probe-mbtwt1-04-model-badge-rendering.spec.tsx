// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB7 (red) — model-badge module +
// SessionList rendering contract probe.
//
// Per ticket body `ec60622` §4 WB7 + Sub-Q-T1-B=(i) operator-acked
// "renderer infer model field" (2026-05-12) — interpreted as
// pure-renderer derivation:
//
//   NEW module `frame-c/model-badge.ts` exports `modelToLabel(model?:
//   string): string` returning short-form wireframe badge labels:
//     - 'claude-sonnet-4-6' → 'S4.6'
//     - 'claude-opus-4-6'   → 'O4.6'
//     - 'claude-opus-4-7'   → 'O4.7'
//     - 'claude-haiku-4-5'  → 'H'
//     - undefined / unknown → '' (empty; SessionList omits badge)
//
//   SessionList row renders `<span data-testid="frame-c-session-row-
//   model-{name}">{label}</span>` between status dot and session name
//   (per wireframe left-to-right layout). Empty label suppresses span
//   visibility OR span renders empty (probe permissive on omitted-vs-
//   empty; only asserts on populated cases).
//
// Encoded contract (7 conditions):
//   (1) Module imports + modelToLabel function exported.
//   (2) modelToLabel('claude-sonnet-4-6') → 'S4.6'
//   (3) modelToLabel('claude-opus-4-6') → 'O4.6'
//   (4) modelToLabel('claude-opus-4-7') → 'O4.7'
//   (5) modelToLabel('claude-haiku-4-5') → 'H'
//   (6) modelToLabel(undefined) → '' (empty fallback)
//   (7) SessionList renders span with data-testid="frame-c-session-row-
//       model-{name}" for each session; text content matches
//       modelToLabel(s.model).
//
// RED state at HEAD `4051789` (post-WB6 GREEN):
//   - Module `frame-c/model-badge.ts` does NOT exist → Conditions
//     (1)(2)(3)(4)(5)(6) FAIL on import-resolve guard.
//   - SessionList has no model-badge span → Condition (7) FAILS on
//     querySelector returning null.
//
// WB8 GREEN target:
//   - NEW `frame-c/model-badge.ts` with mapping table.
//   - MOD `frame-c/session-list.tsx` to import modelToLabel + render
//     model-badge span between status dot and session name.

import { describe, it, expect, beforeAll } from 'vitest';
import { act } from '@testing-library/react';

type ModelToLabelFn = (model?: string) => string;
type MountFrameCAny = (
  container: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
) => { dispose(): void };

let modelToLabel: ModelToLabelFn | undefined;
let modelImportError: Error | undefined;
let mountFrameC: MountFrameCAny | undefined;
let mountImportError: Error | undefined;

beforeAll(async () => {
  // Variable-first pattern defeats vite's static import-analysis so the
  // dynamic import only fails at runtime (RED state) instead of at
  // transform time (no-test crash). Mirrors probe-mbtwbfcs-02:63-71.
  try {
    const modelModulePath = '../../../src/frame-c/model-badge.js';
    const mod = await import(/* @vite-ignore */ modelModulePath);
    modelToLabel = (mod as { modelToLabel?: ModelToLabelFn }).modelToLabel;
  } catch (e) {
    modelImportError = e instanceof Error ? e : new Error(String(e));
  }
  try {
    const mountModulePath = '../../../src/frame-c/mount.js';
    const mountMod = await import(/* @vite-ignore */ mountModulePath);
    mountFrameC = (mountMod as { mountFrameC?: MountFrameCAny }).mountFrameC;
  } catch (e) {
    mountImportError = e instanceof Error ? e : new Error(String(e));
  }
});

describe('MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB7 — model-badge module + render contract', () => {
  describe('Condition (1): module imports + modelToLabel function exists', () => {
    it('frame-c/model-badge.ts exports modelToLabel function', () => {
      if (modelImportError) {
        throw new Error(
          `module import failed (RED state at WB7 — WB8 GREEN authors NEW frame-c/model-badge.ts): ${modelImportError.message}`,
        );
      }
      expect(modelToLabel).toBeDefined();
      expect(typeof modelToLabel).toBe('function');
    });
  });

  describe('Condition (2): claude-sonnet-4-6 → S4.6', () => {
    it('modelToLabel("claude-sonnet-4-6") returns "S4.6"', () => {
      expect(modelToLabel).toBeDefined();
      expect(modelToLabel!('claude-sonnet-4-6')).toBe('S4.6');
    });
  });

  describe('Condition (3): claude-opus-4-6 → O4.6', () => {
    it('modelToLabel("claude-opus-4-6") returns "O4.6"', () => {
      expect(modelToLabel).toBeDefined();
      expect(modelToLabel!('claude-opus-4-6')).toBe('O4.6');
    });
  });

  describe('Condition (4): claude-opus-4-7 → O4.7', () => {
    it('modelToLabel("claude-opus-4-7") returns "O4.7"', () => {
      expect(modelToLabel).toBeDefined();
      expect(modelToLabel!('claude-opus-4-7')).toBe('O4.7');
    });
  });

  describe('Condition (5): claude-haiku-4-5 → H', () => {
    it('modelToLabel("claude-haiku-4-5") returns "H"', () => {
      expect(modelToLabel).toBeDefined();
      expect(modelToLabel!('claude-haiku-4-5')).toBe('H');
    });
  });

  describe('Condition (6): undefined / unknown → empty', () => {
    it('modelToLabel(undefined) returns "" (empty fallback)', () => {
      expect(modelToLabel).toBeDefined();
      expect(modelToLabel!(undefined)).toBe('');
    });
  });

  describe('Condition (7): SessionList renders model-badge span per row', () => {
    it('frame-c-session-row-model-{name} span exists with text from modelToLabel(s.model)', () => {
      if (mountImportError) {
        throw new Error(`mount import failed: ${mountImportError.message}`);
      }
      expect(mountFrameC).toBeDefined();
      const sessions = [
        { name: 'sess-alpha', model: 'claude-sonnet-4-6' },
        { name: 'sess-beta', model: 'claude-opus-4-7' },
        { name: 'sess-gamma' }, // undefined model
      ];
      const container = document.createElement('div');
      document.body.appendChild(container);
      let handle: { dispose(): void } | null = null;
      try {
        act(() => {
          handle = mountFrameC!(container, { sessions });
        });
        const alphaSpan = container.querySelector(
          '[data-testid="frame-c-session-row-model-sess-alpha"]',
        );
        expect(
          alphaSpan,
          'model-badge span must exist for sess-alpha (RED until WB8 GREEN adds span to SessionList)',
        ).not.toBeNull();
        expect(alphaSpan!.textContent).toBe('S4.6');
        const betaSpan = container.querySelector(
          '[data-testid="frame-c-session-row-model-sess-beta"]',
        );
        expect(betaSpan).not.toBeNull();
        expect(betaSpan!.textContent).toBe('O4.7');
        // Gamma has undefined model — span may render empty OR be
        // omitted; probe accepts either. If present, text must be ''.
        const gammaSpan = container.querySelector(
          '[data-testid="frame-c-session-row-model-sess-gamma"]',
        );
        if (gammaSpan !== null) {
          expect(gammaSpan.textContent ?? '').toBe('');
        }
      } finally {
        handle?.dispose();
        container.remove();
      }
    });
  });
});
