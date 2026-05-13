# MB-T-PHASE-4-T8-SIBLING-EXEC — WB-final findings

**Session:** `t3-ticket-body-0905-t8-sibling` (Round 11 Wave 5)
**Date:** 2026-05-13
**Build-doc:** `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-T8-SIBLING-EXEC_BUILD.md` (`414ed80`)
**Territorial manifest:** `docs/coordination/territorial-manifests/t3-t8-sibling-exec.txt`
**Coord doc:** `docs/coordination/coord-phase4-t8sibling-2026-05-13.md`

---

## I. Shipped (cairn-grammar commits)

| WB | Commit | Subject |
|---|---|---|
| docs | `414ed80` | `docs(MB-T-PHASE-4-T8-SIBLING-EXEC): build-doc — consumer-side wiring of Cluster A (model + spawnedAtMs) under tile-grid.tsx FORBIDDEN constraint` |
| WB1 | `13b678d` | `red(MB-T-PHASE-4-T8-SIBLING-EXEC): WB1 — probe-mbtphase4-t8sibling-01-spawn-handler-extensions (3 conditions)` |
| WB2 | `ab35a5a` | `green(MB-T-PHASE-4-T8-SIBLING-EXEC): WB2 — spawn-handler.ts extension wiring (3/3 probes GREEN)` |
| WB3 | `97aa27c` | `red(MB-T-PHASE-4-T8-SIBLING-EXEC): WB3 — probe-mbtphase4-t8sibling-02-tile-grid-app-spawn-result-consumer (2 conditions)` |
| WB4 | `8d94ab0` | `green(MB-T-PHASE-4-T8-SIBLING-EXEC): WB4 — tile-grid-app spawn-result extension consumer (2/2 probes GREEN)` |
| WB5 | `ca72cae` | `red(MB-T-PHASE-4-T8-SIBLING-EXEC): WB5 — probe-mbtphase4-t8sibling-03-tile-header-uptime (3 conditions; 2 RED + 1 invariant-pass)` |
| WB6 | `d62caa1` | `green(MB-T-PHASE-4-T8-SIBLING-EXEC): WB6 — tile-header.tsx spawnedAtMs prop + uptime label (8/8 cumulative)` |
| WB-final | (this commit) | `green(MB-T-PHASE-4-T8-SIBLING-EXEC): WB-final — findings + coord doc + deferred-leg followup filing` |

8 commits / 8/8 probes GREEN at completion.

## II. Sub-Q dispositions

| Sub-Q | Resolution adopted | Build-doc §3 default | Drift |
|---|---|---|---|
| A — model source | `deps.model` injection via Cluster A populator | same | none |
| B — spawnedAtMs source | `deps.nowMs` injection / `Date.now()` fallback | same | none |
| C — spawnedAtMs renderer storage | renderer-local `Map<sessionName, number>` useState (anchor-only per c5 pattern) | same | none |
| D — tile-header render pass-through | **DEFERRED** — prop wire-ready; tile.tsx pass-through deferred | same | none |
| E — consumer non-regression scope | per-WB scoped + workstation typecheck after each MOD | same | none |
| F — uptime label format | `<m>m` <1h; `<h>h<m>m` >=1h; null when undefined/future/<1m | same | added: null when <1m (avoid noisy "0m" at spawn) |

## III. Architectural deltas

`[KNOWN]` Three additive surfaces shipped; one deferred:

1. **spawn-handler.ts (WB2):** SpawnSessionResult + SpawnHandlerDeps extended. Pure-fn populator from Cluster A imported + called at return site. Test-injectable `nowMs` / `model`.
2. **tile-grid-app.tsx (WB4):** SpawnSuccessReply type guard widened (defensively optional fields). Existing `TileGridSessionEntry.model` populated end-to-end. New renderer-local `spawnedAtMsBySession: Map<string, number>` useState + new optional callback prop `onSpawnedAtMsCapture`.
3. **tile-header.tsx (WB6):** TileHeaderProps + `spawnedAtMs?: number + nowMs?: number`. NEW pure-fn `formatUptimeLabel()`. NEW DOM element `[data-testid="tile-header-uptime"]` rendered conditionally.

