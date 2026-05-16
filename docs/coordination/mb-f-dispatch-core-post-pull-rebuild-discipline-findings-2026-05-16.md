# MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE — closure findings

**Session**: SESSION-r12-t1c-w1-dispatch-core-post-pull-rebuild
**Date**: 2026-05-16
**Wave**: T1-CLOSURE-Wave-1 (gen-6 expansion cohort)
**Closure path**: (a) postinstall hook in `packages/dispatch-core/package.json`
**FOLLOWUPS row**: `docs/FOLLOWUPS.md:172` (Tier 1)
**Ladder commits**: `23f7c88` (WB1 green) + `24c7d41` (WB2 green)

---

## 1. Diagnose evidence [KNOWN 2026-05-16]

| Probe | Finding |
|---|---|
| Root `package.json` postinstall hook | none present (scripts: test/typecheck/build only) — path-(a) unblocked |
| `time pnpm --filter dispatch-core build` | real 2.123s (well under 30s auto-ack threshold) |
| dispatch-core build mechanism | `tsc` (no tsup.config.ts despite manifest READ list mention; tsconfig.json `outDir: dist`) |
| `packages/dispatch-core/test/` structure | unit/ integration/ fixtures/ subdirs; added `post-pull-rebuild/` |
| `scripts/` directory | does not exist — not created (path-(a) does not require it) |

Both Q-POSTPULL-1 auto-ack envelope conditions satisfied: no existing root postinstall AND build duration << 30s. Selected path-(a) over (b)/(c).
Q-POSTPULL-2 auto-ack: hook scoped to `packages/dispatch-core/package.json` (lifecycle-scoped; doesn't penalize installs that don't touch dispatch-core).

## 2. Closure mechanism

Added a single line to `packages/dispatch-core/package.json`:

```json
"postinstall": "tsc"
```

`tsc` is functionally identical to the existing `build` script. The hook fires after every `pnpm install` invocation that includes `dispatch-core` in the install graph (which, for the workspace root, is always). Empirically observed at WB-final verification:

```
packages/dispatch-core postinstall$ tsc
packages/dispatch-core postinstall: Done
```

`dist/v3/schema.js` mtime advanced 400s during the verification install — postinstall fires and refreshes dist.

## 3. Verification matrix [KNOWN]

| Check | Result |
|---|---|
| WB1 RED state — `scripts.postinstall` undefined | 3/3 probe-01 assertions failed pre-edit |
| WB1 GREEN state — hook added | 3/3 probe-01 + 210/210 prior tests pass (213 total) |
| WB2 GREEN state — content-propagation probe | 4/4 probe-02 + 210/210 prior tests pass (214 total) |
| WB-final `pnpm install` clean trigger | `packages/dispatch-core postinstall$ tsc` observed; dist mtime advanced |
| dispatch-core typecheck | CLEAN |
| dispatch-daemon typecheck | CLEAN |
| dispatch-workstation typecheck | CLEAN (no TS2724-class errors) |
| dispatch-cli typecheck | CLEAN |
| dispatch-web typecheck | CLEAN |

## 4. Mechanism-level finding (probe-02 design iteration)

[KNOWN] Initial probe-02 design used mtime-comparison (`dist mtime >= src mtime`). This is unsound when src mtimes are artificially manipulated — tsc writes outputs at wall-clock time, so an artificially-future-set src mtime leaves dist mtime < src mtime after a real rebuild. Empirically observed during WB2: src 1778971435 vs dist 1778971375 (60s gap) after re-running tsc.

Rewrote probe-02 to test **content propagation** instead: add new exported member to src → rebuild → assert new member appears in dist .d.ts. This is also a more accurate regression probe for the actual FOLLOWUPS row 172 failure mode (TS2724 on missing dist exports = content staleness, not mtime staleness).

This lesson generalizes (file as Tier 3 followup in operator-stamp envelope): **mtime-comparison probes for build-output freshness should be avoided when src mtimes may be set artificially** (test simulation, `git checkout` mtime semantics, etc.). Content-equivalence checks are the honest signal.

## 5. Manifest deviations [KNOWN]

