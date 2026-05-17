# MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING — Decisions

**Session**: r12-cw2-t5-build-md-status-line-mount
**Date**: 2026-05-17
**Closure-target row**: docs/FOLLOWUPS.md:353

---

## D1 — Bridge access pattern: globalThis-window vs prop injection

**Chose**: globalThis-window (`(globalThis as unknown as { window?: ... }).window?.workstationBridge`).

**Alternatives considered**:
- (a) Extend `FrameCWorkstationBridge` prop interface (currently only `onSpawnResult`) to add `readBuildMd?` + `triggerBuildMdDispatch?`. Pass through from `mount.tsx` (READ-ONLY in TERRITORY).
- (b) Add a separate `BuildMdBridge` prop to FrameCRootProps.
- (c) **Chosen**: access `window.workstationBridge` directly via globalThis cast inside FrameCRoot useEffect + handler.

**Why (c)**:
- `mount.tsx` is READ-ONLY in this session's manifest TERRITORY — option (a) would require modifying it to thread the new methods through the bridge prop. Cannot do without expanding territory.
- Option (b) would add a new prop chain through `mount.tsx` (same READ-ONLY blocker) or require window-access fallback inside the component anyway.
- (c) mirrors the existing, operator-arbitrated pattern at `detail-pane.tsx:546-548, 575-583` for `readSwarmState` and `killSession`. Same prior-art precedent. No new convention introduced.

**Trade-off accepted**: tests must install a stub onto `globalThis.window.workstationBridge` (mirrors `probe-mbtwbfcs-04` pattern). This is the established convention; not a regression.

---

## D2 — Layout restructure: outer flex direction row → column

**Chose**: flip outer `frame-c-root` `flexDirection: 'row'` → `'column'`, wrap existing two-column layout in an unlabeled `BODY_ROW_STYLE` div (`flex: '1 1 auto'; min-height: 0; flexDirection: 'row'`), append `BuildMdStatusLine` inside a `BOTTOM_STATUS_ROW_STYLE` div with `flexShrink: 0`.

**Alternatives considered**:
- (a) Render the status line absolute-positioned overlay at the bottom of the existing row layout.
- (b) Render the status line as a sibling outside `frame-c-root` (would require modifying `mount.tsx` to wrap a parent — out of TERRITORY).
- (c) **Chosen**: wrap-in-column with internal row.

**Why (c)**:
- (a) breaks the natural flex flow + overlays content; would obscure DetailPane bottom content.
- (b) requires writing to `mount.tsx` (READ-ONLY in manifest).
- (c) is internal to `frame-c-root.tsx` (TERRITORY write), preserves descendant testid query semantics (verified via 30/30 frame-c suite GREEN at WB2), and matches the wireframe §1 bottom-status-line intent ("Frame-C-bottom" per Sub-Q-MBTWFT5-E=(i)).

**Risk noted**: any future probe asserting computed-style `flex-direction: row` on `data-testid="frame-c-root"` would regress. Filed as Tier 3 followup at WB-final.

---

## D3 — Re-fetch strategy after dispatch trigger

**Chose**: chain `bridge.readBuildMd()` after `bridge.triggerBuildMdDispatch()` resolves, replacing `buildMdResult` state with the new load result.

**Alternatives considered**:
- (a) **Chosen**: full re-fetch via `bridge.readBuildMd()`.
- (b) Use the `BuildMdDispatchTriggerResult` `{spawnedCount, declinedCount, queuedCount}` shape returned by `triggerBuildMdDispatch` to derive new readyCount client-side (decrement by spawnedCount).
- (c) No re-fetch — leave the status counts stale until the next mount.

