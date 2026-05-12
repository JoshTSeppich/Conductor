# MB-T-WIREFRAME-T1-SESSION-DATA-FLOW — Findings + closures

**Ticket:** MB-T-WIREFRAME-T1-SESSION-DATA-FLOW (Session data flow — left rail population)
**Ticket body:** `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T1-SESSION-DATA-FLOW_BUILD.md` (authored `ec60622`)
**Author:** T1 sub-session (gen-3 → gen-4 orchestrator dispatch, Round 9 of cairn-under-stress)
**Date:** 2026-05-12
**Sub-Q resolutions (operator-acked):** A=(α) renderer-only useState · B=(i) renderer-infer model · C=(i) extend TileStatus + renderer-derived · D=(i) renderer-internal mount-time uptime · E=(α) renderer-only filter · F=(α) selection-persistence deferred
**Closure target:** `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` (Tier 2, FOLLOWUPS.md:327, filed at `e2688fa`) — **CLOSED at WB4 GREEN `a8cd71d`**.

---

## I — What shipped

12 commits across the WB ladder + Tier 1 ratchet:

| # | Commit | Type | Net |
|---|---|---|---|
| 1 | `ec60622` | docs | Ticket body authoring (525 lines, 23 sub-sections, 13 WBs scoped) |
| 2 | `1644e5e` | red | WB1 — `probe-mbtwt1-01-empty-stub-detection.spec.ts` + `t1-t2-coord-2026-05-12.md` |
| 3 | `b641eac` | red | WB2 — `probe-mbtwt1-02-sessions-stream-roundtrip.spec.tsx` (cross-session HALT-recovery surfaced) |
| 4 | `63581e9` | docs | Tier 1 ratchet — `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` recurrence evidence |
| 5 | `4414ef9` | green | WB3 — `FrameCRoot.workstationBridge` prop + useState/useEffect spawn-result subscription |
| 6 | `a8cd71d` | green | **WB4 — `tryAutoMountFrameC` workstationBridge passthrough → CLOSED row 327** |
| 7 | `e339297` | red | WB5 — `probe-mbtwt1-03-status-color-mapping.spec.ts` |
| 8 | `4051789` | green | WB6 — `frame-c/status-color.ts` + TileStatus enum extension + session-list integration |
| 9 | `fb0af26` | red | WB7 — `probe-mbtwt1-04-model-badge-rendering.spec.tsx` |
| 10 | `1b2c7a5` | green | WB8 — `frame-c/model-badge.ts` + session-list render integration |
| 11 | `1e10afc` | red | WB9 — `probe-mbtwt1-05-uptime-rendering.spec.tsx` |
| 12 | `89d2ca1` | green | WB10 — `frame-c/uptime-format.ts` + useRef/setInterval mount-time tick |
| 13 | `ead45f9` | green | WB11 — `frame-c/session-filter-bar.tsx` + FrameCRoot filter state integration (RED+GREEN paired) |

**Net file inventory:**
- NEW: `src/frame-c/status-color.ts` · `src/frame-c/model-badge.ts` · `src/frame-c/uptime-format.ts` · `src/frame-c/session-filter-bar.tsx`
- MOD: `src/frame-c/frame-c-root.tsx` (workstationBridge + sessions stream + filter state) · `src/frame-c/session-list.tsx` (model badge + uptime + status-color via module) · `src/tile-grid/mount.ts` (empty-stub replacement) · `src/tile-grid/types.ts` (TileStatus enum extension with 'error' + 'warning')
- NEW probes: `probe-mbtwt1-{01..06}.spec.{ts,tsx}` (6 probes covering all 6 Sub-Qs + sessions-stream end-to-end)
- NEW docs: this findings doc + `t1-t2-coord-2026-05-12.md` (coord note) + this ticket body

---

## II — Sub-Q disposition

