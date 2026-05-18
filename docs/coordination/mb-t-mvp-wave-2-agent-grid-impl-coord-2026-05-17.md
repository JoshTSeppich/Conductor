# MB-T-MVP-W2-AGENT-GRID — Impl coordination notes (2026-05-17)

**Session:** r12-mvp-w2-agent-grid (gen-7 dispatch under operator OPTION (B))
**Concurrent waves:** R12-MVP-Wave-1 (orchestrator-focus-pane) — `r12-mvp-w1-orchestrator-focus-pane`

## §1 — Territory respected

Per `docs/coordination/territorial-manifests/r12-mvp-w2-agent-grid.txt`:
- ✓ All writes confined to TERRITORY (8 src files + 4 test probes + 4 docs).
- ✓ Per-path `git add` used for every commit (CLAUDE.md §2.7).
- ✓ Per-path `git commit -o` used for first-commit-of-NEW-file pathspec restriction (memory: `feedback_git_commit_pathspec_for_new_files`).
- ✓ No writes to FORBIDDEN paths (verified via `git status --short` pre-commit each WB).
- ✓ Push-after-each-cairn-commit discipline (CLAUDE.md §2.6); `git log origin/main..HEAD` empty after every push.

## §2 — Cross-wave coordination findings

### §2.1 Wave-1 produced typecheck-blocking commits AFTER Wave-2 WB3 push

**Sequence:**
1. Wave-2 WB1 GREEN pushed @ `186e401` (~17:48 MDT)
2. Wave-2 WB2 GREEN pushed @ `8742117` (~17:53 MDT)
3. Wave-2 WB3 RED pushed @ `851afb3` (~17:55 MDT)
4. Wave-2 WB3 GREEN pushed @ `95103b6` (~18:28 MDT)
5. **Wave-1 WB1 RED + GREEN pushed @ `701a1dc` + `a904bdb`** (~18:30-18:45 MDT — interleaved)
6. Wave-2 WB-final verification reveals workstation typecheck FAILS in Wave-1's new `src/orchestrator-focus-pane/focus-pane.tsx` (Wave-1 territory).

**Cross-wave attribution [KNOWN]:**
- Wave-2's modifications (tile-grid.tsx, tile-grid-app.tsx, tile.tsx, agent-grid-layout.ts, 4 probe files) do NOT produce typecheck errors in any package.
- All 4 error lines reference `src/orchestrator-focus-pane/focus-pane.tsx` (Wave-1 NEW file at commit `a904bdb`).
- workstation `tsconfig.json` excludes all .tsx renderer files from `tsc --noEmit` (pattern at top-level `"exclude"` array — tile.tsx, tile-grid.tsx, etc.). Wave-1's new file was NOT added to this list.

**Bidirectional fence (CLAUDE.md §2.9):**
- Wave-2 does NOT modify Wave-1's tsconfig or focus-pane.tsx (out-of-territory; would be `add focus-pane.tsx → exclude` in `packages/dispatch-workstation/tsconfig.json` — a Wave-1 closure action).
- Surfaced as Tier-1 followup `MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING`.

### §2.2 Path-disjoint verification

Wave-1 territory and Wave-2 territory share zero write paths (per manifest comparison):

| Path family | Wave-1 | Wave-2 |
|---|---|---|
| `src/orchestrator-focus-pane/**` | WRITE | READ-ONLY |
| `src/tile-grid/*.tsx` (specific files) | (FORBIDDEN/READ-ONLY per Wave-1 manifest, presumed) | WRITE |
| `src/tile-grid/agent-grid-layout.ts` (NEW) | (FORBIDDEN) | WRITE |
| `src/main/*.ts` sentinel | WRITE (sentinel-block insert) | FORBIDDEN |
| `test/unit/tile-grid/probe-mbt-mvp-w2-*` | (FORBIDDEN) | WRITE |
| `docs/coordination/mb-t-mvp-wave-2-*` | (FORBIDDEN) | WRITE |

Wave-1 and Wave-2 commits never modified the same file. No merge conflicts arose.

### §2.3 [SPECULATIVE → KNOWN at WB-final] Wave-2 timing observation

Wave-2 estimated 3-4 WB; actual: WB1 + WB2 + WB3 + WB-final + 4 probe files in 4 commits (RED red green green red green probes), ~80 minutes wall-clock. Pre-existing Phase-1-diagnose (subagent invocation) ~6 min. Targeted test runs ~5s each. Typecheck per package ~3-5s. Token budget: ~50k consumed of the 50k allowance (close-but-within-margin per V4 cascade discipline).

## §3 — Open coordination items for gen-7

1. Wave-1 typecheck break (§2.1) — escalate at Wave-1's WB-final OR operator-arbitrated as a tsconfig-exclude amendment.
2. `MB-F-AGENT-GRID-AUTO-EXIT-REACTIVITY` (Tier 1) — dispatchable when Wave-1 lands + a session-exit IPC channel becomes available; deferred to post-MVP.
3. Hero-squad disposition (Q-W2-2 (b) FLAG-PRESERVE) — operator-confirm if eventual deletion (Tier 3 followup `MB-F-TILE-HERO-SQUAD-DEAD-CODE-EVENTUAL-REMOVAL`) is desired post-dogfood.
4. Chrome density at 40% width (Q-W2-6 disposition (b) preserve-full-chrome) — operator-dogfood + visual review to confirm no overcrowding regression; if regression, file a `MB-F-AGENT-GRID-COMPACT-CHROME-PROFILE` ticket.

## §4 — Wave-2 STANDBY-ACK payload (for gen-7 ingestion)

```
STANDBY-ACK: MB-T-MVP-W2-AGENT-GRID CLOSED at <WB-final-SHA> — operator-vision
Component 2 agent-grid restyle delivered (2x2/2x3/3x3/3x4 layout via NEW
src/tile-grid/agent-grid-layout.ts; uptime chrome prop-drill closed end-to-end;
4 probe files / 48 NEW tests GREEN; 4 of 5 packages typecheck clean — workstation
typecheck failure attributed to Wave-1's focus-pane.tsx tsconfig-exclude omission,
filed MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING). Manifest territory
respected; ready for next dispatch OR /clear-recycle.
```
