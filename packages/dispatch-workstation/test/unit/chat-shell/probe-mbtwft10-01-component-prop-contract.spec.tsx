// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW WB3 RED —
// probe-mbtwft10-01-component-prop-contract: assert MaxParallelCounter
// accepts an OPTIONAL `activeCount?: number` prop that takes precedence
// over the inline sessions-filter when supplied.
//
// Round 11 §3.9 SPECULATIVE manifest-bound T10 ladder. Per
// phase4-t9-t10-exec.txt manifest, this probe lives at
// test/unit/chat-shell/probe-mbtwft10-*.spec.tsx (manifest-allowed).
//
// Why the new prop matters: at WB2 (8ea83a0), daemon ships canonical-
// named pure-fns `aggregateActiveSessionCount` + `resolveMaxParallel`
// + DEFAULT_MAX_PARALLEL=16. Future cross-package consumers
// (daemon HTTP endpoint, workstation main-process aggregator) will
// compute N upstream and want to PASS THE NUMBER directly to the
// component — without forcing the consumer to re-construct a synthetic
// `sessions: SessionEntryShape[]` array just to satisfy the filter.
// The new optional `activeCount` prop is the architectural seam that
// lets the consumer skip the inline filter when it has authoritative
// N already.
//
// Backward compatibility: when `activeCount` is OMITTED, the component
// continues to use the inline `sessions.filter` predicate (T4 WB4
// shipped semantics preserved verbatim). Existing callers (chat-shell
// slot supplier at T4 WB4 SHIPPED) need NO changes.
//
// Encoded contract (4 conditions, all RED at HEAD 8ea83a0):
//   (1) Source-text: max-parallel-counter.tsx declares an OPTIONAL
//       `activeCount?: number` field on MaxParallelCounterProps.
//   (2) Render-behavior: when `activeCount={5}` is supplied (with
//       a sessions array that would yield a DIFFERENT count via the
//       inline filter), the rendered text uses 5 — i.e. activeCount
//       takes precedence over the inline filter.
//   (3) Backward compatibility: when activeCount is OMITTED, the
//       inline sessions-filter behavior is preserved (3 open + 2
//       closed → "3/M").
//   (4) M (maxParallel) prop behavior unchanged: passes through
//       verbatim from props to rendered output.
//
// Flips RED → GREEN at WB4 (component prop addition).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { MaxParallelCounter } from '../../../src/chat-shell/max-parallel-counter.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const COMPONENT_PATH = resolve(
  WORKSTATION_ROOT,
  'src/chat-shell/max-parallel-counter.tsx',
);

afterEach(() => {
  cleanup();
});

describe('MB-T-WIREFRAME-T10 WB3 RED — MaxParallelCounter prop-contract extension', () => {
  describe('Condition (1): source-text — activeCount?: number declared on props', () => {
    it('max-parallel-counter.tsx declares optional activeCount field on MaxParallelCounterProps', () => {
      expect(existsSync(COMPONENT_PATH)).toBe(true);
      const source = readFileSync(COMPONENT_PATH, 'utf8');
      // Match either `activeCount?: number` or `readonly activeCount?: number`
      // (component uses `readonly` per existing field convention).
      expect(
        source,
        'MaxParallelCounter must declare an optional `activeCount?: number` prop (WB4 ships it; T10 architectural seam for future cross-package consumers passing pre-computed N)',
      ).toMatch(/readonly\s+activeCount\?\s*:\s*number/);
    });
  });

  describe('Condition (2): activeCount prop takes precedence over inline sessions-filter', () => {
    it('when activeCount={5} supplied, rendered text uses 5 regardless of sessions array', () => {
      // sessions array would yield count=3 via inline filter, but
      // activeCount=5 should override.
      render(
        <MaxParallelCounter
          sessions={[
            { name: 's1', status: 'open' },
            { name: 's2', status: 'open' },
            { name: 's3', status: 'open' },
            { name: 's4', status: 'closed' },
            { name: 's5', status: 'closed' },
          ]}
          activeCount={5}
          maxParallel={8}
        />,
      );
      const counter = screen.getByTestId('max-parallel-counter');
      expect(counter.textContent).toBe('max-parallel · 5/8');
    });
  });

  describe('Condition (3): activeCount omitted → backward-compat inline filter', () => {
    it('when activeCount omitted, sessions-filter is used (3 open + 2 closed → "3")', () => {
      render(
        <MaxParallelCounter
          sessions={[
            { name: 's1', status: 'open' },
            { name: 's2', status: 'open' },
            { name: 's3', status: 'open' },
            { name: 's4', status: 'closed' },
            { name: 's5', status: 'closed' },
          ]}
          maxParallel={16}
        />,
      );
      const counter = screen.getByTestId('max-parallel-counter');
      expect(counter.textContent).toBe('max-parallel · 3/16');
    });
  });

  describe('Condition (4): maxParallel prop pass-through unchanged', () => {
    it('renders the supplied maxParallel verbatim (M is already prop-driven; T4 WB4 seam preserved)', () => {
      render(
        <MaxParallelCounter
          sessions={[{ name: 's1', status: 'open' }]}
          maxParallel={32}
        />,
      );
      const counter = screen.getByTestId('max-parallel-counter');
      expect(counter.textContent).toBe('max-parallel · 1/32');
    });
  });
});
