/**
 * MB-T13 WB2 — Probe 05: CHECK constraint rejects bad approval_policy value.
 *
 * Per Q-MBT13-2=a (TEXT enum + CHECK constraint): the DDL enforces enum
 * membership at the storage layer. INSERT with approval_policy='wrong'
 * should throw a CHECK-constraint violation (better-sqlite3 surfaces this
 * as a SqliteError with code SQLITE_CONSTRAINT_CHECK).
 *
 * Defense-in-depth pairs with route-boundary Zod validation
 * (ApprovalPolicyEnum.parse) — both layers reject bad input independently.
 *
 * RED at WB2: migration absent; INSERT throws "no such table" (different
 * error than CHECK).
 * GREEN at WB3: INSERT throws CHECK-constraint failure as expected.
 */

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../../src/lifecycle/db.js';

describe('MB-T13 WB2 — probe-05 — CHECK constraint rejects invalid approval_policy', () => {
  it("INSERT with approval_policy='wrong' throws CHECK-constraint failure", () => {
    const db = new Database(':memory:');
    runMigrations(db);

    expect(() =>
      db
        .prepare(
          `INSERT INTO session_policies (session_name, approval_policy)
           VALUES (?, ?)`,
        )
        .run('test-session', 'wrong'),
    ).toThrowError(/CHECK constraint failed/i);

    db.close();
  });

  it('valid enum values (tight/medium/loose) all succeed', () => {
    const db = new Database(':memory:');
    runMigrations(db);

    for (const policy of ['tight', 'medium', 'loose']) {
      expect(() =>
        db
          .prepare(
            `INSERT INTO session_policies (session_name, approval_policy)
             VALUES (?, ?)`,
          )
          .run(`session-${policy}`, policy),
      ).not.toThrow();
    }

    const rows = db
      .prepare(`SELECT approval_policy FROM session_policies ORDER BY session_name`)
      .all() as { approval_policy: string }[];
    expect(rows.map((r) => r.approval_policy).sort()).toEqual([
      'loose',
      'medium',
      'tight',
    ]);

    db.close();
  });
});
