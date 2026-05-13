# MB-T-PHASE-4-T8-SIBLING-EXEC — Consumer-side wiring of Cluster A extensions (model + spawnedAtMs)

**Status:** EXECUTABLE — sibling-flip of `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS` (Cluster A) (β)-narrowed module ship.
**Authoring date:** 2026-05-13
**Authoring delegate:** `t3-ticket-body-0905-t8-sibling` (manifest at `docs/coordination/territorial-manifests/t3-t8-sibling-exec.txt`).
**Authoring source:** mechanical translation per CLAUDE.md §3.4 of phase-4-tier-1-roadmap-rev-2 (`b7e6dfe`) §3.2 "MB-T-PHASE-4-T8-SIBLING-EXEC" candidate row + Cluster A build-doc (`5328a97` ship anchor) sibling-continuity surface (§1.2 "Out of (β)-narrowed scope").
**Authoring anchor commit:** HEAD at this WB-docs commit (`41491d3` at body authoring time).

**Closes / advances:**
- P3-rev-2 §3.2 row `MB-T-PHASE-4-T8-SIBLING-EXEC` — *consumer-side wiring leg shipped* (3 legs; rendering pass-through-leg deferred per §1.5).
- `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` (T1 findings, Tier 3) — closure-path-(iii) full closure: true-session-uptime semantics established via spawn-handler → spawn-result → tile-grid-app side-map → tile-header.tsx prop wire-ready.
- Audit §7 Dim 5 rows `model` + `time` — advance from "EXTENSION-CONTRACT-SHIPPED" → "CONSUMER-WIRING-PARTIAL-SHIPPED" (rendering pass-through pending tile-grid.tsx + tile.tsx territory unlock).
- P3-rev-2 §1.1 row `MB-T-PHASE-4-MODEL-SOURCE-WIRING` — FULL CLOSURE (model wires end-to-end through existing `TileGridSessionEntry.model` field).
- P3-rev-2 §1.1 row `MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE` — PARTIAL CLOSURE (data flows to tile-grid-app + tile-header prop wire-ready; tile.tsx pass-through deferred).

**Depends on (all merged):**
- `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS` (Cluster A) merged at `3e9a203` — ships `SpawnResultExtensionFields` type in `dispatch-core/src/v3/spawn-result-fields.ts` + `populateSpawnSessionResultExtensions` populator in `dispatch-workstation/src/main/spawn-session-result-extensions.ts`. Dist artifact `dispatch-core/dist/v3/spawn-result-fields.js` already built per CLAUDE.md §3.4.
- `MB-T-WIREFRAME-T15` (model chip + token meter) — ships `TileHeader` rendering for `model` chip; consumer wiring this ticket populates the same chip from spawn-result.

---

## §0 — Reading protocol

