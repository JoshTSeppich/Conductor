// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB3 (red) — probe-mbtwft2-02
// TerminalHeaderBar component render contract per ticket body 30ab109 §4
// WB3 + Sub-Q-MBTWFT2-C=(γ) defer-with-placeholders (operator-acked
// 2026-05-12 T2 TICKET-BODY ACK message default).
//
// Asserts (per ticket §4 WB3):
//   (a) `<TerminalHeaderBar sessionName="alpha" branchName="feat/x"
//        tokensUsed={1000} tokenBudget={200000} />` renders an element
//       with `data-testid="frame-c-terminal-header-bar"`.
//   (b) Header text includes `alpha @ feat/x` (Sub-Q convention default:
//       `<sessionName> @ <branchName>` — flagged for HALT-WB3-PRE-COMMIT
//       operator screenshot confirmation per ticket body §3.3 +
//       trailing HALT enumeration; if operator redirects to alternate
//       text format, this probe's Condition (b) is adjusted as part of
//       the WB3 GREEN HALT cycle).
//   (c) Header includes `ctx <N>%` where N = round((tokensUsed /
//       tokenBudget) * 100). Mirrors `detail-pane.tsx:178-181` ctx
//       computation precedent. With tokensUsed=1000 + tokenBudget=
//       200000 → N=1 (round(0.005 * 100) = 1).
//   (d) Per Sub-Q-MBTWFT2-C=(γ) defer-with-placeholders: header
//       renders literal placeholder text `uptime —` and `plan —`
//       (em-dash U+2014, NOT hyphen). These surfaces will flip to
//       live data when the follow-on ticket (Tier 2 followup
//       MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH) extends
//       TileGridSessionEntry with `spawnedAt` + `plan` fields.
//   (e) Edge case: with tokenBudget undefined (or 0), ctx renders
//       `ctx 0%` (honest "no data yet" fallback per detail-pane.tsx:
//       176-181 + Wave B Sub-Q-MBTWTWS divide-by-zero guard).
//
// RED state at HEAD `d627096` (post-WB2 GREEN commit):
//   - `frame-c/terminal-header-bar.tsx` does NOT exist. Verified via
//     `ls packages/dispatch-workstation/src/frame-c/` at authoring
//     time: action-bar.tsx, detail-pane.tsx, frame-c-root.tsx,
//     index.ts, mount.tsx, session-list.tsx, terminal-stream.tsx
//     (7 files; no terminal-header-bar.tsx).
//   - Dynamic import in beforeAll captures the resolve-failure;
//     5 conditions fail at the import-guard.
//
// WB4 GREEN target: create `frame-c/terminal-header-bar.tsx` exporting
//   `TerminalHeaderBar({ sessionName, branchName?, tokensUsed?,
//   tokenBudget? }): JSX.Element`. Render single row, monospace,
//   mirroring DetailPane meta-row style (detail-pane.tsx:34-69):
//     - Left: `<sessionName> @ <branchName ?? '—'>` (literal em-dash
//       when branchName absent).
//     - Right cluster: `ctx <N>%` (computed from tokensUsed/
//       tokenBudget per Wave B precedent) + literal `uptime —` +
//       literal `plan —` placeholders.

import { describe, it, expect, beforeAll } from 'vitest';
import { act } from '@testing-library/react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';

interface TerminalHeaderBarProps {
  readonly sessionName: string;
  readonly branchName?: string;
  readonly tokensUsed?: number;
  readonly tokenBudget?: number;
}

type TerminalHeaderBarComponent = (props: TerminalHeaderBarProps) => JSX.Element;

let TerminalHeaderBar: TerminalHeaderBarComponent | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/frame-c/terminal-header-bar.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    TerminalHeaderBar = (
      mod as { TerminalHeaderBar?: TerminalHeaderBarComponent }
    ).TerminalHeaderBar;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

function renderHeader(props: TerminalHeaderBarProps): {
  container: HTMLElement;
  root: Root;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(TerminalHeaderBar!, props));
  });
  return {
    container,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function headerOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    '[data-testid="frame-c-terminal-header-bar"]',
  );
}

