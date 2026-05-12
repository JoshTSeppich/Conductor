# c5-ticket-wb1 — Revert + Contract Alignment Coord Doc (2026-05-12)

**Session**: `c5-ticket-wb1` (Round 11 §3.9 Wave 2 SPECULATIVE — tile-grid-app integration trinity)
**Authored under**: operator Phase 1 reinforcement (e) 2026-05-12
**Manifest**: `docs/coordination/territorial-manifests/c5-tilegrid-wiring.txt`

---

## §1 — Incident Summary

`63eba0f` (`red(MB-F-FRAME-C-IPC-LOOKUP-SESSION-anchor): WB1`) committed at 15:09:24 included **3 files**, only **1** in c5 territory:

| File | Status | Lines |
|---|---|---|
| `packages/dispatch-workstation/test/unit/main/probe-frame-c-ipc-lookup-registry.spec.ts` | **c5 territory (intended)** | +100 |
| `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` | **c5 FORBIDDEN per manifest** | +16 |
| `packages/dispatch-workstation/test/unit/tile-grid/probe-spawnmode-01-entry-type-shape.spec.ts` | **outside c5 probe glob** | +5/-8 |

The 2 contaminating files are `commit-plan-doc-1334`'s WB2 GREEN work (TileGridSessionEntry.spawnMode field addition + @ts-expect-error suppression removals).

### Root cause [KNOWN]

Per-path `git add <c5-probe-only>` was followed (per §2.7). Pre-commit verification via `git diff --staged --name-only` confirmed scope (single file). Subsequent `git reset HEAD <orchestrator-foreign-file>` unstaged orchestrator's pre-staged status doc. Then `git commit -m "..."` was invoked **without pathspec**.

In the millisecond window between staged-verify and commit, `commit-plan-doc-1334` ran `git add` on tile-grid.tsx + probe-spawnmode-01, staging them into the shared `.git/index`. `git commit` (no pathspec) captured ALL staged content.

§2.7 covers per-path `git add` discipline — that was followed. §2.7 does NOT explicitly require per-path `git commit -- <pathspec>` — that gap is the corrected discipline going forward per operator Phase 1 reinforcement (d).

## §2 — Remediation

### §2.1 Revert commit

**SHA**: `9b8a4e9` (`chore(c5-incident): partial-revert of cross-session contamination in 63eba0f`)

Scope (committed via `git commit -- <2 paths>`):
- `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` — restored to `871caf9` (parent of 63eba0f); spawnMode field reverted.
- `packages/dispatch-workstation/test/unit/tile-grid/probe-spawnmode-01-entry-type-shape.spec.ts` — restored to `871caf9`; @ts-expect-error suppressions returned (RED state restored).

### §2.2 c5 probe preservation

**63eba0f-preserved confirmation**: `packages/dispatch-workstation/test/unit/main/probe-frame-c-ipc-lookup-registry.spec.ts` was NOT touched by the partial-revert. The file remains intact in 63eba0f (operator reinforcement (a) 2026-05-12: preserve c5 probe).

Verified: `git diff-tree --no-commit-id --name-only -r 9b8a4e9` lists exactly the 2 reverted paths; my probe path is absent from that list, confirming preservation.

### §2.3 WB2 RED amendment

**SHA**: `a400c10` (`red(MB-F-FRAME-C-IPC-LOOKUP-SESSION-anchor): WB2 — probe amendment to align registry helper with t3 SessionRegistrySource`)

Scope: probe-frame-c-ipc-lookup-registry.spec.ts only. Method renaming `lookup(name)` → `getSession(name)` to align with t3's `SessionRegistrySource` interface (see §3 below). 9 RED conditions (WB1's 8 + 1 for `SessionRegistrySource` assignability).

## §3 — `lookup` → `getSession` Rename Rationale

### §3.1 t3 ship at `d18353b`

`t3-ticket-body-0905` shipped its WB1 GREEN at `d18353b` (`green(MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11): WB1 — frame-c-ipc-deps-production factory + types seam`). This ship introduced two new modules in main-process territory:

`packages/dispatch-workstation/src/main/frame-c-ipc-deps.ts:42-44`:
```typescript
export interface SessionRegistrySource {
  getSession(sessionName: string): { cwd: string; branchName: string } | null;
}
```

`packages/dispatch-workstation/src/main/frame-c-ipc-deps-production.ts:31-35`:
```typescript
export function createProductionLookupSession(
  source: SessionRegistrySource,
): SessionLookupFn {
  return (sessionName) => source.getSession(sessionName);
}
```

### §3.2 c5's original design (WB1 in 63eba0f)

c5 WB1's probe expected `registry.lookup(name)` as the public method. That naming predated t3's ship; the c5 manifest was authored before d18353b landed.

### §3.3 Contract-alignment rename (WB2 in a400c10)

Renaming `lookup` → `getSession` makes c5's registry **directly structurally satisfy** t3's `SessionRegistrySource` interface. The integration handoff becomes verbatim:

```typescript
const registry = createSessionRegistry();        // c5 WB3 GREEN (forthcoming)
const lookupSession = createProductionLookupSession(registry);  // t3 factory @ d18353b
createDefaultFrameCIpcController({ lookupSession, emitScroll, writeFrameMode })
  .registerHandlers(ipcMain);
```

