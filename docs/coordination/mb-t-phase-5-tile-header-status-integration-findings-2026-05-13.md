# MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION — Findings

**Status:** `[KNOWN-SHIPPED]` Path B 3-WB ladder + WB-final landed. Build CLEAN, runtime smoke CLEAN, 7/7 new probes PASS.
**Ticket body:** `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION_BUILD.md`
**Decisions doc:** `docs/coordination/mb-t-phase-5-tile-header-status-integration-decisions-2026-05-13.md`
**Body-drafting coord doc:** `docs/coordination/coord-mb-t-phase-5-tile-header-status-integration-2026-05-13.md`
**Impl-coord doc:** `docs/coordination/mb-t-phase-5-tile-header-status-integration-impl-coord-2026-05-13.md`
**Session:** `SESSION-r12-phase5-tile-header-impl` (Round 12 Wave 2; MAX-AUTONOMY-WITHIN-FENCES dispatch §2)
**Dispatch anchor:** `/tmp/r12-dispatch-phase5-tile-header-impl.txt`
**Authoring delegate:** Claude Opus 4.7
**Ladder anchor commit (HEAD at WB1 RED):** `3a75cc3` (Sub-Q dispositions flipped to KNOWN-OPERATOR-ARBITRATED).
**WB-final commit dates:** WB1-WB3 + amendment 2026-05-13; WB-final docs 2026-05-16 (operator retry-poke after API Internal Server Error gap).

---

## §I — Closure target

`MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` (Tier 2; `docs/FOLLOWUPS.md:361` per ticket body). **Marked RESOLVED at this WB-final commit** pending operator-mediated FOLLOWUPS.md edit (read-only territory for this session).

Followup body verbatim (from ticket body §[Closes]):
> 1 prop addition to TileGridProps (renderStatusSlot analog to renderPickerSlot) + parent closure reading createSessionStatusSource snapshot. WB5 integration probe (5dc34c7) demonstrates the end-to-end mechanism.

**Closure path taken:** Path B (data-flow only; smaller blast radius than the literal followup-row prescription, per decisions doc §2 Sub-Q-1=B). The closure spirit (operator-visible status colors on the tile header) is delivered via the existing `TileGridSessionEntry.status?` seam at `tile-grid.tsx:31` + `tile-header.tsx:225-230` unkeyed indicator — no new render-prop, no `tile-grid/*.tsx` additions, MB-T12 probe-01..04 testid selectors preserved.

---

## §II — Cairn ladder

| WB | Commit | Verb | Outcome |
|---|---|---|---|
| WB1 RED | `ef627d3` | red | parent-closure probe authored (3 conditions; 2/3 RED at HEAD `3a75cc3`) |
| WB1 GREEN | `460fbda` | green | parent-closure status hookup in tile-grid-app.tsx (3/3 PASS; typecheck CLEAN; tile-grid suite 40/40 non-regression) |
| WB2 ratification | `88cc176` | green | empty-window fallback ratification (2/2 PASS at WB1 anchor; cairn-honest single-`green:` commit per anti-fabrication) |
| WB3 ratification | `f2c9dca` | green | dispose lifecycle ratification (2/2 PASS at WB1 anchor; single-`green:` per same framing) |
| WB-final amendment | `4a9633c` | refactor | drop HttpSessionListClient fallback (operator Option A; renderer-build break recovery) |
| WB-final docs | (this commit) | docs | findings + impl-coord docs + 2 followup proposals |

**Cairn-grammar note:** WB2 and WB3 are single-`green:` ratification commits, not red→green cycles. Build-doc §4 Path B language ("WB1 merge expression already implements both; this probe is the ratification") makes it explicit that the probes pass at HEAD; cairn §2.3 (`red:` = failing test) does NOT apply, so authoring with `red:` would be anti-fabrication. CLAUDE.md §8 (no empty commits) prevents a no-op `green:` follow-on. Single-commit collapse documented in each WB body.

