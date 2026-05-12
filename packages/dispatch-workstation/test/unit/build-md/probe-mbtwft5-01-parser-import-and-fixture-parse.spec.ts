// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB1 RED · MBTWFT5-01
//
// Probes the workstation-side parser-consumer foundation:
//
//   (1) Workstation can resolve + import the MB-T28 parser library
//       (`parseBuildDoc` from `dispatch-core/dist/build-doc-parser/index.js`)
//       — verifies the cross-package import path stable per CLAUDE.md §3.4.
//
//   (2) `parseBuildDoc` against a hand-rolled minimal valid BUILD.md
//       fixture returns `{ ok: true, dag: TaskDAG }` with `dag.tasks.length === 1`
//       — verifies parser API contract (frozen at MB-T28 `7ce34b4` merge).
//
//   (3) Workstation exposes a `loadBuildMd` factory at
//       `packages/dispatch-workstation/src/build-md/service.ts`
//       — at WB1 RED time this module does NOT yet exist; the import
//       fails at module-resolve and vitest reports the suite RED.
//       WB2 GREEN ships `service.ts` and flips RED → GREEN.
//
// Design (per Sub-Q-MBTWFT5-A=(i) operator-arbitrated 2026-05-12):
// `loadBuildMd(path)` is the workstation-side facade; path resolution
// (default = repo-root `BUILD.md`) lives inside the facade so the lib
// stays testable with explicit path.

import { describe, it, expect } from 'vitest';
import { parseBuildDoc } from 'dispatch-core/dist/build-doc-parser/index.js';

// @ts-expect-error — WB1 RED: import target absent until WB2 GREEN ships the service module.
import { loadBuildMd } from '../../../src/build-md/service.js';

// Minimal valid BUILD.md fixture per MB-T28 spec (preamble §3.1 + one §3.2 task).
const MINIMAL_FIXTURE = `# BUILD

**Repo:** mbtwft5-test
**Plan rev:** 2026-05-12.A

## §1 — Single task baseline

**Goal:** Smallest valid BUILD.md acceptable to parseBuildDoc for T5 WB1 probe.

**Branch:** feat/mbtwft5-fixture

**Depends on:** —

**Acceptance:**
- Parser returns ok=true with one task
`;

describe('MBTWFT5-01 parser-import + fixture-parse (workstation-consumer foundation)', () => {
  it('imports parseBuildDoc from dispatch-core dist (cross-package boundary stable)', () => {
    expect(typeof parseBuildDoc).toBe('function');
  });

  it('parses minimal valid fixture and returns ok=true with exactly one task', () => {
    const result = parseBuildDoc(MINIMAL_FIXTURE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dag.tasks.length).toBe(1);
      expect(result.dag.tasks[0].id).toBe('1');
      expect(result.dag.tasks[0].branch).toBe('feat/mbtwft5-fixture');
      expect(result.dag.preamble.repo).toBe('mbtwft5-test');
      expect(result.dag.preamble.planRev).toBe('2026-05-12.A');
    }
  });

  it('exposes loadBuildMd from workstation build-md service module', () => {
    expect(typeof loadBuildMd).toBe('function');
  });
});