| Sub-Q | Operator ack | Binding interpretation | WB landed |
|---|---|---|---|
| T1-A sessions-stream | (α) renderer-only useState | Independent subscription pattern in FrameCRoot mirroring tile-grid-app.tsx:159-185 — NOT a state-lift to shared parent (operator wording "renderer-only useState" matched the binding interpretation in `ec60622` commit body). Each renderer mount holds its own useState; both TileGridApp + FrameCRoot subscribe to the same `workstationBridge.onSpawnResult` channel independently. Idempotent name-dedup per :173 guard. | WB3 + WB4 |
| T1-B model field source | (i) renderer infer model | Pure-renderer derivation via `modelToLabel(s.model)` — spawn-handler.ts NOT modified. TileGridSessionEntry.model remains STUB at data-source level (defaults to undefined); when populated by future cycle, badge renders. Empty fallback for undefined. | WB7 + WB8 |
| T1-C status color | (i) extend TileStatus + renderer-derived | Additive enum extension `'error' \| 'warning'` + NEW `frame-c/status-color.ts` exhaustive switch mapping. `'error'`/`'warning'` populated by future renderer-derived PTY-tail sentinel detection (NOT shipped this ticket; out-of-scope per ticket body §1.2). | WB5 + WB6 |
| T1-D uptime source | (i) renderer-internal mount-time | useRef<Map<name,ms>> in SessionList registers each session's first-render time; 1s setInterval tick drives re-render. Semantics ≠ session-spawn-time; resets on Frame A↔C toggle + workstation re-launch. Tier 3 followup filed below. | WB9 + WB10 |
| T1-E filter persistence | (α) renderer-only useState | useState<FilterState> in FrameCRoot; lost on Frame A↔C toggle + workstation re-launch. Tier 3 followup filed below. | WB11 |
| T1-F selection persistence | (α) keep deferred | No change from Wave B Sub-Q-MBTWBFCS-A=α renderer-only useState. WB12 SKIPPED per default. | WB12 SKIPPED |

**Net frozen-surface impact:** **ZERO `WORKSTATION_CONTRACT.md` §6 amendment.** All extensions workstation-renderer-internal per §2.10 mechanical-translation framing. TileStatus enum extension is workstation-internal type union (`tile-grid/types.ts`; not exported from dispatch-core; not in §6 channel inventory).

---

## III — Architectural deltas

### III.A — Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` reclassification candidates

| Section | Row | Was | Becomes | Notes |
|---|---|---|---|---|
| §7 Dim 5 | `state` | ARCHITECTURAL-MISMATCH | SHIPPED-RENDERER-DERIVED (partial) | Wireframe taxonomy (green/amber/red/grey) now mapped via `frame-c/status-color.ts` from extended TileStatus enum; `'error'` + `'warning'` values are extension; renderer-derived source per Sub-Q-C=(i) NOT yet wired (PTY-tail sentinel detection deferred to future cycle). Status DISPLAY is shipped; status DERIVATION from PTY signals is gap. |
| §7 Dim 5 | `model` | STUB | SHIPPED-RENDERER-DISPLAY (partial) | `modelToLabel` mapping module + render span in SessionList shipped (`S4.6` / `O4.6` / `O4.7` / `H` / empty); data-source STUB remains — TileGridSessionEntry.model still defaults to undefined (no spawn-handler population). Display layer shipped; data-source gap to be closed by future cycle if/when model becomes load-bearing for badge UX. |
| §7 Dim 5 | `time` | STUB | SHIPPED-RENDERER-MOUNT-TIME (semantic-divergent) | Per-session uptime via SessionList useRef + setInterval tick. Semantics ≠ true session-spawn-time. Tier 3 followup `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE` documents the gap. |
| §10.5 | "Filter row" | "Defer to v3.6" | SHIPPED | `SessionFilterBar` ships status dropdown + repo dropdown + Clear button; filter state renderer-only useState (Sub-Q-E=α). Tier 3 followup `MB-F-FRAME-C-FILTER-STATE-NOT-PERSISTED`. |

Audit-doc edits are operator-territory (not edited by this WB-final per CLAUDE.md §1 frozen-contract rule for audit-doc evolution — operator-arbitrated). This findings doc surfaces the reclassification candidates; operator applies if/when desired.

### III.B — FOLLOWUPS.md closures + new filings

**CLOSED (closure stamp authored at this WB-final):**
- `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` (FOLLOWUPS.md:327, Tier 2, filed `e2688fa`) — closure stamp at WB4 `a8cd71d`. SessionList now renders live session entries via `workstationBridge.onSpawnResult` independent subscription in FrameCRoot.

**NEW Tier 3 filings (to be appended to FOLLOWUPS.md by this commit):**

1. `MB-F-FRAME-C-FILTER-STATE-NOT-PERSISTED-2026-05-12` — Tier 3 — Sub-Q-T1-E=(α) renderer-only filter state lost on Frame A↔C toggle + workstation re-launch. Closure path: (β) NEW `main/frame-c-filter-state.ts` (splitter-state.ts mirror) + NEW IPC `frame-c:get-filter-state` + `frame-c:set-filter-state` — operator-arbitrated `WORKSTATION_CONTRACT.md` §6 amendment per CLAUDE.md §2.4. Tier 3 because ergonomic-not-load-bearing per ticket body §3.5 default rationale.

