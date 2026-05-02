// COARCH-T04 Red cluster 6 — Read-scope enforcement.
// Verifies: read-file within configured allowed scopes succeeds; outside allowed
// scopes throws ReadScopeViolationError; excluded sub-path throws even if parent allowed.
//
// RED state: src/coarchitect/read-scope.ts absent → import fails → FAIL.
// GREEN state: checkReadScope implemented → all 3 tests PASS.
//
// Per WORKSTATION_CONTRACT.md §4.4: EXPLICIT-ALLOW pattern. Operator configures
// allowed directories. Sub-paths can be marked excluded. Workstation enforces at
// build-doc-reader's read-file path.
import { describe, it, expect } from 'vitest';
import { checkReadScope, ReadScopeViolationError } from '../../../src/coarchitect/read-scope.js';

describe('COARCH-T04 cluster 6: read-scope enforcement', () => {
  it('allows a read targeting a path within configured allowed directories', () => {
    const scopes = {
      allowed: ['/Users/test/Desktop/foxworks-dispatch'],
      excluded: [],
    };
    expect(() =>
      checkReadScope('/Users/test/Desktop/foxworks-dispatch/src/main/main.ts', scopes),
    ).not.toThrow();
  });

  it('throws ReadScopeViolationError for a path outside all allowed directories', () => {
    const scopes = {
      allowed: ['/Users/test/Desktop/foxworks-dispatch'],
      excluded: [],
    };
    expect(() =>
      checkReadScope('/Users/test/Desktop/other-project/secret.ts', scopes),
    ).toThrow(ReadScopeViolationError);
  });

  it('throws ReadScopeViolationError for a path matching an excluded sub-path', () => {
    const scopes = {
      allowed: ['/Users/test/Desktop/foxworks-dispatch'],
      excluded: ['/Users/test/Desktop/foxworks-dispatch/.env'],
    };
    expect(() =>
      checkReadScope('/Users/test/Desktop/foxworks-dispatch/.env', scopes),
    ).toThrow(ReadScopeViolationError);
  });

  it('allows a path in allowed dir that is not in the excluded list', () => {
    const scopes = {
      allowed: ['/Users/test/Desktop/foxworks-dispatch'],
      excluded: ['/Users/test/Desktop/foxworks-dispatch/.env'],
    };
    expect(() =>
      checkReadScope('/Users/test/Desktop/foxworks-dispatch/src/main/main.ts', scopes),
    ).not.toThrow();
  });
});
