/**
 * DAEMON-T18 — path resolution unit tests.
 *
 * Covers the pure function that walks up from a starting
 * directory to find the repo root, identified by the presence
 * of CONDUCTOR_API_CONTRACT.md (S04 ADR §"Bootstrap requires
 * absolute paths" + §5 marker file convention).
 *
 * resolveNodeBinary is intentionally NOT unit-tested per
 * finding #36 framework (thin OS-boundary wrapper around
 * `command -v node`; smoke-tested by operator at install time).
 *
 * Probes (2 in this file):
 *   P3 resolveRepoRoot from inside the repo → returns the
 *      absolute path to the repo root (where the marker
 *      lives)
 *   P4 resolveRepoRoot from outside the repo (no marker
 *      reachable via walk-up) → throws with operator-helpful
 *      message
 */

import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveRepoRoot } from '../../src/install/paths.js';

describe('DAEMON-T18 — resolveRepoRoot', () => {
  it('P3 from inside the repo → returns absolute path to repo root', () => {
    // The test file itself lives at:
    //   <repo-root>/packages/dispatch-daemon/test/unit/install-paths.test.ts
    // walk-up should land on <repo-root> where CONDUCTOR_API_CONTRACT.md
    // sits.
    const result = resolveRepoRoot(import.meta.dirname);
    expect(result).toMatch(/foxworks-dispatch$/);
    // Sanity: the returned path is absolute
    expect(result.startsWith('/')).toBe(true);
  });

  it('P4 from outside repo → throws with operator-helpful message', async () => {
    // mkdtemp creates an isolated dir under /var/folders or /tmp
    // — walk-up from there reaches / without finding the marker.
    const isolated = await mkdtemp(join(tmpdir(), 'fd-t18-no-marker-'));
    expect(() => resolveRepoRoot(isolated)).toThrow(
      /foxworks-dispatch/i,
    );
    // Specific operator-helpful text per arb 2 ("Run installer
    // from inside foxworks-dispatch repo")
    expect(() => resolveRepoRoot(isolated)).toThrow(
      /run.+from inside.+foxworks-dispatch/i,
    );
  });
});