2. `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` — Tier 3 — Sub-Q-T1-D=(i) renderer-mount-time uptime semantics ≠ session-spawn-time; resets on Frame A↔C toggle + workstation re-launch. Closure path: (iii) MOD `main/spawn-handler.ts` to add `spawnedAtMs: number` field to `SpawnSessionResult` propagation chain (sibling of MB-T18 cwd propagation pattern); workstation-internal per §2.10 mechanical-translation; renderer reads via TileGridSessionEntry-extension. Tier 3 because operator-acked ship-velocity trade-off per Sub-Q-D=(i) selection.

**Cross-ref (NOT closed by T1):**
- `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (FOLLOWUPS.md:271, Tier 2) — Frame C inherits TileGridApp's missing daemon-SSE subscription; SessionList shows stale entries for externally-killed sessions. Out-of-scope for T1 per ticket body §1.2.

---

## IV — Probe distribution

| Probe | WB | Conditions | Final state |
|---|---|---|---|
| `probe-mbtwt1-01-empty-stub-detection.spec.ts` | WB1 RED + WB4 GREEN flip | 3 | GREEN |
| `probe-mbtwt1-02-sessions-stream-roundtrip.spec.tsx` | WB2 RED + WB3 GREEN flip | 4 | GREEN |
| `probe-mbtwt1-03-status-color-mapping.spec.ts` | WB5 RED + WB6 GREEN flip | 6 | GREEN |
| `probe-mbtwt1-04-model-badge-rendering.spec.tsx` | WB7 RED + WB8 GREEN flip | 7 | GREEN |
| `probe-mbtwt1-05-uptime-rendering.spec.tsx` | WB9 RED + WB10 GREEN flip | 5 | GREEN |
| `probe-mbtwt1-06-filter-bar.spec.tsx` | WB11 RED+GREEN paired | 5 | GREEN |

**Total T1 probes:** 6 probes / 30 conditions / 30 GREEN at WB-final.
**Consumer non-regression (CLAUDE.md memory):** Wave B probes (`probe-mbtwbfcs-02` 6/6, `probe-mbtwbfcs-03` 5/5) + Wave C #5 probes (`probe-mbtwtws-01` 5/5, `probe-mbtwtws-02` 6/6) all GREEN at WB-final verification cycles. Zero regression introduced.

---

## V — Architecture notes

### V.A — Independent subscription pattern (Sub-Q-A=α binding)

Operator wording "renderer-only useState" was interpreted in `ec60622` commit body as **independent subscription pattern mirroring tile-grid-app.tsx:159-185**. This means:

- TileGridApp holds its own `useState<TileGridSessionEntry[]>` subscribed to `workstationBridge.onSpawnResult`
- FrameCRoot ALSO holds its own `useState<TileGridSessionEntry[]>` subscribed to the SAME `workstationBridge.onSpawnResult` channel
- Two independent state copies; both subscribe; both react to the same emissions
- Idempotent dedup by `name` field per :173 guard prevents collisions

**Data-divergence risk:** noted in ticket body §3.1 Sub-Q-A=(β). When TileGridApp's `handleKill` removes a session from its copy, FrameCRoot's copy is unaffected — Frame C will keep showing the killed session row until the workstation restart OR until a future `workstation:tile-kill` event broadcast extends to renderer subscribers. This is the inherited gap shared with `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (row 271).

### V.B — TileStatus enum additive extension safety

Adding `'error' | 'warning'` to the TileStatus union touched the MB-T12 ownership zone (`tile-grid/types.ts`). Existing consumers were verified to tolerate the additive extension via fallback patterns:
- `session-list.tsx:124` `STATUS_DOT_HEX[x] ?? STATUS_DOT_HEX['open']!` — unknown statuses degrade to GREEN. Replaced by `statusToColor()` + FALLBACK_DOT_HEX in WB6.
- `tile-header.tsx` STATUS_DOT_HEX (audit doc §7 Dim 5 cross-ref) — same fallback shape; NOT touched by T1; new `'error'`/`'warning'` values would degrade to GREEN in tile-header until a future cycle imports `statusToColor` there. Safe degradation.

No consumer regression observed.

### V.C — Filter bar dual marginLeft:auto layout