**Why (a)**:
- FOLLOWUPS:353 row body verbatim: `onSpawnTriggerClick: () => window.workstationBridge.triggerBuildMdDispatch().then(r => /* re-fetch status or update UI */)`. "Re-fetch status" is the noted closure-path approach.
- Option (b) couples renderer to dispatch-trigger return-shape arithmetic; main-process is authoritative for status (some tasks may have completed between trigger fire + status read). Server-side re-fetch is the simpler honest path.
- Option (c) defeats the purpose of the click — operator clicks Spawn, sees no visual confirmation, perceived as broken.

---

## D4 — Error-swallow vs error-surface

**Chose**: swallow errors in both useEffect initial-load and `handleSpawnTriggerClick` re-fetch chain; do NOT surface to any error state.

**Alternatives considered**:
- (a) **Chosen**: swallow.
- (b) Add `useState<string | null>(null)` for buildMdError + render a small error banner adjacent to the status line.
- (c) Throw / propagate to a higher boundary.

**Why (a)**:
- Closure scope is mount + click wiring per FOLLOWUPS:353; error UX expansion is outside the row's stated Tier 2 closure path.
- Filing a Tier 3 followup (`MB-F-T5-INITIAL-LOAD-FAILURE-INDICATOR-HIDDEN` + `MB-F-T5-SPAWN-TRIGGER-CLICK-FAILURE-VISIBILITY`) preserves the discoverability of this limitation without bloating WB2 GREEN scope.
- Honest framing — operator-visual signal IS load-bearing per row Tier 2 rationale; deferring to followup is the honest tradeoff.

---

## D5 — onSpawnTriggerClick wiring decision: inline handler vs useCallback

**Chose**: inline function (`const handleSpawnTriggerClick = (): void => { ... }`) declared in render scope, NOT wrapped in `useCallback`.

**Alternatives considered**:
- (a) **Chosen**: inline function in render scope.
- (b) `useCallback` with `[]` deps.

**Why (a)**:
- BuildMdStatusLine is a leaf component without React.memo; re-creating the handler each render does not cascade re-renders.
- Closure captures `setBuildMdResult` (stable React setter) + reads `globalThis.window` at call time (no captured value to stale).
- `useCallback` is premature optimization here per CLAUDE.md guidance ("Don't add features, refactor, or introduce abstractions beyond what the task requires").

---

## D6 — Stale-dispatch check disposition

**Chose**: PROCEED.

**Evidence**: `git --no-pager log --all --grep "MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING"` returned only the WB12 filing commit `87c04b6` ("WB12 — findings doc + 7 new FOLLOWUPS rows"). No CLOSED/RESOLVED/SHIPPED prior commits. `grep BuildMdStatusLine packages/dispatch-workstation/src/frame-c/frame-c-root.tsx` returned empty at HEAD pre-WB1, corroborating the row body claim that mount was not yet done.

Per `feedback_stale_dispatch_detection.md`: required at Phase 1 before any RED scaffold. Performed. Row confirmed live.

---

## D7 — Followup filing posture

**Chose**: file 3 Tier 3 followups at WB-final commit (within scope of the closure session) rather than deferring to a separate session.

Followups proposed:
1. `MB-F-T5-SPAWN-TRIGGER-CLICK-FAILURE-VISIBILITY` — Tier 3 — error swallow in `handleSpawnTriggerClick`; closure path = useState error + adjacent banner.
2. `MB-F-T5-INITIAL-LOAD-FAILURE-INDICATOR-HIDDEN` — Tier 3 — initial readBuildMd reject leaves status line invisible; closure path = render placeholder for distinguishing "no bridge" vs "load failed".
3. `MB-F-FRAME-C-ROOT-FLEX-DIRECTION-LAYOUT-ASSUMPTION` — Tier 3 — outer flex flipped row→column; risk of future computed-style probe regression.

**Note**: manifest FORBIDS writes to `docs/FOLLOWUPS.md` except the closure stamp envelope. The 3 followups above are surfaced HERE (decisions doc), not appended to FOLLOWUPS.md directly. Gen-7 mediates whether to write them in the closure stamp envelope or queue them for a separate dispatch.
