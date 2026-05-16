# MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE — implementation coordination

**Session**: SESSION-r12-t1c-w1-dispatch-core-post-pull-rebuild
**Date**: 2026-05-16
**Wave**: T1-CLOSURE-Wave-1 (gen-6 expansion cohort)

---

## 1. WB ladder summary

| WB | Status | Commit | Files touched |
|---|---|---|---|
| HALT 0 diagnose | complete | (no commit) | reads only |
| WB1 green | complete | `23f7c88` | `packages/dispatch-core/package.json` (+1 line postinstall hook); `packages/dispatch-core/test/post-pull-rebuild/probe-mbf-postpull-01-postinstall-or-merge-gate.test.ts` (NEW) |
| WB2 green | complete | `24c7d41` | `packages/dispatch-core/test/post-pull-rebuild/probe-mbf-postpull-02-dist-freshness.test.ts` (NEW) |
| WB-final docs | complete | (this batch) | 3 coordination docs + 1 build doc |

Total LOC: ~1 production line (postinstall hook) + ~200 test lines + ~400 doc lines.

## 2. Cross-session territorial coordination

**Sibling sessions in flight during this work** (per dispatch line 3):
- phase5-mount-wiring (workstation/) — landed `00ea555` + `e0e4c60` during this session; path-disjoint.
- onboarding (workstation/onboarding/) — no commits observed during this session.

**Sibling expansion cohort** (per dispatch line 71):
- kanban-empty-state-ux (dispatch-web/) — path-disjoint, no observed commits.
- parallel-cairn-atomic-commit (scripts/) — path-disjoint; `173ead7` landed during my work (their WB-final).

**No territory overlap observed.** Per-path `git add` + `git commit -o` discipline confirmed isolated my commits to my territory across both ladder commits. Transient unstaged-modified states from sibling phase5 sessions (`preload.mts`, `mount.ts`) appeared in `git status --short` between WB1 and WB2 but were excluded by `commit -o` pathspec restriction.

## 3. Verification ordering executed

Per §4.4 (one-at-a-time, no `&&` chains):

```
pnpm install                                    # triggered postinstall: dist mtime advanced 400s
pnpm --filter dispatch-core typecheck           # CLEAN
pnpm --filter dispatch-daemon typecheck         # CLEAN
pnpm --filter dispatch-workstation typecheck    # CLEAN (validates fix — no TS2724-class errors)
pnpm --filter dispatch-cli typecheck            # CLEAN
pnpm --filter dispatch-web typecheck            # CLEAN
```

Test suite:
```
pnpm --filter dispatch-core test                # 214/214 (incl. 3 probe-01 + 4 probe-02)
```

## 4. Outcome classification (§2.11)

**Improved (binary flip + behavioral quality)** — closure path-(a) flips post-pull regression mode from "manifests on every merge that adds dispatch-core exports" to "automatically prevented by pnpm install lifecycle". Verification probes (probe-01 static + probe-02 LIVE+MECHANISM) guard against regression of the closure mechanism itself.

## 5. Followups discovered during this work

To be filed by operator (FOLLOWUPS.md is FORBIDDEN write) — proposed as Tier 3:

| Proposed ID | Body sketch | Rationale |
|---|---|---|
| `MB-F-MTIME-PROBE-UNSOUNDNESS` | mtime-comparison probes for build-output freshness are unsound when src mtimes may be set artificially (test sims, certain `git checkout` semantics). Pattern: prefer content-equivalence checks. Discovered during r12-t1c-w1 probe-02 design iteration; see decisions doc §D6. | Tier 3 methodology pattern; reusable across packages. |
| `MB-F-WORKSTATION-DIST-REBUILD-PARITY` | Apply path-(a)-equivalent closure to companion FOLLOWUPS row 291 `MB-F-DISPATCH-WORKSTATION-DIST-REBUILD-DISCIPLINE` (dogfood scripts vs stale workstation dist). dispatch-workstation/package.json could carry an equivalent `postinstall` hook for its build step. | Tier 2 — same pattern; not yet closed; potentially blocked by need to gate dogfood-only vs all-install scenarios. |

## 6. Tokens / methodology metrics

- Total session token consumption: not measured directly (will be in gen-6 telemetry).
- Cairn-grammar commits: 2 (`green` × 2). No `spike` / `contract` / `red` (probes shipped GREEN-only; RED state was demonstrated empirically per WB but not committed separately because the RED-state probe-without-impl pattern would block downstream commits — see HALT 0 §2.4 self-check Q3 confirms RED→GREEN cycle was executed).
- Pre-commit-push discipline holds: 2 commits, 2 pushes, 0 unpushed commits at any WB boundary.

## 7. Operator-stamp envelope items (queued for gen-6)

1. `docs/FOLLOWUPS.md` row 172 RESOLVED stamp — text in findings doc §7.
2. `docs/CLAUDE.md` §3.4 amendment — text in findings doc §8.
3. Optional: 2 new Tier-2/3 followup rows (MB-F-MTIME-PROBE-UNSOUNDNESS + MB-F-WORKSTATION-DIST-REBUILD-PARITY) per §5 above.

These are NOT auto-applied — operator-arbitrated stamps.
