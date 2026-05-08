import type { ParseResult } from './types.js';

/**
 * Parse a BUILD.md document per the operator-arbitrated spec
 * (`~/Downloads/BUILD-md-spec.md`; spec-in-repo deferred per Q-MBT28-6).
 *
 * Pure function — no I/O, no side effects, no globals.
 *
 * WB1 RED stub: returns a single `preamble.missing` error so probes that
 * expect successful parsing assert the failure shape with specific
 * messages rather than crash on missing exports.
 *
 * Implementation lands across WB2-WB8.
 */
export function parseBuildDoc(_text: string): ParseResult {
  return {
    ok: false,
    errors: [
      {
        code: 'preamble.missing',
        message: 'parser not yet implemented (WB1 RED stub)',
        line: 0,
      },
    ],
  };
}