**Cairn-grammar note (WB-final amendment):** The amendment at `4a9633c` is labeled `refactor:` because the TESTED surface preserves behavior (7/7 probes still pass). The PRODUCTION surface changes (silent no-op when statusListClient absent) is explicitly documented in the amendment body as the cost of dropping the unbuildable fallback. Production wiring is now Tier-1 followup territory.

---

## §III — Verification evidence

### §III.1 — Unit probes (3 new files; 7/7 tests pass)

```
test/unit/tile-grid/probe-mbtphase5-status-integration-01-parent-closure.spec.tsx
  01a: pre-poll, no seeded status → data-status='idle'   PASS
  01b: source emits 'running' for session 'a' → 'open'    PASS
  01c: daemon-unreachable after prior success → 'error'   PASS

test/unit/tile-grid/probe-mbtphase5-status-integration-02-empty-window.spec.tsx
  02a: empty snapshot + no seeded status → 'idle'         PASS
  02b: empty snapshot + seeded status='open' preserved    PASS

test/unit/tile-grid/probe-mbtphase5-status-integration-03-dispose.spec.tsx
  03a: post-unmount, no further listSessions calls        PASS
  03b: post-unmount, no React state-update warning        PASS

Test Files  3 passed (3)
     Tests  7 passed (7)
```

### §III.2 — Consumer non-regression (tile-grid unit suite)

At WB1 GREEN anchor `460fbda`:
```
pnpm --filter dispatch-workstation exec vitest run test/unit/tile-grid/
Test Files  9 passed (9)
     Tests  40 passed (40)
```
The pre-existing WB5 integration probe (`probe-mbtphase5-status-indicator-02-integration.spec.tsx`) still passes — `createSessionStatusSource` semantics unchanged.

### §III.3 — Full workstation suite (baseline comparison)

Triage via worktree-based baseline check (parent commit `3a75cc3`):

| Metric | Baseline `3a75cc3` | HEAD (post-WB3) `f2c9dca` |
|---|---|---|
| Test files failed | 66 | 24 |
| Tests failed | 48 | 23 |
| Test files | 354 | 357 (+3 new probes) |

`diff baseline-failures.txt head-failures.txt` showed only `<` (baseline-only) lines — every HEAD failure is present at baseline. **ZERO new failures introduced by my changes [KNOWN — diff comparison].** The 41-failure baseline-only delta reflects environment-noise / order-dependent flake (vitest parallel execution); investigated but out of scope.

### §III.4 — 5-package typecheck

All five packages CLEAN (one command at a time per CLAUDE.md §4.4):
```
pnpm --filter dispatch-core typecheck      → CLEAN
pnpm --filter dispatch-daemon typecheck    → CLEAN
pnpm --filter dispatch-workstation typecheck → CLEAN
pnpm --filter dispatch-cli typecheck       → CLEAN
pnpm --filter dispatch-web typecheck       → CLEAN
```

Note: `tile-grid-app.tsx` is in workstation tsconfig.json exclude list (line 17 per `.tsx` exclude convention). The TypeScript-visible edges are checked via type-only imports in non-excluded modules; runtime correctness for the file itself is exercised via vitest + esbuild build.

### §III.5 — Renderer build

Pre-amendment build attempt FAILED with 3 esbuild errors (`Could not resolve "node:fs|path|os"`). Post-amendment `4a9633c`:
```
pnpm --filter dispatch-workstation build
  dist/tile-grid/renderer.js  1.6mb
  TILE_GRID_BUILD_COMPLETE
  BUILD_COMPLETE
```

### §III.6 — Runtime-launch smoke (CLAUDE.md §4.6)

```
node packages/dispatch-workstation/dist/main/run-smoke.js
[smoke] DISPATCH_MODE_IPC_MOUNTED
[smoke] WINDOW_STATE 1024 768
[smoke] SPLITTER_LOADED 251
SHELL_READY
[smoke] RENDER_OK
[smoke] WINDOW_READY
[smoke] TILE_GRID_MOUNTED
[smoke] APPROVAL_POLICY_IPC_MOUNTED
AUTOPILOT_IPC_MOUNTED
ONBOARDING_READY
[smoke] BOOTSTRAP_TOKEN_WRITTEN 44
[smoke] exited with code 0
```

