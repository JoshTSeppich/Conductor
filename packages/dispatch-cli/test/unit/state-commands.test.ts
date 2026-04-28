/**
 * CLI-T03 — fd kill/pause/hold/arm state commands unit tests.
 *
 * Per X2 line 351 verbatim: "New fd commands (CLI-T03 kill/
 * pause/etc) are NOT faded back — they require daemon."
 * No dispatcher pattern (Arbitration 1 = A); these commands
 * are HTTP-only. T04 may add a /v2/health probe guard
 * surfacing "requires daemon" message on probe-fail.
 *
 * Per finding #36 framework: testable helpers (PATCH body
 * builder, confirm-answer parser, command→target mapping)
 * get red→green TDD. Per-command HTTP roundtrips smoke-
 * tested at CLI-T06 (X2 line 367: "Unit + integration tests
 * for CLI-T03's new commands").
 *
 * P3 scope acked by operator: tests PATCH body shape (CLI
 * side). §6.1 transition validity is daemon-side
 * responsibility verified at DAEMON-T08 + integration at
 * T05/T06. Don't over-scope T03 into transition-validity
 * coverage.
 *
 * Probes (3 logical / 6 effective via P3 it.each):
 *   P1 buildPatchStateBody(target) → {state: target} —
 *      pure shape lock; matches DAEMON-T08 PATCH /v2/
 *      sessions/:name/state request body shape (verified
 *      at sessions.ts state route + dispatch-core
 *      PatchStateRequest schema)
 *   P2 parseConfirmAnswer(answer) — pure function for fd
 *      kill Y/N prompt parsing. Y/y/yes/YES/Yes (case-
 *      insensitive after trim) → true; everything else
 *      → false. Default-N semantic per X2 line 334
 *      "prompts for confirmation (Y/N)".
 *   P3 it.each table-driven over 4 §6.1 target states
 *      (killed/paused/held/armed) verifying
 *      buildPatchStateBody returns the correct shape for
 *      each. Locks the per-command target mapping
 *      indirectly through the shared helper.
 */

import { describe, expect, it } from 'vitest';
import { buildPatchStateBody } from '../../src/lib/daemon-client.js';
import { parseConfirmAnswer } from '../../src/lib/prompt.js';
import type { State } from 'dispatch-core/src/v2/schema.js';

describe('CLI-T03 — state command helpers', () => {
  it('P1 buildPatchStateBody returns {state: target} shape', () => {
    expect(buildPatchStateBody('killed')).toEqual({ state: 'killed' });
    expect(buildPatchStateBody('paused')).toEqual({ state: 'paused' });
  });

  it('P2 parseConfirmAnswer accepts y/yes case-insensitive after trim; default false', () => {
    // Truthy: y, Y, yes, YES, Yes — with optional surrounding whitespace
    expect(parseConfirmAnswer('y')).toBe(true);
    expect(parseConfirmAnswer('Y')).toBe(true);
    expect(parseConfirmAnswer('yes')).toBe(true);
    expect(parseConfirmAnswer('YES')).toBe(true);
    expect(parseConfirmAnswer('Yes')).toBe(true);
    expect(parseConfirmAnswer('   y   ')).toBe(true);
    expect(parseConfirmAnswer('  yes\n')).toBe(true);

    // Falsy: empty, n/no, anything else
    expect(parseConfirmAnswer('')).toBe(false);
    expect(parseConfirmAnswer('   ')).toBe(false);
    expect(parseConfirmAnswer('n')).toBe(false);
    expect(parseConfirmAnswer('no')).toBe(false);
    expect(parseConfirmAnswer('NO')).toBe(false);
    expect(parseConfirmAnswer('maybe')).toBe(false);
    expect(parseConfirmAnswer('y maybe')).toBe(false); // 'y' must be the whole answer
  });

  it.each([
    { command: 'kill' as const, target: 'killed' as State },
    { command: 'pause' as const, target: 'paused' as State },
    { command: 'hold' as const, target: 'held' as State },
    { command: 'arm' as const, target: 'armed' as State },
  ])(
    'P3 fd $command → buildPatchStateBody($target) === {state: $target}',
    ({ target }) => {
      expect(buildPatchStateBody(target)).toEqual({ state: target });
    },
  );
});
