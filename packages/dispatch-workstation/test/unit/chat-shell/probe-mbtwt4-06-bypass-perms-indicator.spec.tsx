// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB11 (red) —
// BypassPermsIndicator visibility contract probe (Sub-Q-T4-F=i
// derive from dispatchMode='auto').
//
// Per ticket body f8fc24d §4 WB11 + Sub-Q-T4-F=(i) operator-acked
// default 2026-05-12:
//   - Pure prop-driven; `dispatchMode: 'auto' | 'ask'` prop.
//   - mode='auto' → visible warning indicator (operator bypassed
//     per-action review gate).
//   - mode='ask' → hidden (no indicator rendered).
//
// Encoded contract (4 conditions):
//   (1) BypassPermsIndicator exported from `src/chat-shell/
//       bypass-perms-indicator.tsx`.
//   (2) dispatchMode='auto' → renders element with
//       `data-testid="bypass-perms-indicator"`.
//   (3) dispatchMode='auto' → text content includes "bypass perms"
//       per wireframe label.
//   (4) dispatchMode='ask' → element absent (queryByTestId === null).

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BypassPermsIndicatorCmp = (props: any) => JSX.Element | null;

let BypassPermsIndicator: BypassPermsIndicatorCmp | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/chat-shell/bypass-perms-indicator.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    BypassPermsIndicator = (
      mod as { BypassPermsIndicator?: BypassPermsIndicatorCmp }
    ).BypassPermsIndicator;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

describe('MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB11 — BypassPermsIndicator (Sub-Q-T4-F=i)', () => {
  describe('Condition (1): BypassPermsIndicator component is exported', () => {
    it('module `src/chat-shell/bypass-perms-indicator.tsx` exports BypassPermsIndicator', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(BypassPermsIndicator).toBeDefined();
    });
  });

  describe('Condition (2): dispatchMode=auto → indicator rendered', () => {
    it('renders element with data-testid="bypass-perms-indicator" when mode=auto', () => {
      expect(BypassPermsIndicator).toBeDefined();
      render(<BypassPermsIndicator dispatchMode="auto" />);
      const indicator = screen.queryByTestId('bypass-perms-indicator');
      expect(
        indicator,
        'indicator must render when dispatchMode=auto per Sub-Q-T4-F=i',
      ).not.toBeNull();
    });
  });

  describe('Condition (3): indicator text includes "bypass perms"', () => {
    it('text content matches /bypass perms/i', () => {
      expect(BypassPermsIndicator).toBeDefined();
      render(<BypassPermsIndicator dispatchMode="auto" />);
      const indicator = screen.queryByTestId('bypass-perms-indicator');
      expect(indicator).not.toBeNull();
      expect(
        indicator!.textContent,
        'text must include "bypass perms" per wireframe target',
      ).toMatch(/bypass perms/i);
    });
  });

  describe('Condition (4): dispatchMode=ask → indicator absent', () => {
    it('queryByTestId returns null when dispatchMode=ask', () => {
      expect(BypassPermsIndicator).toBeDefined();
      render(<BypassPermsIndicator dispatchMode="ask" />);
      const indicator = screen.queryByTestId('bypass-perms-indicator');
      expect(
        indicator,
        'indicator must NOT render when dispatchMode=ask per Sub-Q-T4-F=i',
      ).toBeNull();
    });
  });
});