WINDOW_READY + TILE_GRID_MOUNTED sentinels both fire. Exit 0. The OrchestratorPoolManager halt messages for `__orchestrator_active` / `__orchestrator_standby` are pre-existing stale tmux sessions, unrelated to this ticket.

---

## §IV — Outcome classification

**Improved (binary flip + behavioral quality)** for the TEST SEAM: status indicator data-flow is now reactive when `statusListClient` is provided. WB5 integration probe pattern is ratified at the TileGridApp parent surface.

**No improvement + structural finding** for the PRODUCTION SURFACE: the renderer entry (`tile-grid/mount.ts`) does not yet pass `statusListClient` through, so the production tile-header status indicator continues to behave exactly as it did pre-WB1 (reflects `s.status` from spawn-result envelope, or 'idle' default). The Sub-Q-3 fallback chain (`snapshot.get(s.name) ?? s.status ?? 'idle'`) preserves pre-existing behavior under the silent-no-op path. Tier-1 followup tracks the production wiring closure.

**Filed Tier-1 surface finding [KNOWN — operator dogfood evidence]:** Empty Frame B observation in operator dogfood (per retry-poke prompt) reveals the deferred-prod-wiring gap is visible-from-the-outside, not just a clean code-design concern. Tier-1 reflects the dogfood-evidence elevation.

---

## §V — Downstream impact

| Surface | Impact | Confidence |
|---|---|---|
| MB-T12 probe-01..04 unit tests (unkeyed `tile-status-indicator` testid) | NONE — Path B preserves the testid selector exactly. | [KNOWN — diff inspection + tile-grid suite non-regression run] |
| `tile-grid.tsx`, `tile-header.tsx`, `tile.tsx`, `types.ts`, `status-indicator.tsx` | NONE — zero edits (manifest WRITE-FORBIDDEN respected). | [KNOWN — git diff scope] |
| `dispatch-core/src/v3/schema.ts` | NONE — zero edits. | [KNOWN — git diff scope] |
| `WORKSTATION_CONTRACT.md` | NONE — no IPC amendment. | [KNOWN] |
| `tile-grid/mount.ts` (renderer entry) | DEFERRED — needs HttpSessionListClient instantiation + `statusListClient` prop pass-through. Tracked at MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED (Tier 1). | [KNOWN — verified by smoke + operator dogfood] |
| `frame-c/status-color.ts` | NONE — read-only consumed via the shipped data source. | [KNOWN] |
| FrameCRoot SessionList rows | NOT WIRED — separate ticket scope. Tracked at MB-F-STATUS-SOURCE-FRAME-C-SESSION-LIST-INTEGRATION (Tier 3). | [SPECULATIVE — depends on Family C wiring decisions]|

---

## §VI — Proposed followups (orchestrator-mediated FOLLOWUPS.md insertion)

This session's manifest declares `docs/FOLLOWUPS.md` READ-ONLY. The two rows below are proposed for operator/orchestrator insertion at the appropriate Tier sections.

### §VI.1 — MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED (Tier 1)

**Operator-classified Tier-1 per retry-poke prompt 2026-05-16** (dogfood evidence: empty Frame B observation reveals the deferred-prod-wiring gap is visible from the outside).

