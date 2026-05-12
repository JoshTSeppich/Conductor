# coord-spawnmode-2026-05-12 — cross-session coordination notes

**Session**: `commit-plan-doc-1334` (Round 11 §3.9 SPECULATIVE Continuation Wave 2)
**Ladder**: WB1 → WB2 → WB3 → WB-final
**Closure**: MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING path (a) end-to-end
**Companion doc**: `mb-f-tilegridsessionentry-spawnmode-2026-05-12.md` (durable findings)

## §1 — Cross-session interlocks (read at session start; verified at close)

| Sibling session | Their declared territory | My intersection | Resolution |
|---|---|---|---|
| `c5-ticket-wb1` (Round 11 Wave 2) | `tile-grid-app.tsx` + frame-c integration trinity (`probe-frame-c-ipc-lookup-registry.spec.ts`, framemode subscription, focus-event consumer) | TileGridSessionEntry is locally defined in MY `tile-grid.tsx` (not `tile-grid-app.tsx`) — strict path-disjoint. `tile-grid-app.tsx:159-185` spawn-result subscription is a sibling consumer that ALSO would benefit from spawnMode plumb-through; deferred as `MB-F-TILE-GRID-APP-SPAWN-RESULT-CONSUMER-DOES-NOT-PROPAGATE-SPAWNMODE` Tier 3 (findings §VII row 3). | Path-disjoint at file granularity. INCIDENT: see §3.RECURRENCE-1 below |
| `t3-ticket-body-0905` (Round 11 Wave 2) | `frame-c-ipc-deps.ts` + `frame-c-ipc-deps-production.ts` + `probe-frame-c-deps-production-*` | I produce `entry.spawnMode`; t3 wires production lookupSession factory. Their lookup returns the entry from a registry — if that registry copies entries from FrameCRoot's state, my spawnMode propagates automatically. No explicit handoff needed. | Path-disjoint |
| `phase4-t8-exec` / `phase4-t9-exec` (Wave 1 — completed) | T8 cost meter + T9 plan timer data flow | None | None |
| `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS` (`55776cf` red WB1) | `model?:` + `spawnedAtMs` fields on SpawnSessionResult | Same source-of-truth interface (`spawn-handler.ts`); they explicitly downscoped to exclude `spawnMode` ("spawnMode arm absorbed by sibling commit-plan-doc-1334" — their probe docstring at `55776cf`) | Explicit coordination — peer scoped out my arm; no conflict |
| `r11-archive-writer` (continuation) | `docs/cairn-under-stress-round-11.md` + `docs/coordination/round-11-archive-coauthor-notes-2026-05-12.md` | FORBIDDEN to me (`docs/cairn-*.md` glob + r11-archive territory). INCIDENT: see §3.RECURRENCE-4 + §3.RECURRENCE-5 below | Caught at pre-stage check |
| `__orchestrator_active` (continuation) | Phase 4 status synthesis (`docs/coordination/phase-4-status-2026-05-12.md`) | None | None |

## §2 — Manifest territory delta surfaced for formalization (operator W2A ack 2026-05-12)

Operator-granted ad-hoc territorial expansion at WB2 GREEN:

```
packages/dispatch-workstation/test/unit/mb-t05/test_spawn_daemon_registration.spec.ts
packages/dispatch-workstation/test/unit/mb-t05/test_spawn_ipc_handler.spec.ts
packages/dispatch-workstation/test/unit/wiring-spawn/test_post_spawn_liveness_check.spec.ts
```

**Reason**: legacy `toEqual({...4-field result envelope})` consumer assertions broke under my optional-field addition. One-line `+ spawnMode: 'ask',` patches each. Operator acked W2A path (minimal-scope; spec-faithful; alternative W2C `objectContaining` refactor deferred to dedicated cleanup ticket).

**Manifest formalization recommendation**: codify these 3 paths in `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS` peer ticket (`55776cf`) manifest so they pre-claim the territory and avoid a second ad-hoc relaxation. See findings doc §VIII.

## §3 — c5-incident timeline + RECURRENCE catalog

### RECURRENCE-1 — `63eba0f` cross-session commit-absorption (2026-05-12 15:09:24)

**Mechanism**: `c5-ticket-wb1` ran `git add` against a directory glob (or `git add -A`/`git add .` — §2.7 violation) at the moment my WB1 GREEN edits to `src/tile-grid/tile-grid.tsx` + `test/unit/tile-grid/probe-spawnmode-01-entry-type-shape.spec.ts` were STAGED in the shared working-tree index. c5's commit absorbed my staged content verbatim.

