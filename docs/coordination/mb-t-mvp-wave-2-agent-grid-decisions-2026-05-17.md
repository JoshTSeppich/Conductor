# MB-T-MVP-W2-AGENT-GRID — Decisions (2026-05-17)

**Session:** r12-mvp-w2-agent-grid
**Operator authorization:** OPTION (B) ~17:35 MDT 2026-05-17

Phase-1-diagnose surfaced 7 arbitration questions (`HALT-COARCH-CONSULTATION-NEEDED`). Per operator-binding scope-gate §G ("Layout restyle ONLY. Defer feature additions to post-MVP.") + operator-PROCEED directive in dispatch boot prompt, resolved as mechanical-translation dispositions per CLAUDE.md §3.4. Operator post-hoc review welcome.

## Q-W2-1 — How does `computeAgentGridLayout` plug into tile-grid.tsx?

**Decision: (b) prop-gated** — Add `TileGridProps.agentGridMode?: boolean` (default falsy on `TileGrid`; default true on `TileGridApp`). Layout-selection branch becomes: hero-mode > agent-grid (when prop=true && !hero) > uniform-fallback.

**Why (mechanical-translation per §3.4):**
- Preserves existing MB-T12 ladder tests that mount `<TileGrid>` directly without setting the prop (e.g., `probe-01-grid-renders-n-tiles.spec.tsx` asserts uniform geometry at N=9 → 2×4; would break if default flipped).
- Production path (`mount.ts` → `<TileGridApp>`) flips to agent-grid via TileGridApp prop-default of true — MVP visible without touching mount.ts (which is READ-ONLY in Wave-2 manifest).
- Test fixtures can opt back to uniform via `<TileGridApp agentGridMode={false}>` if needed.

## Q-W2-2 — Disposition of `tile-hero-squad-layout.ts` post-restyle

**Decision: (b) FLAG-PRESERVE** — Hero-squad layout retained behind `heroSessionName != null` branch (unchanged). Hero-mode takes precedence over agent-grid-mode when both signals present.

**Why:** Q-W2-2 (a) DELETE risks stranding `heroSessionName` field in user-persisted `tile-grid-state.json` (R4 in Phase-1 diagnose). FLAG-PRESERVE is the safest mechanical choice; eventual deletion deferred to `MB-F-TILE-HERO-SQUAD-DEAD-CODE-EVENTUAL-REMOVAL` (Tier 3).

## Q-W2-3 — "Agent label" semantics

**Decision: (a) `session.name` verbatim** — TileHeader already renders `tile-session-name` testid containing `sessionName` prop at `tile-header.tsx:231-237`. Zero new code; matches existing chrome.

**Why:** Operator-vision is non-specific. (b)/(c) introduce new data flow + persistence which violates scope-gate §G. (a) is mechanical pass-through.

## Q-W2-4 — Exit → tile-disappear behavior

**Decision: (a) kill-button verify-only** — Verified via probe-03 that `handleKill` → `setSessions(filter)` chain removes the tile when an operator clicks `[data-testid="tile-kill-btn"]`. Auto-exit on daemon-side process-exit DEFERRED to followup `MB-F-AGENT-GRID-AUTO-EXIT-REACTIVITY` (Tier 1).

**Why:** Boot prompt §B explicitly says "VERIFIES + harnesses, does NOT rebuild." Net-new IPC subscription (Q-W2-4 (b)) would exceed Wave-2 scope and may overlap Wave-1 territory. Local `statusListClient`-driven removal (Q-W2-4 (c)) is in territory but is net-new behavior outside scope-gate §G.

## Q-W2-5 — Spec table for N=1..12 (and beyond)

**Decision:**
```
N=1     → 1×1
N=2     → 1×2
N=3-4   → 2×2     (operator-vision "2x2" anchor)
N=5-6   → 2×3     (operator-vision "2x3" anchor)
N=7-9   → 3×3
N=10-12 → 3×4
N≥13    → 3×4 + overflow=true (graceful degradation)
```

**Why:** Operator-vision says "2x2 or 2x3" + "1-12 concurrent gracefully". 2x2/2x3 cover N≤6 explicitly. For N=7..12 (within "1-12" range), 3-row layout honors "gracefully" without scroll. For N>12, fall back to overflow with 3x4 base + CSS Grid auto-flow (mirrors `computeGridLayout` MB-T12 WB2 pattern for N≥9). Last-tile-spans-leftover-cells convention preserved from `tile-layout.ts:18-24`.

## Q-W2-6 — Chrome density at 40% width compact form factor

**Decision: (b) preserve full chrome** — All existing TileHeader chrome (status-dot + session-name + branch + repo + model-chip + uptime + ctx-text + token-meter) renders in agent-grid mode. CSS `overflow: hidden` + `text-overflow: ellipsis` handles compact-form truncation.

**Why:** Scope-gate §G "Defer feature additions to post-MVP" rules out chrome subset suppression (which would also break MB-T15 chrome probes — R6 in Phase-1 diagnose). If operator finds visual overcrowding at 40% width post-dogfood, a separate ticket can introduce a `frameMode === 'A'`-style compact gate.

## Q-W2-7 — Diagnose surface placement

**Decision: (b) build-doc + coord-decisions** — Diagnose summary in build-doc §1; full diagnose narrative + arbitrations in this decisions doc; findings + verification results in findings doc.

**Why:** MB-T15 / MB-T18 precedent. Cosmetic-doc-only; chosen to match house pattern.

## Architectural posture summary

**Layout taxonomy post-Wave-2:**
```
TileGrid layout selector:
  1. heroSessionName matches → computeHeroSquadLayout (legacy, FLAG-PRESERVE)
  2. agentGridMode === true → computeAgentGridLayout (NEW MVP default for TileGridApp)
  3. else                    → computeGridLayout (legacy uniform, fallback for direct TileGrid mounts)
```

**Prop-drill posture (Wave-2-closed):**
- `spawnedAtMs` flows from spawn-result envelope → TileGridSessionEntry → Tile → TileHeader end-to-end (closed t8-sibling-exec build-doc §1.5 deferred gap).
- `_spawnedAtMsBySession` side-Map preserved for `onSpawnedAtMsCapture` callback consumers (legacy compat).

**Operator escape hatches:**
- `<TileGridApp agentGridMode={false}>` opts back to uniform (test fixtures, A/B comparison).
- `<TileGridApp heroSessionName="..." agentGridMode={true}>` — hero wins precedence (FLAG-PRESERVE retained).