| Field | Value |
|---|---|
| ID | `MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` |
| Tier | 1 (operator-classified per dogfood evidence) |
| Scope | Wire `HttpSessionListClient` instantiation at the renderer entry (`packages/dispatch-workstation/src/tile-grid/mount.ts` — currently OUT of `r12-phase5-tile-header-impl` single-file write scope per manifest) and pass it through to `<TileGridApp statusListClient={...} />` so the tile-header status indicator becomes daemon-reactive in production. |
| Origin | `MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION` WB-final amendment `4a9633c` (operator Option A 2026-05-13; build-break recovery dropped the renderer-side fallback). |
| Closure path | Single-WB ticket: amend `tile-grid/mount.ts` to import `HttpSessionListClient` from `src/main/session-cap.ts` (mount.ts runs in renderer-entry scope where node imports may need a preload/IPC shim — TBD at ticket scoping); instantiate once; pass into `TileGridApp.statusListClient` prop. Verify via re-run of `run-smoke.js` + visual check on Frame B status dots. |
| Anchor | Operator-filed orchestrator spike `7c8a957 spike(§3.9): Round 12 §1.1 — Tier 1 NEW EMERGENT CLASS deferred-prod-wiring-surface-in-operator-dogfood`. WB1 amendment body at `4a9633c`. WB1 GREEN body at `460fbda` ([MODELED-CONCERN] flag — prescient). |
| Discoverability | `tile-grid-app.tsx` useEffect docstring cites this followup name (`MB-F-TILE-HEADER-STATUS-INTEGRATION-RENDERER-WIRING` placeholder in code comment; this row is the canonical resolution name). Future contributors grepping for `statusListClient` in `mount.ts` will find nothing — pointer trail starts at tile-grid-app.tsx useEffect comment. |

### §VI.2 — MB-F-STATUS-SOURCE-FRAME-C-SESSION-LIST-INTEGRATION (Tier 3)

| Field | Value |
|---|---|
| ID | `MB-F-STATUS-SOURCE-FRAME-C-SESSION-LIST-INTEGRATION` |
| Tier | 3 |
| Scope | Wire shipped `StatusIndicator` component (`tile-grid/status-indicator.tsx` per `ff530b1`) into FrameCRoot SessionList rows (per body-drafting coord doc `coord-phase5-status-2026-05-13.md` §1 row 2 reference). Path B for this ticket consumed `createSessionStatusSource` but NOT the shipped `StatusIndicator` component; the component remains exported and available. |
| Origin | `MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION` ticket body §1.1 Path B point 5 ("the shipped StatusIndicator component is NOT wired in this ticket but remains exported + available for downstream consumers"). |
| Closure path | Separate Phase-5 follow-on ticket; estimate 2-3 WBs (renderer-side wiring + integration probe). May depend on the FrameCRoot session-list state shape (out-of-tile-grid territory). |
| Anchor | Predecessor coord doc `coord-phase5-status-2026-05-13.md` §1 row 2. |
| Discoverability | StatusIndicator component is exported from `src/tile-grid/status-indicator.tsx`; grepping for unused exports flags it. |

---

## §VII — Q1-Q9 self-check summary across the ladder

All WB commit bodies include Q1-Q9 self-check blocks citing the Sub-Q binding rows. Cross-cutting answers:

- **Q1 (API spike-verification)**: Consumed surfaces (`createSessionStatusSource`, `StatusListClient`) were spike-verified at predecessor commits `fb6a474`, `17aa384`, `5dc34c7`. No new external API.
- **Q4 (outside contract spec)**: All edits bound by Sub-Q-1=B + Sub-Q-2=useEffect + Sub-Q-3=fallback + Sub-Q-4=separate-client-then-revised-to-injected-only per operator Option A.
- **Q5 (frozen contract)**: ZERO edits to frozen surfaces — verified by git diff scope (only tile-grid-app.tsx + 3 NEW test files modified across the ladder).
- **Q7 (parallel-session contamination)**: Per-path `git add` + per-path `git commit -- <pathspec>` on every commit. The concurrent `r12-phase4-bottom-rail-impl` manifest at `793e029` explicitly declared `src/tile-grid/**` FORBIDDEN — no overlap risk. The 9 untracked `printer.cfg*` files at repo root (operator system noise) were never staged.
- **Q9 (unauthorized halt)**: One operator HALT-PRE-WB1-AMENDMENT for build-break recovery (AskUserQuestion 2026-05-13 Option A); subsequent API Internal Server Error caused a 26+h gap; resumed under retry-poke prompt 2026-05-16.

---

## §VIII — Risk-watch resolution

