# MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE — build doc

**Ticket type**: Followup closure (Tier 1)
**Followups row**: `docs/FOLLOWUPS.md:172`
**Session**: SESSION-r12-t1c-w1-dispatch-core-post-pull-rebuild
**Date**: 2026-05-16
**Status**: RESOLVED pending operator-stamp on FOLLOWUPS.md row + CLAUDE.md §3.4 amendment.

---

## 1. Scope

Close the workstation-typecheck-fails-until-rebuild incident pattern by adding an automatic `dist/` refresh on every `pnpm install`. The incident is rooted in the dual-import pattern: workstation imports `dispatch-core/dist/v3/schema.js`, so when dispatch-core src adds new exports, the dist `.d.ts` is stale until manually rebuilt. Pattern manifested 2026-05-06 post-sess-mbt13 merge (TS2724 on new §13 OrchestratorSwarmAudit* exports).

## 2. Closure design — path-(a) postinstall hook

```diff
  // packages/dispatch-core/package.json
  "scripts": {
    "test": "vitest run --passWithNoTests",
    "typecheck": "tsc --noEmit",
    "build": "tsc",
+   "postinstall": "tsc",
    ...
  }
```

- Fires on every `pnpm install` invocation that includes dispatch-core in the install graph.
- `tsc` is functionally identical to existing `build` script (probe-01 assertion 3).
- Build duration 2.123s — small enough to add to install cycle without complaint.

Other paths considered and rejected (see decisions doc D1):
- (b) merge-gate script — requires operator runbook discipline; brittle.
- (c) docs-only — won't mechanically prevent the regression; proposed as supplement only (CLAUDE.md §3.4 amendment in findings doc §8).

## 3. Verification

### probe-mbf-postpull-01 (`packages/dispatch-core/test/post-pull-rebuild/probe-mbf-postpull-01-postinstall-or-merge-gate.test.ts`)

3 static assertions over `packages/dispatch-core/package.json`:
1. `scripts.postinstall` is defined.
2. `scripts.postinstall` contains `tsc`.
3. `scripts.postinstall === scripts.build` (functional equivalence).

Guards against accidental hook removal or divergence from build.

### probe-mbf-postpull-02 (`packages/dispatch-core/test/post-pull-rebuild/probe-mbf-postpull-02-dist-freshness.test.ts`)

**LIVE invariant** (2 assertions over current dispatch-core dist):
1. `dist/v3/schema.d.ts` exists.
2. `dist/v3/schema.d.ts` re-exports stable `src/v3/schema.ts` names (`ActionTypeEnum`, `TicketTypeEnum`, `TicketLifecycleStateEnum`). Catches forgotten-rebuild drift.

**MECHANISM invariant** (2 assertions, sandboxed in `os.tmpdir()`):
3. Initial `tsc` produces `dist/sample.d.ts` containing the existing export.
4. After adding a new export to src and re-running `tsc`, dist `.d.ts` contains both old and new exports. Verifies the contract the postinstall hook actually maintains.

Sandboxed in tmpdir because `packages/dispatch-core/src/**` is FORBIDDEN write for this session.

### WB-final clean install + 5-package typecheck

```
$ pnpm install
packages/dispatch-core postinstall$ tsc
packages/dispatch-core postinstall: Done

$ for pkg in core daemon workstation cli web; do pnpm --filter dispatch-$pkg typecheck; done
# all CLEAN — no TS2724 in workstation
```

## 4. Operator-stamp items

See coordination findings doc §7 (FOLLOWUPS row 172 RESOLVED text) and §8 (CLAUDE.md §3.4 amendment text). Both files are FORBIDDEN write for this session; operator arbitrates the stamp.

## 5. Companion / forward work

- **MB-F-DISPATCH-WORKSTATION-DIST-REBUILD-DISCIPLINE** (FOLLOWUPS row 291, Tier 2) — same pattern at the dispatch-workstation/dist boundary. Apply the same path-(a) closure (or its merge-gate equivalent) in a dedicated ticket. See impl-coord doc §5.
- **MB-F-MTIME-PROBE-UNSOUNDNESS** (proposed Tier 3) — methodology lesson from probe-02 design iteration. See decisions doc D6.

## 6. Ladder commits

- `23f7c88` — green(MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE): WB1 — postinstall hook in dispatch-core/package.json + probe-01
- `24c7d41` — green(MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE): WB2 — dist-freshness probe-02 (LIVE + MECHANISM invariants)
- (WB-final docs commit) — this doc + findings + decisions + impl-coord