No adapter shim needed. The registry **IS-A** `SessionRegistrySource`.

### §3.4 Compatibility with original `SessionLookupFn`

`SessionLookupFn = (name: string) => { cwd, branchName } | null` (from `frame-c-ipc.ts:38-40`) is a function-type. `SessionRegistrySource.getSession` is a method-shape with the same call-signature. The probe's 9th condition tests `registry.getSession.bind(registry)` is assignable to `SessionLookupFn` — preserving the legacy direct-assignment path if any consumer needs the function-type rather than the source-interface.

## §4 — Dependency surface for `commit-plan-doc-1334`

### §4.1 What happens post-revert

After `9b8a4e9` lands on origin (pushed at 17:13Z), `commit-plan-doc-1334`'s working tree will show:

```
 M packages/dispatch-workstation/src/tile-grid/tile-grid.tsx
 M packages/dispatch-workstation/test/unit/tile-grid/probe-spawnmode-01-entry-type-shape.spec.ts
```

These are their WB2 GREEN changes (spawnMode field + suppression removals) that c5's 63eba0f inadvertently committed under its cairn line, and that 9b8a4e9 reverted back to their state at 871caf9.

### §4.2 Recommended `commit-plan-doc-1334` resumption path

1. Verify working tree state matches expected: `git diff --stat` should show the 2 paths as modified relative to current HEAD.
2. Pre-commit `git status --short` verification.
3. Per-path `git add -- <2 paths>` then `git commit -- <2 paths>` with their own cairn line (likely `green(MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING-CLOSURE-A): WB2 — ...`).
4. Per-cairn-commit push per §2.6.

### §4.3 No regression to commit-plan-doc-1334's claim

The MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING followup remains **uncloseed** post-9b8a4e9. commit-plan-doc-1334's WB1 RED (`d4d61bc`) remains the canonical RED state on main. commit-plan-doc-1334's WB2 GREEN ship needs re-staging only — the code itself is preserved in their working tree.

## §5 — Discipline tightening (forward)

### §5.1 §2.7 amendment proposal (operator-decided)

Operator Phase 1 reinforcement (d) 2026-05-12 mandates for c5 going forward:
1. **Per-path `git commit -- <pathspec>` ALWAYS** — not just per-path `git add`.
2. **Pre-commit `git status --short` verification ALWAYS** — even after staged-verify, the working tree state at commit time is what matters when pathspec is used.

These should be candidate additions to `CLAUDE.md §2.7` (operator-arbitrated territory).

### §5.2 c5 commits after this doc

All c5 commits post-a400c10 follow the tightened discipline. The MEMORY.md feedback-row precedent is:
> Pre-commit `git status --short` verification + per-path `git commit -- <pathspec>` are MANDATORY in shared-working-tree parallel-cairn contexts. Per-path `git add` alone is insufficient — the index can be modified between add and commit by other sessions.

## §6 — Forward c5 plan post-a400c10

| WB | Status | Description |
|---|---|---|
| WB1 (63eba0f) | shipped | probe with `lookup` naming (preserved in commit; cross-contract-misaligned) |
| WB2 (a400c10) | shipped | probe amendment with `getSession` naming (cross-contract-aligned) |
| WB3 | pending | green: `createSessionRegistry()` + `SessionRegistry` type in `frame-c-ipc.ts` (flips 9 conditions GREEN) |
| WB4 | pending | red: `frame-mode-subscription.ts` module probe |
| WB5 | pending | green: `frame-mode-subscription.ts` + TileGridApp `onFrameModeChange` bridge extension |
| WB6 | pending | red: `scroll-to-session-consumer.ts` module probe |
| WB7 | pending | green: `scroll-to-session-consumer.ts` + TileGridApp `onScrollToSession` bridge extension |
| WB-final | pending | coord docs + trinity findings + push (re-numbered from operator (e) coord doc that lives in this file) |

§2.11 honest framing: c5 trinity ships as **"Capability enabled with known limitations"** — three followups receive **partial anchor closure** (renderer-side surfaces + registry helper). Full closure requires downstream non-c5-territory work:
- t3-ticket-body-0905 wires `createProductionLookupSession(c5Registry)` into main.ts (partial: factory shipped; consumer not yet wired);
- preload.mts extension to expose `onFrameModeChange` + `onScrollToSession` (out of c5 territory);
- main.ts emits `frame-mode:changed` events on every `writeFrameMode` (out of c5 territory);
- `tile-grid.tsx` + `tile.tsx` frameMode prop pass-through (out of c5 territory).

The c5 work is the **integration anchor**, not end-to-end closure. The coord doc at `docs/coordination/coord-c5-tilegrid-wiring-2026-05-12.md` (forthcoming at WB-final) will document the end-to-end picture across c5 + t3 + downstream.

## §7 — SHA log

| SHA | Type | Description |
|---|---|---|
| `63eba0f` | red (contaminated) | WB1 — session-registry helper probe (8 conditions; contains 2 foreign files) |
| `9b8a4e9` | chore (revert) | partial-revert of cross-session contamination; restored 2 forbidden paths |
| `a400c10` | red (clean) | WB2 — probe amendment for cross-contract alignment with t3 SessionRegistrySource |

All 3 commits pushed to `origin/main`. `git log origin/main..HEAD` verified empty post-a400c10 push.