1. Read §1 (scope) + §1.5 (territorial constraints) first to bind ship-envelope.
2. Read §2 (arbitration anchor + construction order) for file ownership under territory.
3. Read §3 (Sub-Q resolutions) — all gates resolved at authoring time per phase-4-roadmap-rev-2 anchors.
4. Read §4 (WB ladder) for execution order.
5. §5–§9 are operational supports.

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` direct-read at HEAD `41491d3`; `[MODELED]` reasoned from observed facts; `[KNOWN-OPERATOR-ARBITRATED]` from upstream Cluster A operator turn-N.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per t3-t8-sibling-exec manifest + Cluster A sibling-continuity surface:

1. **MOD `packages/dispatch-workstation/src/main/spawn-handler.ts`** — extend `SpawnSessionResult` interface with `model?: string` + `spawnedAtMs: number`; extend `SpawnHandlerDeps` with optional `model?: string + nowMs?: number` deps injection; call `populateSpawnSessionResultExtensions({model: deps.model, now: deps.nowMs})` at `spawnSession()` return site and spread into result envelope.

2. **MOD `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx`** — extend `SpawnSuccessReply` type guard to surface `model?: string + spawnedAtMs?: number` fields from spawn-result reply; populate `TileGridSessionEntry.model` (existing field per MB-T15) from reply; capture `spawnedAtMs` in a renderer-local `Map<sessionName, number>` held in `useState` (anchor-only per c5-trinity pattern at `tile-grid-app.tsx:177` + `:190` — value held; downstream rendering pass-through DEFERRED).

3. **MOD `packages/dispatch-workstation/src/tile-grid/tile-header.tsx`** — add `spawnedAtMs?: number` prop to `TileHeaderProps`; render an uptime label (e.g., `"5m"` / `"5m12s"`) as a sibling of the model chip when prop is provided; omit rendering when prop is undefined.

4. **NEW probes** under two manifest globs:
   - `test/unit/main/probe-mbtphase4-t8sibling-*.spec.ts` — spawn-handler legs.
   - `test/unit/tile-grid/probe-mbtphase4-t8sibling-*.spec.tsx` — renderer legs (happy-dom).

5. **Documentation:** this build-doc + WB-final findings doc + coord doc.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints from manifest FORBIDDEN list:

- Does NOT modify `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` (FORBIDDEN per manifest). `TileGridSessionEntry` cannot be extended this round; **`spawnedAtMs` is held in a renderer-local side-Map rather than added to the entry shape**. Rendering pass-through is deferred.
- Does NOT modify `packages/dispatch-workstation/src/tile-grid/tile.tsx` (out of territory). Per-tile prop pass-through (`<Tile spawnedAtMs={...}>` → `<TileHeader spawnedAtMs={...}>`) is deferred to a successor session whose manifest WRITEs `tile.tsx`.
- Does NOT modify `packages/dispatch-core/**` (FORBIDDEN). Cluster A's `SpawnResultExtensionFields` type is consumed by `import type` from the dist artifact only.
- Does NOT modify `packages/dispatch-workstation/src/main/spawn-session-result-extensions.ts` (out of territory). Cluster A's populator is consumed via import only.
- Does NOT modify `packages/dispatch-workstation/src/main/frame-c-ipc.ts` (FORBIDDEN; sibling territory).
- Does NOT introduce new IPC channels — extensions ride on existing `workstation:spawn-result` envelope; ZERO `WORKSTATION_CONTRACT.md` §6 amendment.
- Does NOT close `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (separate sibling territory).
- Does NOT stamp `docs/FOLLOWUPS.md` or audit doc (FORBIDDEN per manifest).

### §1.5 — Territorial constraints + deferred legs

`[KNOWN]` per manifest verification at HEAD `41491d3`:

| Constraint | Impact on scope |
|---|---|
| `tile-grid.tsx` FORBIDDEN | `TileGridSessionEntry.spawnedAtMs?` NOT addable. Renderer-local `Map<sessionName, number>` adopted; **mirrors c5-trinity's anchor-only pattern** (`_frameMode` + `_lastScrollTargetSessionName` at `tile-grid-app.tsx:170-196`). |
| `tile.tsx` out of territory | Prop pass-through `<Tile>` → `<TileHeader>` for `spawnedAtMs` is deferred. tile-header.tsx ships the prop wire-ready; rendering exercised by direct unit probe (WB5) but not by production prop-chain delivery. |
| `dispatch-core/**` FORBIDDEN | No type-shape modifications; consume via `import type` from dist. |
| `spawn-session-result-extensions.ts` out of territory | Populator consumed via import only; no modification. |

**Deferred-leg followup** (to be filed at WB-final per §5):
- `MB-F-T8-SIBLING-EXEC-TILE-HEADER-SPAWNEDATMS-PASS-THROUGH-DEFERRED` (Tier 2) — closure path: future session with `tile-grid.tsx` + `tile.tsx` in WRITE territory threads `spawnedAtMs` from tile-grid-app side-map → `<Tile>` props → `<TileHeader spawnedAtMs={...}>`.

### §1.6 — Shared-tree contention posture

`[KNOWN]` Per `git status --short` at HEAD `41491d3`:
- `spawn-handler.ts` has a 1-line unstaged import for `BypassPermsSource` from `phase4-t9-exec` (Wave-4 in-flight on `MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW`).
- `tile-grid-app.tsx` is shared territory with `c5-ticket-wb1` Wave-5 (`MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG`).

Mitigation: §2.7 per-path `git add` + pre-commit `git status --short` territory check + per-commit push + post-commit empty `git log origin/main..HEAD` verification at every WB. If pathspec would sweep non-self edits, halt and surface to operator per §2.9.

---

## §2 — Arbitration anchor

### §2.1 — Roadmap-translation provenance

`[KNOWN]` Mechanical translation of `docs/coordination/phase-4-tier-1-roadmap-rev-2-2026-05-12.md` §3.2 row "MB-T-PHASE-4-T8-SIBLING-EXEC" per CLAUDE.md §3.4. Cluster A build-doc `5328a97` §1.2 "Out of (β)-narrowed scope" enumerates the sibling-flippable surface — this ticket flips the consumer-side wiring leg modulo territorial constraints in §1.5.

### §2.2 — Construction order (file ownership)

`[KNOWN-MANIFEST-VERIFIED]`:

- **MOD** `packages/dispatch-workstation/src/main/spawn-handler.ts` (additive: import + interface extensions + populator call).
- **MOD** `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` (additive: extended `SpawnSuccessReply` + new side-Map state + spawn-result handler extension).
- **MOD** `packages/dispatch-workstation/src/tile-grid/tile-header.tsx` (additive: new prop + uptime label render).
- **NEW** `test/unit/main/probe-mbtphase4-t8sibling-01-spawn-handler-extensions.spec.ts`.
- **NEW** `test/unit/tile-grid/probe-mbtphase4-t8sibling-02-tile-grid-app-spawn-result-consumer.spec.tsx`.
- **NEW** `test/unit/tile-grid/probe-mbtphase4-t8sibling-03-tile-header-uptime.spec.tsx`.
- **NEW** `docs/coordination/mb-t-phase-4-t8-sibling-exec-findings-2026-05-13.md` — WB-final findings.
- **NEW** `docs/coordination/coord-phase4-t8sibling-2026-05-13.md` — sibling/coord notes.
- **NEW** this file.

### §2.3 — Frozen-contract amendment scoping

`[KNOWN]` Per CLAUDE.md §1 + §3.4:
- ZERO frozen-surface touch.
- No `WORKSTATION_CONTRACT.md` §6 amendment (extensions ride existing `workstation:spawn-result` envelope; renderer parses additive fields defensively).
- No `dispatch-core/src/v3/schema.ts` modification (Cluster A's `spawn-result-fields.ts` is the additive sibling file; this ticket only consumes via dist).

---

## §3 — Sub-Q resolutions

All gates resolved at authoring time per phase-4-roadmap-rev-2 + Cluster A operator turn-N defaults.

| Sub-Q | Resolution | Rationale |
|---|---|---|
| A — model source | Caller (`SpawnHandlerDeps.model`) + env fallback (`process.env.CLAUDE_DEFAULT_MODEL`) via Cluster A populator's `defaultModel` field | Mirrors Cluster A `populateSpawnSessionResultExtensions` contract; caller-injectable for tests |
| B — spawnedAtMs source | `Date.now()` at populator invocation, deterministic-test injectable via `SpawnHandlerDeps.nowMs` | Closes `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE` closure-path-(iii) per Cluster A intent |
| C — spawnedAtMs renderer storage | Renderer-local `Map<sessionName, number>` in `tile-grid-app.tsx` useState | tile-grid.tsx FORBIDDEN blocks `TileGridSessionEntry.spawnedAtMs?`; side-Map mirrors c5-trinity's anchor-only pattern |
| D — tile-header rendering pass-through | DEFERRED — tile-header.tsx ships prop wire-ready; tile.tsx out of territory | Future session threads pass-through; followup filed at WB-final |
| E — consumer non-regression scope | Scoped per WB to relevant test dir; workstation typecheck at WB2/WB4/WB6/WB-final | Per CLAUDE.md §4.4 + §9 |
| F — uptime label format | `"<m>m"` for <1h; `"<h>h<m>m"` for ≥1h; omit if `spawnedAtMs` absent or in future | Minimal v3.0 surface; richer formatting deferred |

---

## §4 — WB ladder

8 commits baseline (1 docs + 6 cairn + 1 WB-final). Construction order: build-doc (this commit) → spawn-handler RED → spawn-handler GREEN → tile-grid-app RED → tile-grid-app GREEN → tile-header RED → tile-header GREEN → WB-final docs.

| WB | Verb | Surface | Acceptance | Frozen contracts |
|---|---|---|---|---|
| (this) | docs | NEW this build-doc | Body anchors ladder; cairn-grammar establishes the ticket | none |
| WB1 | red | NEW `probe-mbtphase4-t8sibling-01-spawn-handler-extensions.spec.ts` (3 conditions) | RED at HEAD (SpawnSessionResult lacks model + spawnedAtMs); flips at WB2 | none |
| WB2 | green | MOD `spawn-handler.ts` (additive interface + populator call) | WB1 3/3 GREEN; workstation typecheck clean | none |
| WB3 | red | NEW `probe-mbtphase4-t8sibling-02-tile-grid-app-spawn-result-consumer.spec.tsx` (2 conditions) | RED at HEAD (tile-grid-app extracts only `cwd`); flips at WB4 | none |
| WB4 | green | MOD `tile-grid-app.tsx` (extended reply type + side-Map state + handler extension) | WB3 2/2 GREEN; workstation typecheck clean | none |
| WB5 | red | NEW `probe-mbtphase4-t8sibling-03-tile-header-uptime.spec.tsx` (3 conditions) | RED at HEAD (tile-header lacks spawnedAtMs prop); flips at WB6 | none |
| WB6 | green | MOD `tile-header.tsx` (prop + uptime render) | WB5 3/3 GREEN; workstation typecheck clean | none |
| WB-final | green (docs) | NEW findings doc + NEW coord doc | Findings + coord land; followup `MB-F-T8-SIBLING-EXEC-TILE-HEADER-SPAWNEDATMS-PASS-THROUGH-DEFERRED` filed (pending tile-grid.tsx + tile.tsx unlock) | none |

---

## §5 — Cross-references

**Followups CLOSED / ADVANCED:**

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` | 3 | True-session-uptime semantics established via spawn-handler + tile-grid-app side-map; rendering pass-through deferred but data path closed | WB4 (advance) / WB6 (prop-ready) |
| Audit §7 Dim 5 row `model` | (audit) | EXTENSION-CONTRACT-SHIPPED → CONSUMER-WIRING-FULL (model wires end-to-end via existing TileGridSessionEntry.model) | WB4 |
| Audit §7 Dim 5 row `time` | (audit) | EXTENSION-CONTRACT-SHIPPED → CONSUMER-WIRING-PARTIAL (pass-through deferred) | WB6 |
| P3-rev-2 §1.1 `MB-T-PHASE-4-MODEL-SOURCE-WIRING` | (roadmap) | FULL CLOSURE | WB4 |
| P3-rev-2 §1.1 `MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE` | (roadmap) | PARTIAL — data path full; rendering pass-through deferred | WB6 |

**Followups FILED (deferred):**

| Followup | Tier | Closure path |
|---|---|---|
| `MB-F-T8-SIBLING-EXEC-TILE-HEADER-SPAWNEDATMS-PASS-THROUGH-DEFERRED` (proposed) | 2 | Successor session with tile-grid.tsx + tile.tsx in WRITE territory threads spawnedAtMs from side-map → `<Tile>` props → `<TileHeader spawnedAtMs={...}>` |

**Related shipped tickets (read-required at WB1 start):**

| Ticket | Anchor | Read scope |
|---|---|---|
| MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS | `3e9a203` (Cluster A WB-final) | `SpawnResultExtensionFields` type + populator contract |
| MB-T15 (TileHeader chrome) | (HEAD) | TileHeaderProps current shape; model chip render |
| MB-T18 WB3 (footer cwd plumb-through) | (HEAD) | TileGridSessionEntry.cwd plumb pattern (parallel for model) |
| c5-trinity (tile-grid-app frame-mode + scroll) | (HEAD `tile-grid-app.tsx:170-196`) | Anchor-only side-state pattern this ticket mirrors |

---

## §6 — Self-check Q1-Q9 expectations per WB

| WB | Q1 spike? | Q2 mocks? | Q3 impl-deleted-passes? | Q4 outside contract? | Q5 frozen mod? | Q6 labels? | Q7 parallel territory? | Q8 bypass PATCH? | Q9 halt-unauth? |
|---|---|---|---|---|---|---|---|---|---|
| docs | N/A | N/A | N/A | No | No | KNOWN/MODELED | new build-doc path-disjoint | N/A | No |
| WB1 RED | N/A | BEHAVIOR (test injects deterministic now + model deps; real spawnSession call) | No — fields absent | No | No | KNOWN | new probe path-disjoint | N/A | No |
| WB2 GREEN | N/A | BEHAVIOR | No — flip-target | No | No | KNOWN | MOD spawn-handler.ts (Wave-4 phase4-t9-exec stale import — territory-check at commit) | N/A | No |
| WB3 RED | N/A | BEHAVIOR (real TileGridApp mount; fake bridge fires reply) | No — fields not extracted | No | No | KNOWN | new probe path-disjoint | N/A | No |
| WB4 GREEN | N/A | BEHAVIOR | No — flip-target | No | No | KNOWN | MOD tile-grid-app.tsx (c5-ticket-wb1 Wave-5 contention — territory-check at commit) | N/A | No |
| WB5 RED | N/A | BEHAVIOR (TileHeader render-and-assert) | No — prop absent | No | No | KNOWN | new probe path-disjoint | N/A | No |
| WB6 GREEN | N/A | BEHAVIOR | No — flip-target | No | No | KNOWN | MOD tile-header.tsx (no concurrent territory claim observed) | N/A | No |
| WB-final | N/A | N/A | N/A | No | No | KNOWN | new doc paths disjoint | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of:

1. WB1–WB-final cairn ladder lands; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. `SpawnSessionResult` interface declares `model?: string + spawnedAtMs: number`; `SpawnHandlerDeps` declares optional `model?: string + nowMs?: number`.
3. `spawnSession()` calls Cluster A populator and spreads result fields into envelope.
4. `tile-grid-app.tsx` `SpawnSuccessReply` extracts `model` + `spawnedAtMs` from reply; `TileGridSessionEntry.model` populated; `spawnedAtMs` held in side-Map state.
5. `tile-header.tsx` `TileHeaderProps` declares `spawnedAtMs?: number`; uptime label renders when prop set; absent prop → no uptime render.
6. All 8 probes (WB1: 3 + WB3: 2 + WB5: 3) GREEN at WB-final.
7. `pnpm --filter dispatch-workstation typecheck` clean.
8. `MB-F-T8-SIBLING-EXEC-TILE-HEADER-SPAWNEDATMS-PASS-THROUGH-DEFERRED` filed in findings doc (FOLLOWUPS.md stamp deferred per manifest FORBIDDEN).
9. Findings + coord docs land.

**Deferred-relative-to-Cluster-A-DoD:** rendering pass-through `<Tile>` → `<TileHeader spawnedAtMs={...}>` not exercised in production; data path + prop wire are shipped, rendering is unit-tested only. See §1.5 deferred-leg followup.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Concurrent-edit sweep of `spawn-handler.ts` (`phase4-t9-exec` stale import) | `[KNOWN]` at HEAD | `[MEDIUM]` (1-line stray sweep) | Pre-commit `git status --short` + `git diff --cached <path>` mandatory before WB2 commit; surface to operator if non-self hunks remain |
| Concurrent-edit sweep of `tile-grid-app.tsx` (`c5-ticket-wb1` Wave-5 active) | `[MODELED]` per queue row | `[MEDIUM]` | Same mitigation; per-WB push immediately to minimize window |
| `spawnedAtMs` future-time injection breaks uptime label | `[MODELED-LOW]` | `[LOW]` (cosmetic) | Render branch: `if (now < spawnedAtMs) return null` — omit label rather than render negative |
| Test non-determinism via `Date.now()` in tile-header probe | `[MODELED-MEDIUM]` | `[LOW]` | Tests inject `nowMs?: number` prop seam OR vi.useFakeTimers |
| Renderer side-Map state grows unbounded | `[MODELED-LOW]` (session-cap ≤ 8) | `[LOW]` | Side-Map entries cleaned on session kill (mirror sessions[] lifecycle) at WB4 |
| Cluster A populator signature drift | `[MODELED-LOW]` | `[MEDIUM]` (typecheck fail) | dispatch-core dist already built at HEAD; typecheck-loud on signature mismatch |

---

## §9 — §6.6 amendment outline

`[KNOWN]` Default Sub-Q resolutions produce ZERO frozen-surface touch. No `WORKSTATION_CONTRACT.md` §6 amendment. No new IPC channels.

---

**End of MB-T-PHASE-4-T8-SIBLING-EXEC build-doc.**

Status: EXECUTABLE. Three legs: spawn-handler + tile-grid-app + tile-header (prop-wire-ready). One deferred leg (rendering pass-through via tile.tsx) followup-filed.