| Manifest detail | Actual | Reason |
|---|---|---|
| Probe extension `.spec.ts` | Used `.test.ts` | `packages/dispatch-core/vitest.config.ts` include glob is `test/**/*.test.{ts,tsx}`; `.spec.ts` would not run. vitest.config.ts not in WRITE territory. |
| `scripts/post-pull-rebuild.sh` (territory-allowed) | Not created | Path-(a) postinstall hook fires automatically on `pnpm install`; auxiliary script not needed. Kept scope tight. |
| READ list mentions `tsup.config.ts` | File does not exist | dispatch-core uses `tsc` directly. |

## 6. Cross-session observations

During this session two sibling commits landed on main:
- `00ea555` (phase5 WB1 RED) between baseline 735703f and my WB1 commit
- `e0e4c60` (phase5 WB2 RED) between my WB1 push and WB2 commit

Both were path-disjoint (workstation/ vs dispatch-core/) — no merge friction. The transient `packages/dispatch-workstation/src/main/preload.mts` unstaged-modified state observed at WB1 staging cleared by WB2 staging (sibling session committed it). Per-path `git add` + `git commit -o` discipline correctly excluded the foreign work from both my commits.

## 7. Closure proposal (operator-stamp envelope)

FOLLOWUPS.md is FORBIDDEN write in this session's territory. Proposing this closure row update for operator stamping:

```
| `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` | RESOLVED (`23f7c88` + `24c7d41` r12-t1c-w1-dispatch-core-post-pull-rebuild 2026-05-16) — closure path-(a): `packages/dispatch-core/package.json` carries `"postinstall": "tsc"`; every `pnpm install` (post-pull/post-clone) refreshes dist automatically. Verification: probe-mbf-postpull-01 (3 assertions, scripts.postinstall === build === tsc), probe-mbf-postpull-02 (4 assertions, LIVE invariant on dist/v3/schema.d.ts re-exports + MECHANISM invariant on tsc content-propagation in tmpdir sandbox). WB-final clean-install confirmed postinstall fires + dist mtime advances. 5-package typecheck CLEAN post-install. CLAUDE.md §3.4 amendment proposed in findings doc §8 (operator-stamp). Discoverability: this row + findings/decisions/impl-coord docs at `docs/coordination/mb-f-dispatch-core-post-pull-rebuild-discipline-*-2026-05-16.md`. | sess-mbt13 merge 2026-05-06 |
```

## 8. CLAUDE.md §3.4 amendment proposal (operator-stamp envelope)

CLAUDE.md is operator-only territory. Proposing this §3.4 amendment for operator stamping (current §3.4 documents the manual workaround; the postinstall hook supersedes it):

```markdown
### §3.4 dispatch-core dist build discipline

Workstation imports use `dispatch-core/dist/v3/schema.js` paths (compiled artifacts), NOT `dispatch-core/src/v3/schema.ts` (source). TypeScript path-mapping resolves both at typecheck time, but Node ESM at runtime requires the actual `.js` artifact in `dist/`.

**Automated via `packages/dispatch-core/package.json` `postinstall: tsc` (closed via `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` 2026-05-16).** Every `pnpm install` (post-pull or post-clone) refreshes dispatch-core/dist/* automatically; downstream packages see fresh .d.ts on subsequent typecheck.

If CC suspects stale dist after an unusual install state (e.g., `pnpm install --filter` excluding dispatch-core), run `pnpm --filter dispatch-core build` to force-refresh. Guarded by `probe-mbf-postpull-01-postinstall-or-merge-gate.test.ts` (asserts hook declared) and `probe-mbf-postpull-02-dist-freshness.test.ts` (LIVE invariant on real dist + MECHANISM invariant on tsc content-propagation).
```

## 9. Methodology observations

- **Path-(a) vs (b) trade-off**: postinstall hook adds ~2s to every `pnpm install` regardless of whether dispatch-core changed. Acceptable given the 2.1s baseline + per-incident cost of forgotten rebuild (operator-time + cross-session diagnostic time). If install latency becomes painful, can add an `if-changed` guard later — followup-worthy as a Tier 3 optimization.
- **Probe iteration was load-bearing**: the mtime-based draft of probe-02 would have shipped a false-positive verification (passes by luck of timing). The content-propagation rewrite was driven by an actual RED failure, not by review — illustrates §2.1 (read actual source; observe actual behavior; don't assume).
- **Manifest-as-prescription has limits**: `.spec.ts` extension in manifest vs `.test.ts` package convention. CC-arbitrable when the deviation is preserving probe executability, not modifying scope.