**Evidence**:
- `git diff 63eba0f^..63eba0f -- packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` shows my exact WB1 GREEN docstring + `readonly spawnMode?: 'auto' | 'ask';` line.
- c5's commit body even claims per-path discipline: "Per-path git add caught foreign-staged file (`docs/coordination/phase-4-status-2026-05-12.md` from __orchestrator_active session) which was unstaged before commit per §2.7 + §3.9.A territorial enforcement." They caught ONE foreign file but missed mine — likely they ran `git add packages/dispatch-workstation/test/unit/main/` or similar directory-level command, sweeping in my src/tile-grid/tile-grid.tsx via a separate `git add` they didn't audit.

**Resolution path**:
1. I surfaced HALT-CROSS-SESSION-TERRITORY-BREACH with options A/B/C.
2. Operator SUPERSEDES-A/B/C: orchestrator-mediated partial-revert at **`9b8a4e9`** (touches ONLY my 2 contaminated files; c5's legitimate probe at `probe-frame-c-ipc-lookup-registry.spec.ts` preserved; clean tree).
3. I re-authored WB1 GREEN cleanly at `228a2da` with per-path stage + per-path commit pathspec.

### RECURRENCE-2 — `probe-framemode-subscription.spec.tsx` (WB2 RED pre-stage)

**Mechanism**: Parallel c5-class session staged the file in MY index without my action.

**Detection**: Mandatory `git status --short` pre-stage check showed `A packages/dispatch-workstation/test/unit/tile-grid/probe-framemode-subscription.spec.tsx` (not in MY manifest glob — file pattern `probe-framemode-*` does not match `probe-spawnmode-*`).

**Resolution**: `git restore --staged <path>` unstaged before per-path add of my probe. No contamination in commits.

### RECURRENCE-3 — `packages/dispatch-daemon/test/unit/max-parallel-aggregator.test.ts` (WB3 RED pre-stage)

**Mechanism**: T10-class peer session staged the file in MY index. Far foreign — different package entirely (`dispatch-daemon`).

**Detection** + **Resolution**: Pre-stage check + `git restore --staged`. No contamination.

### RECURRENCE-4 — `docs/cairn-under-stress-round-11.md` (WB3 GREEN pre-stage)

**Mechanism**: r11-archive-writer staged this in MY index. **Triple violation**: file is FORBIDDEN to me via `docs/cairn-*.md` glob.

**Detection** + **Resolution**: Pre-stage check + `git restore --staged`. No contamination.

### RECURRENCE-5 — `docs/coordination/round-11-archive-coauthor-notes-2026-05-12.md` (WB3 GREEN pre-stage)

**Mechanism**: r11-archive-writer staged this in MY index. NOT in my territory glob (`docs/coordination/mb-f-tilegridsessionentry-spawnmode-2026-05-12.md` + `docs/coordination/coord-spawnmode-2026-05-12.md` are my ONLY coord-doc territory paths).

**Detection** + **Resolution**: Pre-stage check + `git restore --staged`. No contamination.

### Discipline-success rate

| Total contamination occurrences observed | Caught by pre-stage check | Escaped into a commit |
|---|---|---|
| 5 (RECURRENCE-1 through -5) | 4 (RECURRENCE-2 through -5) | 1 (RECURRENCE-1) |

RECURRENCE-1 escaped because it preceded the operator-mandated discipline directive (W2A + SUPERSEDES-A/B/C). All occurrences AFTER discipline was applied were caught (100%). **Pre-stage `git status --short` + selective `git restore --staged` is the load-bearing mechanic** for parallel-cairn integrity in this round.

## §4 — Tier 2 followup proposed for orchestrator pickup (FOLLOWUPS.md FORBIDDEN to me)

```
| MB-F-PARALLEL-CAIRN-PRE-STAGE-STATUS-MANDATORY | Tier 2 — CLAUDE.md §2.7 should be amended from narrative
guidance ("Per-path always; pre-commit territory check via git status --short")
to a PROCEDURAL mandate matching operator W2A directive: every cairn-grammar
commit MUST include (1) pre-stage `git status --short` inspection, (2) per-path
`git add <path>` for every file (NEVER `git add -A` / `git add .` / directory
globs), (3) post-stage `git status --short` re-inspection with refuse-to-commit
verdict if any staged file is outside the session's manifest territory, (4)
per-path commit pathspec `git commit ... -- <files>` to bind the commit to exact
files even if the index drifts mid-command. RECURRENCE-1 (escaped at 63eba0f) +
RECURRENCE-2..5 (caught) demonstrate the procedural mechanic catches 100% of
contaminations when applied. Discoverability: this coord doc §3 +
mb-f-tilegridsessionentry-spawnmode-2026-05-12.md §VI + `758ef50` + `7fc2e7a`
commit bodies. | session commit-plan-doc-1334 WB-final |

| MB-F-SPAWN-RESULT-CONSUMER-TOEQUAL-FRAGILITY | Tier 2 — 3 sites use exact-match
toEqual on the SpawnSessionResult envelope; any new optional field breaks all 3.
Fixed in this ladder via per-site one-liners (W2A ad-hoc territory relaxation);
peer MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS (`55776cf`) will repeat the same
fragility for model? + spawnedAtMs. Closure: dedicated ticket refactoring all 3
to `expect.objectContaining({...})` OR codify the W2A pattern as standing in the
peer's manifest. Paths: test/unit/mb-t05/test_spawn_daemon_registration.spec.ts,
test/unit/mb-t05/test_spawn_ipc_handler.spec.ts (2 sites),
test/unit/wiring-spawn/test_post_spawn_liveness_check.spec.ts. Discoverability:
mb-f-tilegridsessionentry-spawnmode-2026-05-12.md §VII row 2; `758ef50` body. |
session commit-plan-doc-1334 WB2 GREEN |

| MB-F-TILE-GRID-APP-SPAWN-RESULT-CONSUMER-DOES-NOT-PROPAGATE-SPAWNMODE | Tier 3
— tile-grid-app.tsx:159-185 is a sibling spawn-result subscription (same wire
shape FrameCRoot now consumes). Tile-grid-app.tsx FORBIDDEN to my manifest;
spawnMode plumb-through deferred. If tile-grid-app.tsx surfaces are operator-
displayed and would benefit from bypass-perms-indicator surfacing, replicate
the WB3 GREEN diff there. Otherwise: no-op (FrameCRoot covers Frame C dogfood
target). Discoverability: `7fc2e7a` body;
mb-f-tilegridsessionentry-spawnmode-2026-05-12.md §V row 3. |
session commit-plan-doc-1334 WB3 GREEN |

| MB-F-SPAWNMODE-PROBE-MANIFEST-PATTERN-AMBIGUITY | Tier 3 — Manifest glob
`test/unit/tile-grid/probe-spawnmode-*.spec.ts` matches only .spec.ts (not
.spec.tsx). WB3 probe needed JSX-equivalent rendering; authored via
React.createElement to honor the literal glob — works but is awkward for any
future tile-grid probe wanting JSX. Resolution: amend glob to
`probe-spawnmode-*.spec.{ts,tsx}` in next session's manifest covering this
territory. Discoverability: `8a34327` (WB3 RED) body;
mb-f-tilegridsessionentry-spawnmode-2026-05-12.md §VII row 4. |
session commit-plan-doc-1334 WB3 RED |
```

(Orchestrator-mediated FOLLOWUPS.md row insertion — paste-ready rows above.)

## §5 — Closure stamp request

Per operator-mediated FOLLOWUPS.md update (FOLLOWUPS.md is FORBIDDEN to me):
- **Mark `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` as CLOSED** in `docs/FOLLOWUPS.md:332`.
- **Closure commits**: WB1 GREEN @ `228a2da` + WB2 GREEN @ `758ef50` + WB3 GREEN @ `7fc2e7a`.
- **Closure path**: (a) end-to-end (TileGridSessionEntry field + spawn-handler emission + FrameCRoot consumer + DetailPane forward).
- **Verification anchor**: this coord doc + findings doc + ladder commit bodies.

## §6 — Confidence summary

All factual claims in this coord doc are `[KNOWN]` from direct evidence (commit SHAs, vitest output, `git status` / `git diff` inspections, manifest text). Pattern conclusions in §3 ("discipline catches 100% of contaminations") are `[MODELED]` from N=5 observed incidents in this session — pattern strength would need cross-session evidence to escalate to KNOWN, but the conclusion is robust at this scale.