Both UPTIME_STYLE + CTX_TEXT_STYLE in `session-list.tsx` use `marginLeft: 'auto'`. Flex behavior: first auto consumes available space, pushing uptime mid-right; second auto consumes remaining space, pushing ctx-text far-right with a gap between. T7 visual-polish ticket may tighten the spacing if operator finds the visual layout undesirable. Probe contracts assert DOM structure not pixel layout, so this is non-blocking for v3.0 ship.

---

## VI — Documentation drift

This findings doc + the WB-final commit are the load-bearing documentation artifacts:
- `t1-t2-coord-2026-05-12.md` (authored at WB1; still accurate at WB-final)
- This findings doc (authored now at WB-final)
- `CONDUCTOR_MB-T-WIREFRAME-T1-SESSION-DATA-FLOW_BUILD.md` (authored at ticket-body-pre-commit `ec60622`; WB ladder execution closely followed scope; Sub-Q-A=(α) operator binding diverged from ticket-body §3.1 (α) label semantics, captured in `ec60622` commit body)

No drift identified vs ticket body §1.1/§1.2 scope.

---

## VII — Consumer non-regression

Per CLAUDE.md memory `feedback_consumer_non_regression_per_wb`, consumer probes run at every WB for code touching files with downstream consumers. Cumulative non-regression evidence:

- Wave B WB3 `probe-mbtwbfcs-02-session-list-renders.spec.tsx` (6/6) — verified after every T1 session-list.tsx edit (WB6, WB8, WB10, WB11)
- Wave B WB5 `probe-mbtwbfcs-03-selection-state.spec.tsx` (5/5) — verified after WB3 + WB6 + WB11
- Wave C #5 WB2 `probe-mbtwtws-01-session-list-ctx-text.spec.tsx` (5/5) — verified after WB6 + WB8 + WB10 + WB11
- Wave C #5 WB4 `probe-mbtwtws-02-detail-pane-ctx-text.spec.tsx` (6/6) — verified after WB3
- Wave B WB1 `probe-mbtwbfcs-01-frame-c-mount.spec.tsx` (4/4) — verified after WB4

Total cumulative: 22 consumer probes + 6 own probes = 28 probes / 100% GREEN at all WB verification cycles.

---

## VIII — WB skip rationale

- **WB12 (CONDITIONAL — Sub-Q-F=(β) selection persistence):** SKIPPED. Operator-acked Sub-Q-F=(α) "keep selection persistence deferred" per 2026-05-12 dispatch. Per ticket body §4 WB12, the WB is explicitly CONDITIONAL on (β); (α) default ships without it. Wave B Sub-Q-MBTWBFCS-A=α renderer-only selection state remains unchanged.

---

## IX — New followups filed

Two Tier 3 rows to append to `docs/FOLLOWUPS.md`:

1. `MB-F-FRAME-C-FILTER-STATE-NOT-PERSISTED-2026-05-12` (described in §III.B)
2. `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` (described in §III.B)

Plus closure stamp on existing row:
- `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` (FOLLOWUPS.md:327) → CLOSED at `a8cd71d` WB4 GREEN

---

## X — Open items

1. **Runtime-launch smoke (CLAUDE.md §4.6 + dispatch §3.5 visual-comparison gate):** NOT executed by T1 sub-session — requires interactive electron display + operator visual verification. Build verified clean (`pnpm --filter dispatch-workstation build` succeeded; all 4 renderer bundles produced without typecheck/compile errors per WB-final pre-commit verification). **HALT-WB-FINAL-PRE-COMMIT-SMOKE deferred to operator-manual screenshot pass per dispatch §3.5 fallback (T6 headless pipeline γ Tier 2 deferred).** Operator action requested: run `pnpm --filter dispatch-workstation exec electron dist/main/main.js`; observe Frame C SessionList populates real sessions when ≥1 spawned + model badge renders per s.model + status color renders per s.status + uptime ticks HH:MM + filter dropdowns gate visible rows + Clear restores all + selection still works.

2. **5-package typecheck (CLAUDE.md §4.4):** workstation build succeeded, implying workstation-side typecheck clean. Cross-package typecheck (dispatch-core / dispatch-daemon / dispatch-cli / dispatch-web) NOT explicitly run by T1 sub-session — no cross-package contract surface touched by T1 (zero §6 amendment), so cross-package regression risk is low. Operator may run if desired.

3. **Audit doc reclassification stamps (§III.A above):** authored as candidates here; not directly edited into audit doc per CLAUDE.md §1 frozen-contract framing for audit-doc evolution. Operator-arbitrated edit.

4. **Tier 3 follow-on cycles** for the two new filings + the inherited row-271 gap remain available for future scoping.
