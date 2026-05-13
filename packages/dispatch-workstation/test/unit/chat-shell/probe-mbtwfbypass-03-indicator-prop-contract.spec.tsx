// @vitest-environment happy-dom
//
// MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB5 RED —
// probe: BypassPermsIndicator accepts optional bypassActiveCount?
// prop that takes precedence over the T4 WB12 `dispatchMode === 'auto'`
// check when supplied.
//
// Round 11 §3.9 Wave 4 manifest-bound. Path matches manifest glob
// test/unit/chat-shell/probe-mbtwfbypass-*.spec.tsx.
//
// Per ticket body §3.2 Sub-Q-B=(ii) numeric signal + §3.3 Sub-Q-C=(α)
// additive optional prop + §3.4 Sub-Q-D=(any) render-if-any-bypassed
// semantics. Mirrors T10 MaxParallelCounter activeCount? precedent
// (9ec2b6a).
//
// Render branch under combined props:
//   showIndicator = (bypassActiveCount ?? 0) > 0 || dispatchMode === 'auto'
//
// Encoded contract (5 conditions, all RED for component-shape +
// 2 PRE-PASS for backward-compat at HEAD bf1c33b):
//   (1) RED: source-text declares optional `readonly bypassActiveCount?: number`
//       on BypassPermsIndicatorProps.
//   (2) RED: bypassActiveCount={3} + dispatchMode='ask' → indicator renders
//       (count > 0 wins).
//   (3) RED: bypassActiveCount={0} + dispatchMode='ask' → indicator hidden
//       (count === 0 falls back to dispatchMode check).
//   (4) PRE-PASS (regression shield): bypassActiveCount omitted +
//       dispatchMode='auto' → indicator renders (T4 WB12 semantics).
//   (5) PRE-PASS (regression shield): bypassActiveCount omitted +
//       dispatchMode='ask' → indicator hidden (T4 WB12 semantics).
//
// Flips RED → GREEN at WB6 (component MOD).

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, cleanup } from '@testing-library/react';
import { BypassPermsIndicator } from '../../../src/chat-shell/bypass-perms-indicator.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const COMPONENT_PATH = resolve(
  WORKSTATION_ROOT,
  'src/chat-shell/bypass-perms-indicator.tsx',
);

afterEach(() => {
  cleanup();
});

describe('MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB5 RED — BypassPermsIndicator prop-contract', () => {
  describe('Condition (1): source-text declares optional bypassActiveCount? field', () => {
    it('bypass-perms-indicator.tsx declares optional `readonly bypassActiveCount?: number` on BypassPermsIndicatorProps', () => {
      expect(existsSync(COMPONENT_PATH)).toBe(true);
      const source = readFileSync(COMPONENT_PATH, 'utf8');
      expect(
        source,
        'BypassPermsIndicator must declare optional `bypassActiveCount?: number` prop (WB6 GREEN ships it; bypass-perms-source aggregator seam per ticket §3.2 Sub-Q-B=(ii) + §3.3 Sub-Q-C=(α))',
      ).toMatch(/readonly\s+bypassActiveCount\?\s*:\s*number/);
    });
  });

  describe('Condition (2): bypassActiveCount > 0 + dispatchMode="ask" → render (count wins)', () => {
    it('bypassActiveCount={3} + dispatchMode="ask" → indicator visible', () => {
      render(
        <BypassPermsIndicator dispatchMode="ask" bypassActiveCount={3} />,
      );
      const indicator = screen.queryByTestId('bypass-perms-indicator');
      expect(
        indicator,
        'count > 0 must override dispatchMode="ask" — aggregated source signals at least one auto-mode spawn is live, so indicator renders',
      ).not.toBeNull();
    });
  });

  describe('Condition (3): bypassActiveCount === 0 + dispatchMode="ask" → hidden', () => {
    it('bypassActiveCount={0} + dispatchMode="ask" → indicator absent', () => {
      render(
        <BypassPermsIndicator dispatchMode="ask" bypassActiveCount={0} />,
      );
      const indicator = screen.queryByTestId('bypass-perms-indicator');
      expect(
        indicator,
        'count === 0 with dispatchMode="ask" falls back to T4 WB12 dispatchMode check (also false) → indicator hidden',
      ).toBeNull();
    });
  });

  describe('Condition (4) regression: bypassActiveCount omitted + dispatchMode="auto" → render (T4 WB12 semantics)', () => {
    it('dispatchMode="auto" alone preserves T4 WB12 render', () => {
      render(<BypassPermsIndicator dispatchMode="auto" />);
      const indicator = screen.queryByTestId('bypass-perms-indicator');
      expect(indicator).not.toBeNull();
    });
  });

  describe('Condition (5) regression: bypassActiveCount omitted + dispatchMode="ask" → hidden (T4 WB12 semantics)', () => {
    it('dispatchMode="ask" alone preserves T4 WB12 hidden', () => {
      render(<BypassPermsIndicator dispatchMode="ask" />);
      const indicator = screen.queryByTestId('bypass-perms-indicator');
      expect(indicator).toBeNull();
    });
  });
});
