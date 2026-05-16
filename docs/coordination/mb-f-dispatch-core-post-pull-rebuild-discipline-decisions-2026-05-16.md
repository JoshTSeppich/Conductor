# MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE — decisions log

**Session**: SESSION-r12-t1c-w1-dispatch-core-post-pull-rebuild
**Date**: 2026-05-16
**Closure ladder**: WB1 (`23f7c88`) + WB2 (`24c7d41`) + WB-final (this doc)

---

## D1 — Closure path: (a) postinstall hook [auto-ack, both envelope conditions satisfied]

| Option | Selected? | Rationale |
|---|---|---|
| (a) postinstall hook in dispatch-core/package.json | **YES** | Cleanest auto-recovery; fires on every `pnpm install`. Both envelope conditions satisfied: no existing root postinstall + build duration 2.123s << 30s. |
| (b) merge-gate script | no | Less invasive on install cycle but operator-discipline-dependent (requires runbook adherence or git post-merge hook). Path-(a) eliminates the human-in-the-loop dependency. |
| (c) docs-only (CLAUDE.md §3.4 amendment) | no — but proposed as supplement | Operator-only territory; would not mechanically prevent the regression. Proposing CLAUDE.md §3.4 amendment text in findings doc §8 as a documentation supplement to the mechanical fix, not as the primary closure. |

Authority: HALT-0 phase-1-diagnose auto-ack envelope; dispatch line 42. Evidence: findings doc §1.

## D2 — Hook location: `packages/dispatch-core/package.json` (scoped) [auto-ack]

| Option | Selected? | Rationale |
|---|---|---|
| Root `package.json` postinstall | no | Would fire on every workspace install regardless of dispatch-core involvement. Penalizes installs that don't touch dispatch-core. |
| `packages/dispatch-core/package.json` postinstall | **YES** | Scoped to dispatch-core lifecycle. Fires when dispatch-core is in the install graph (always true at workspace root). |

Authority: HALT-0 phase-1-diagnose auto-ack envelope; dispatch line 45. Evidence: dispatch-core/package.json now contains the hook.

## D3 — Hook command: `tsc` (not `pnpm run build`) [CC-arbitrated, low risk]

Two equivalent forms:
- `"postinstall": "tsc"` — direct binary invocation
- `"postinstall": "pnpm run build"` — indirect via build script

Selected `tsc` directly:
- One fewer process spawn (no `pnpm` wrapper).
- Identical to existing `build` script (functional equivalence verified by probe-01 assertion 3).
- If `build` script ever diverges from `tsc` (e.g., adds extra steps), this can be revisited.

## D4 — Probe extension: `.test.ts` (not `.spec.ts`) [CC-arbitrated, manifest deviation]

Manifest prescribed `.spec.ts` but `packages/dispatch-core/vitest.config.ts` include glob is `test/**/*.test.{ts,tsx}`. Using `.spec.ts` would silently skip the probes.

Selected `.test.ts`:
- Preserves probe executability (the actual goal).
- Matches package convention (all 27 other dispatch-core test files use `.test.ts`).
- vitest.config.ts is not in WRITE territory — cannot expand the glob.

If operator wants `.spec.ts` strictly enforced, vitest.config.ts include glob would need expansion in a separate ticket; deviation noted in findings doc §5.

## D5 — `scripts/post-pull-rebuild.sh` not created [CC-arbitrated, scope tightening]

Territory permitted the auxiliary script. Not created because path-(a) is self-sufficient — postinstall fires on `pnpm install` without operator action. Helper script would have been a duplicate of `tsc` invocation.

If a future merge-gate-style ticket (e.g., dogfood smoke pre-flight) needs a similar mechanism for `dispatch-workstation` (companion `MB-F-DISPATCH-WORKSTATION-DIST-REBUILD-DISCIPLINE` Tier 2 at FOLLOWUPS row 291), the script can be authored there.

## D6 — Probe-02 design: content-propagation, not mtime-comparison [empirically driven]

Initial draft used `dist.mtimeMs >= src.mtimeMs`. RED revealed this is unsound: tsc writes outputs at wall-clock time, so artificially-future-set src mtime leaves dist mtime < src mtime after a real rebuild. Empirical observation: src 1778971435 vs dist 1778971375 (60s gap) after re-running tsc.

Rewrote to test **content propagation**: add new export to src → rebuild → assert new export in dist .d.ts. This both:
- Avoids the mtime soundness issue.
- More accurately matches the actual failure mode from FOLLOWUPS row 172 (TS2724 on missing exports = content staleness).

Authority: §2.1 anti-fabrication (observe actual behavior; don't trust unverified assumption that mtime-comparison is a sound freshness signal).

## D7 — FOLLOWUPS.md + CLAUDE.md edits deferred to operator stamp [territorial]

Both files are in FORBIDDEN write list for this session. Proposed text for:
- FOLLOWUPS row 172 RESOLVED update — findings doc §7
- CLAUDE.md §3.4 amendment — findings doc §8

Operator stamps these post-review; CC does not commit either file directly.