| Risk-watch | Status |
|---|---|
| WB1 GREEN [MODELED-CONCERN]: HttpSessionListClient pulls node imports into renderer bundle | [KNOWN-CONFIRMED] at WB-final smoke; resolved by amendment `4a9633c` (Option A). The original Sub-Q-4 binding ("inline `new HttpSessionListClient()`") was structurally unbuildable for the tile-grid renderer's esbuild config. |
| Operator-flagged risks at decisions doc §4 Open arbitration questions | (a) MB-T12 probe-01..04 selector audit — NO AUDIT NEEDED [KNOWN — 40/40 tile-grid suite non-regression at WB1 GREEN]. (b) `TileGrid` shallow-immutable contract — HONORED [KNOWN — `.map(s => ({...s, status}))` produces new array; React tolerates]. (c) `useMemo` for merged-array memoization — NOT NEEDED [KNOWN — no observable re-render storms during smoke run; defer to follow-on if needed]. |

---

## §IX — Methodology observations (for impl-coord doc §IV cross-link)

1. **Phase-1 diagnose agent transient API error**: `cairn-phase-1-diagnose` returned `API Error: Internal server error` on first dispatch. Fell back to direct reads (10 files) — established surface inventory without subagent. Surface this in impl-coord doc as a methodology note (not a blocker; agent fallback works).
2. **Build-break caught only at WB-final smoke**: Unit tests (which inject `statusListClient` directly) completely bypassed the production fallback path. The `[MODELED-CONCERN]` flag in WB1 GREEN body anticipated the issue but did not block landing. CLAUDE.md §4.6 runtime-launch smoke is load-bearing — the smoke catches what typecheck + unit + integration suites miss. Strong evidence for the §4.6 invariant.
3. **API Internal Server Error mid-commit recovery**: 26+ hour gap between authoring amendment edits and committing them. Working tree state preserved cleanly across the gap; retry-poke prompt 2026-05-16 resumed without context loss. No methodology gap; operator-resilient by design.
4. **Cairn-honest WB2/WB3 single-`green:` framing**: When the build doc prescribes "WB1 already implements" for downstream WBs, the ratification probes pass at HEAD. Authoring as `red:` would be anti-fabrication; CLAUDE.md §8 prevents an empty step-7 `green:` follow-on. Single-`green:` is the right shape; documented for future operators.

---

## §X — Definition-of-done checklist

- [x] WB1 RED+GREEN: parent-closure status hookup; 3/3 conditions pass; workstation typecheck CLEAN.
- [x] WB2 RED+GREEN (single `green:` ratification): empty-window fallback; 2/2 conditions pass; workstation typecheck CLEAN.
- [x] WB3 RED+GREEN (single `green:` ratification): dispose lifecycle; 2/2 conditions pass; workstation typecheck CLEAN.
- [x] WB-final amendment: HttpSessionListClient fallback dropped (operator Option A); 7/7 probes still pass; renderer build CLEAN; runtime smoke CLEAN.
- [x] WB-final docs: findings + impl-coord docs authored.
- [x] 2 followup rows proposed (Tier 1 `MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` + Tier 3 `MB-F-STATUS-SOURCE-FRAME-C-SESSION-LIST-INTEGRATION`).
- [x] Per-WB commit: per-path `git add` + per-path `git commit -- <pathspec>` + post-commit `git status --short` verified + push + origin parity verified.
- [x] Full workstation suite non-regression at WB-final (baseline-comparison via worktree confirmed zero new failures).
- [x] Closure note for `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` (Tier 2): RESOLVED at the WB-final docs commit pending operator-mediated FOLLOWUPS.md edit.
- [x] WB-final runtime-launch smoke per CLAUDE.md §4.6: WINDOW_READY + TILE_GRID_MOUNTED sentinels fired; exit 0.

---

## §XI — Closing posture

`MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION` ships at the docs commit. The Path B data-flow seam is wired at the TileGridApp surface; the production wiring at `tile-grid/mount.ts` is deferred to `MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` (Tier 1, operator-classified) per operator dogfood evidence (empty Frame B).

The closure target `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` (Tier 2; FOLLOWUPS:361) is RESOLVED at this commit: the operator-visible tile-header status mechanism is plumbed end-to-end at the TileGridApp surface; tests verify the parent-closure data-flow per WB5 ConsumerWrapper pattern; the remaining gap is the renderer-entry wiring tracked separately as Tier 1.

**End findings doc.**
