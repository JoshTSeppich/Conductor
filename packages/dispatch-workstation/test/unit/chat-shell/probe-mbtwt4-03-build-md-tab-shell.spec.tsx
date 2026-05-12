// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB5 (red) —
// BUILD.md tab body component contract probe.
//
// Per ticket body f8fc24d §4 WB5 + Sub-Q-T4-B=(iii) operator-pre-
// arbitrated 2026-05-12 ("accept all defaults"):
//   - Sub-Q-T4-B=(iii): ship tab body placeholder; T5 owns actual
//     BUILD.md content rendering.
//   - Component lives at `src/chat-shell/build-md-tab.tsx`
//     (NEW at WB6 GREEN).
//   - Placeholder content cross-refs `MB-T-WIREFRAME-T5-BUILD-MD-
//     DRIVEN-DISPATCH` (T5 ticket landed at `c92f750` per Phase 1
//     second batch convergence).
//   - mount.ts integration (including BUILD.md tab in `tabs` array
//     passed to ChatShell) deferred to WB12 final layout
//     consolidation OR T5 sibling territory.
//
// Encoded contract (4 conditions per ticket body §4 WB5 acceptance):
//   (1) BuildMdTab component is exported from
//       `src/chat-shell/build-md-tab.tsx` (dynamic-import with
//       @vite-ignore RED-robust pattern).
//   (2) Calling `<BuildMdTab />` renders a `<div data-testid="build-
//       md-tab-placeholder">` element (placeholder shell present).
//   (3) Placeholder text content cross-refs T5 ticket name (string
//       contains `MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH` OR a
//       substring "BUILD.md content shipped by MB-T-WIREFRAME-T5"
//       per Sub-Q-T4-B=(iii) ticket body language).
//   (4) BuildMdTab works as a TabConfig.render fn — wrapping in
//       ChatShell with a BUILD.md TabConfig + selecting that tab
//       renders the placeholder inside `chat-shell-tab-content`.
//
// RED state at HEAD `b9e8d4b` (post-WB4 GREEN):
//   - `src/chat-shell/build-md-tab.tsx` does NOT exist; dynamic
//     import fails → BuildMdTab undefined → 4/4 conditions fail.
//
// WB6 GREEN target:
//   1. NEW `src/chat-shell/build-md-tab.tsx` exports
//      `BuildMdTab(): JSX.Element` rendering `<div data-testid="build-
//      md-tab-placeholder">BUILD.md content shipped by MB-T-WIREFRAME-
//      T5-BUILD-MD-DRIVEN-DISPATCH. ...</div>` per Sub-Q-T4-B=(iii).
//   2. (Deferred) mount.ts wiring to include BUILD.md TabConfig in
//      ChatShell tabs array — WB12 layout consolidation OR T5 owns.

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatShell, type TabConfig } from '../../../src/chat-shell/chat-shell.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BuildMdTabCmp = () => JSX.Element;

let BuildMdTab: BuildMdTabCmp | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/chat-shell/build-md-tab.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    BuildMdTab = (mod as { BuildMdTab?: BuildMdTabCmp }).BuildMdTab;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

describe('MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB5 — BuildMdTab placeholder body (Sub-Q-T4-B=iii defer-with-placeholder)', () => {
  describe('Condition (1): BuildMdTab component is exported', () => {
    it('module `src/chat-shell/build-md-tab.tsx` exports BuildMdTab', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(
        BuildMdTab,
        'BuildMdTab export must exist (WB6 GREEN authors the module)',
      ).toBeDefined();
    });
  });

  describe('Condition (2): renders build-md-tab-placeholder testid', () => {
    it('<BuildMdTab /> renders an element with data-testid="build-md-tab-placeholder"', () => {
      expect(BuildMdTab).toBeDefined();
      render(<BuildMdTab />);
      const placeholder = screen.queryByTestId('build-md-tab-placeholder');
      expect(
        placeholder,
        'placeholder element must render — operator-acked Sub-Q-T4-B=(iii) defer-with-placeholder',
      ).not.toBeNull();
    });
  });

  describe('Condition (3): placeholder text cross-refs T5 ticket', () => {
    it('placeholder text content includes "MB-T-WIREFRAME-T5"', () => {
      expect(BuildMdTab).toBeDefined();
      render(<BuildMdTab />);
      const placeholder = screen.queryByTestId('build-md-tab-placeholder');
      expect(placeholder).not.toBeNull();
      expect(
        placeholder!.textContent,
        'placeholder must cross-ref T5 ownership per Sub-Q-T4-B=(iii) ticket body language',
      ).toMatch(/MB-T-WIREFRAME-T5/);
    });
  });

  describe('Condition (4): BuildMdTab works as TabConfig.render fn', () => {
    it('ChatShell with BUILD.md tab config renders placeholder in tab-content when tab is active', () => {
      expect(BuildMdTab).toBeDefined();
      const chatTab: TabConfig = {
        id: 'chat',
        label: 'Chat',
        render: () => null,
      };
      const buildMdTab: TabConfig = {
        id: 'build-md',
        label: 'BUILD.md',
        render: () => <BuildMdTab />,
      };
      render(<ChatShell tabs={[chatTab, buildMdTab]} />);
      // Pre-click: chat tab is default (first tab); placeholder absent.
      expect(
        screen.queryByTestId('build-md-tab-placeholder'),
        'pre-click: chat tab active; placeholder should NOT render',
      ).toBeNull();
      // Click BUILD.md tab.
      const buildMdButton = screen.getByTestId('chat-shell-tab-build-md');
      fireEvent.click(buildMdButton);
      // Post-click: BUILD.md tab active; placeholder renders.
      const placeholder = screen.queryByTestId('build-md-tab-placeholder');
      expect(
        placeholder,
        'post-click: BUILD.md tab active; placeholder must render in tab-content',
      ).not.toBeNull();
    });
  });
});
