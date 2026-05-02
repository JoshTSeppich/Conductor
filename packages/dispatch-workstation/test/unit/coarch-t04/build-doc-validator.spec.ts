// COARCH-T04 Red cluster 3 — Schema validator.
// Verifies: valid build doc validates clean; missing required field produces
// error with field name; unknown schema_version rejected; invalid action type rejected.
//
// RED state: src/coarchitect/build-doc-validator.ts absent → import fails → FAIL.
// GREEN state: validateBuildDoc implemented → all 4 tests PASS.
//
// Testing mechanism: vitest unit test. No network/Electron.
// Per build-doc-schema-spec.md §4 + §5: validation uses BuildDocFrontmatterSchema and
// BuildDocSchema from dispatch-core/src/v3/schema.ts (frozen at 232fbaa).
// On failure: produces BuildDocValidationError with field_path and issue.
import { describe, it, expect } from 'vitest';
import { validateBuildDoc, BuildDocValidationError } from '../../../src/coarchitect/build-doc-validator.js';

const VALID_DOC = `---
schema_version: "1.0"
doc_id: "test-doc-2026-05-02"
title: "Test Build Plan"
target_repo: "/Users/test/repos/foxworks"
author: "Test Operator"
created_at: "2026-05-02T00:00:00-06:00"
allowed_action_types:
  - "send"
  - "spawn-new-session"
description: "Test build doc for schema validator unit test."
---

## Tickets {#tickets}

### T01: Sample ticket {#tickets-t01}

**Type:** green
**Domain:** coarchitect
**Phase:** Phase 1
**Depends on:** []
**Allowed actions:** [send]
**Status:** pending

**Description:**
Sample ticket for testing.

**Red:**
- test_sample.spec.ts

**Green:**
- Implement sample feature.

**Refactor:**
- None expected
`;

describe('COARCH-T04 cluster 3: build-doc validator', () => {
  it('validates a conformant v1.0 build doc without error', () => {
    const result = validateBuildDoc(VALID_DOC);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.doc.frontmatter.schema_version).toBe('1.0');
      expect(result.doc.frontmatter.doc_id).toBe('test-doc-2026-05-02');
    }
  });

  it('rejects a build doc with a missing required frontmatter field', () => {
    const missing = VALID_DOC.replace(/^title: .+$/m, '');
    const result = validateBuildDoc(missing);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.field_path.includes('title'))).toBe(true);
    }
  });

  it('rejects schema_version other than "1.0"', () => {
    const badVersion = VALID_DOC.replace('schema_version: "1.0"', 'schema_version: "2.0"');
    const result = validateBuildDoc(badVersion);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.field_path.includes('schema_version'))).toBe(true);
    }
  });

  it('rejects allowed_action_types containing an unknown action type', () => {
    const badAction = VALID_DOC.replace(
      /allowed_action_types:[\s\S]*?description:/m,
      `allowed_action_types:\n  - "send"\n  - "teleport-to-mars"\ndescription:`,
    );
    const result = validateBuildDoc(badAction);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.field_path.includes('allowed_action_types'))).toBe(true);
    }
  });
});

describe('COARCH-T04 cluster 3: BuildDocValidationError', () => {
  it('is a proper Error subclass with errors array', () => {
    const err = new BuildDocValidationError([{ field_path: 'frontmatter.title', issue: 'Required' }]);
    expect(err).toBeInstanceOf(Error);
    expect(err.errors).toHaveLength(1);
    expect(err.errors[0].field_path).toBe('frontmatter.title');
  });
});