describe('MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB3 — TerminalHeaderBar render (Sub-Q-C=γ defer-with-placeholders)', () => {
  describe('Condition (a): renders frame-c-terminal-header-bar testid', () => {
    it('mounts an element with data-testid="frame-c-terminal-header-bar"', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(
        TerminalHeaderBar,
        'frame-c/terminal-header-bar.js must export `TerminalHeaderBar` named component (WB4 GREEN target)',
      ).toBeDefined();
      const { container, unmount } = renderHeader({
        sessionName: 'sess-alpha',
        branchName: 'feat/x',
        tokensUsed: 1000,
        tokenBudget: 200000,
      });
      try {
        expect(
          headerOf(container),
          'TerminalHeaderBar must render an element with data-testid="frame-c-terminal-header-bar"',
        ).not.toBeNull();
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (b): header text shows `<sessionName> @ <branchName>` (default convention)', () => {
    it('header text includes the literal string "sess-alpha @ feat/x"', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderHeader({
        sessionName: 'sess-alpha',
        branchName: 'feat/x',
        tokensUsed: 1000,
        tokenBudget: 200000,
      });
      try {
        const header = headerOf(container);
        expect(header, 'header must render').not.toBeNull();
        expect(
          header!.textContent,
          'header text must include `<sessionName> @ <branchName>` (default Sub-Q convention; HALT-WB3-PRE-COMMIT operator may redirect)',
        ).toContain('sess-alpha @ feat/x');
      } finally {
        unmount();
      }
    });

    it('with branchName omitted, renders em-dash placeholder for branch slot', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderHeader({
        sessionName: 'sess-alpha',
        // branchName intentionally omitted
        tokensUsed: 1000,
        tokenBudget: 200000,
      });
      try {
        const header = headerOf(container);
        expect(header, 'header must render').not.toBeNull();
        expect(
          header!.textContent,
          'with branchName absent, header should render `<sessionName> @ —` (em-dash placeholder)',
        ).toContain('sess-alpha @ —');
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (c): ctx N% computed from tokensUsed/tokenBudget', () => {
    it('with tokensUsed=1000 + tokenBudget=200000, renders `ctx 1%` (round(0.5%) = 1%)', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderHeader({
        sessionName: 'sess-alpha',
        branchName: 'feat/x',
        tokensUsed: 1000,
        tokenBudget: 200000,
      });
      try {
        const header = headerOf(container);
        expect(header, 'header must render').not.toBeNull();
        expect(
          header!.textContent,
          'header must include `ctx 1%` for tokensUsed=1000 / tokenBudget=200000 (Math.round(0.5) = 1)',
        ).toContain('ctx 1%');
      } finally {
        unmount();
      }
    });

    it('with tokensUsed=50000 + tokenBudget=200000, renders `ctx 25%`', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderHeader({
        sessionName: 'sess-beta',
        branchName: 'main',
        tokensUsed: 50000,
        tokenBudget: 200000,
      });
      try {
        const header = headerOf(container);
        expect(header, 'header must render').not.toBeNull();
        expect(
          header!.textContent,
          'header must include `ctx 25%` for tokensUsed=50000 / tokenBudget=200000',
        ).toContain('ctx 25%');
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (d): Sub-Q-C=γ placeholders for uptime + plan', () => {
    it('header text includes literal `uptime —` placeholder', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderHeader({
        sessionName: 'sess-alpha',
        branchName: 'feat/x',
        tokensUsed: 1000,
        tokenBudget: 200000,
      });
      try {
        const header = headerOf(container);
        expect(header, 'header must render').not.toBeNull();
        expect(
          header!.textContent,
          'per Sub-Q-MBTWFT2-C=γ defer, header must render literal `uptime —` placeholder (em-dash U+2014)',
        ).toContain('uptime —');
      } finally {
        unmount();
      }
    });

    it('header text includes literal `plan —` placeholder', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderHeader({
        sessionName: 'sess-alpha',
        branchName: 'feat/x',
        tokensUsed: 1000,
        tokenBudget: 200000,
      });
      try {
        const header = headerOf(container);
        expect(header, 'header must render').not.toBeNull();
        expect(
          header!.textContent,
          'per Sub-Q-MBTWFT2-C=γ defer, header must render literal `plan —` placeholder',
        ).toContain('plan —');
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (e): edge cases for ctx N% (no token data yet)', () => {
    it('with tokenBudget undefined, renders `ctx 0%` (honest no-data fallback)', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderHeader({
        sessionName: 'sess-alpha',
        branchName: 'feat/x',
        // tokensUsed + tokenBudget both omitted
      });
      try {
        const header = headerOf(container);
        expect(header, 'header must render').not.toBeNull();
        expect(
          header!.textContent,
          'with tokenBudget undefined, ctx must render `ctx 0%` (avoid NaN/Infinity; mirrors detail-pane.tsx:178-181 guard)',
        ).toContain('ctx 0%');
      } finally {
        unmount();
      }
    });

    it('with tokenBudget=0, renders `ctx 0%` (divide-by-zero guard)', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderHeader({
        sessionName: 'sess-alpha',
        branchName: 'feat/x',
        tokensUsed: 100,
        tokenBudget: 0,
      });
      try {
        const header = headerOf(container);
        expect(header, 'header must render').not.toBeNull();
        expect(
          header!.textContent,
          'with tokenBudget=0, ctx must render `ctx 0%` (divide-by-zero guard)',
        ).toContain('ctx 0%');
      } finally {
        unmount();
      }
    });
  });
});