**Deferred** (followup §IV.1):
4. **tile.tsx + tile-grid.tsx pass-through** — Tile component does not yet declare `spawnedAtMs?: number` prop nor pass it to TileHeader. tile-grid.tsx does not pass `spawnedAtMs` from `TileGridSessionEntry` to `<Tile>`. **TileHeader's `spawnedAtMs` prop receives undefined in production today** despite the data being captured in tile-grid-app's side-Map. Renderer DOM does not yet show the uptime label.

## IV. Open followups filed (deferred legs)

### IV.1 — `MB-F-T8-SIBLING-EXEC-TILE-HEADER-SPAWNEDATMS-PASS-THROUGH-DEFERRED` (proposed Tier 2)

**Closure path:** Successor session with `tile-grid.tsx` + `tile.tsx` in WRITE territory adds:
- `<Tile spawnedAtMs={...}>` prop declaration on Tile.
- TileGrid passes a per-session `spawnedAtMs` prop to each `<Tile>`, sourced either from `TileGridSessionEntry.spawnedAtMs` (if the entry shape is also extended at that point) OR from a render-prop closure feeding the value from tile-grid-app's side-Map.
- Verifies uptime label renders in production via Phase 3 visual-verification screenshot.

**Why deferred:** tile-grid.tsx + tile.tsx are out of this session's territory. Same posture as c5-trinity's `_frameMode` (line 177) + `_lastScrollTargetSessionName` (line 190) anchor-only state — pattern is now established as a recurring territorial-deferral mechanism in Round 11.

**Audit-row impact:** P3-rev-2 §1.1 `MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE` advances from "STUB" → "CONSUMER-WIRING-PARTIAL" (data path full; render pass-through pending). Full SHIPPED on followup closure.

**Discoverability anchor:** `tile-header.tsx` TileHeaderProps comment for `spawnedAtMs` cites this followup verbatim.

### IV.2 — Honest gap — `model` flows end-to-end

For `model`: TileGridSessionEntry.model is an existing MB-T15 field. tile-grid.tsx already passes `model={s.model}` to `<Tile>` (read-only confirmed at line 408 of Wave 2 read). Tile passes to TileHeader. **The model arm is FULLY SHIPPED at WB4.** Probe 02a verifies the chip data-chip attribute via end-to-end DOM render.

P3-rev-2 §1.1 `MB-T-PHASE-4-MODEL-SOURCE-WIRING` is **FULL CLOSURE** at WB4.

## V. Verification evidence

`[KNOWN]` at HEAD `d62caa1`:

- 8/8 probes GREEN (3 + 2 + 3):
  - `probe-mbtphase4-t8sibling-01-spawn-handler-extensions.spec.ts` — 3/3 (01a deterministic nowMs; 01b deterministic model; 01c backward-compat + Date.now fallback).
  - `probe-mbtphase4-t8sibling-02-tile-grid-app-spawn-result-consumer.spec.tsx` — 2/2 (02a model DOM chip; 02b spawnedAtMs callback).
  - `probe-mbtphase4-t8sibling-03-tile-header-uptime.spec.tsx` — 3/3 (03a omit-when-absent; 03b 5m label; 03c 1h5m label).
- `pnpm --filter dispatch-workstation typecheck` — clean after each GREEN WB.
- Per-WB `git log origin/main..HEAD` empty post-push (CLAUDE.md §2.6).

## VI. Shared-tree contention observed

`[KNOWN]` Per `git status --short` audit at each WB:

| File | Contention | Mitigation applied |
|---|---|---|
| `spawn-handler.ts` (WB2) | 1-line stale orphan import (`BypassPermsSource` from `phase4-t9-exec` Wave-4 reverted bypass-perms work; grep-verified unused) | Transparent disclosure in `ab35a5a` commit body; orphan absorbed into pathspec (1 of 49 inserted lines); removable in follow-on cleanup if phase4-t9-exec does not re-use |
| `tile-grid-app.tsx` (WB4) | None observed at edit time | Pre-edit `git status --short` clean; immediate post-commit push |
| `tile-header.tsx` (WB6) | None observed | Same |

## VII. §3.9.D patterns surfaced

`[MODELED]` for Round 11 archive:

1. **Anchor-only renderer state pattern is now established as a Round-11 recurring mechanism.** Three sessions (c5-trinity Wave 2, this t8-sibling Wave 5) have used `useState`-held value + downstream-prop-drill-deferred + followup-filed when target file is FORBIDDEN. Recommendation: codify in CLAUDE.md §3 conventions as "renderer-local anchor-state pattern when downstream surface is out-of-territory".

2. **Shared-tree orphan-import sweep is a real risk** (§2.7 evidenced). The mitigation gradient: ideal = no sweep (other session commits first); acceptable = transparent disclosure + 1-line absorption; unacceptable = silent sweep + no disclosure. The transparent-disclosure mid-tier worked here without harm.

3. **(β)-style "module ships, sibling wires" two-session pattern is repeatable.** Cluster A shipped the module/type at `3e9a203`; this T8-sibling-exec wired consumers ~24h later. Construction-order discipline (sibling A finishes type contract before sibling B writes consumer) is what enables disjoint sessions.

## VIII. Definition of done — closure

Build-doc §7 DoD items:
- (1) WB1–WB-final cairn ladder lands + pushed per §2.6 — `[KNOWN]` 8 commits.
- (2) SpawnSessionResult.model? + spawnedAtMs declared — `[KNOWN]` per WB2.
- (3) SpawnHandlerDeps.model? + nowMs? declared; populator called — `[KNOWN]` per WB2.
- (4) tile-grid-app.tsx SpawnSuccessReply + state extensions — `[KNOWN]` per WB4.
- (5) tile-header.tsx prop + uptime label — `[KNOWN]` per WB6.
- (6) 8/8 probes GREEN at WB-final — `[KNOWN]`.
- (7) workstation typecheck clean — `[KNOWN]`.
- (8) Followup filed for deferred pass-through — `[KNOWN]` per §IV.1.
- (9) Findings + coord docs land — `[KNOWN]` per this commit.

**Ticket DONE-WITH-DEFERRED-LEG.** Outcome classification (§2.11): **"Capability enabled with known limitations"** — data flows end-to-end from spawn-handler to renderer side-Map; uptime DOM rendering is unit-tested but production prop delivery via `<Tile>` is deferred.

## IX. Round 11 PHASE 2 invariant compliance

| Invariant | Status |
|---|---|
| Per-path `git add` only | `[KNOWN]` 8 commits, all per-path |
| Per-commit push to origin (§2.6) | `[KNOWN]` 8 commits, all pushed; empty `git log origin/main..HEAD` after each |
| Pathspec on `git commit --` | `[KNOWN]` 8 commits, all with explicit pathspec |
| Cairn-grammar prefix | `[KNOWN]` 1 `docs:` + 3 `red:` + 4 `green:` |
| Self-check Q1-Q9 in body | `[KNOWN]` 7 of 8 (docs commit body explicit; WB-final this commit closes Q-block expectations) |
| Anti-fabrication labels | `[KNOWN]` KNOWN/MODELED/SPECULATIVE in every claim |
| Territorial-FORBIDDEN respect | `[KNOWN]` tile-grid.tsx + tile.tsx + dispatch-core/** untouched |
| Frozen-contract preservation | `[KNOWN]` schema.ts §1-§13, WORKSTATION_CONTRACT.md §6, CONDUCTOR_API_CONTRACT.md untouched |
