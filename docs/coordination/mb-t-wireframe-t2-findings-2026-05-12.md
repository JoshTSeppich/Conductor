# MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE Findings — Frame C DetailPane live terminal stream + tool indicators + cooking/queue/scroll chrome

**Sub-session:** T2 (sub-session B of orchestrator-2026-05-11-1257 gen-3 Round 9 dispatch)
**Date:** 2026-05-12
**Ticket body anchor:** `30ab109` (committed 2026-05-12 per HALT-TICKET-BODY-PRE-COMMIT ack)
**First RED:** `fcf0c65` (WB1 RED probe-mbtwft2-01-terminal-stream-mount)
**WB2 SPIKE + GREEN:** `d627096` (TerminalStream + spike ADR — OUTCOME 2 from §2.5 spike enumeration)
**Final WB13 smoke:** `143b31d` (WINDOW_READY observed; operator-manual UX validation deferred)
**Outcome (CLAUDE.md §2.11):** No regression; wiring verified; improvement case not exercised (UX validation deferred to operator-manual screenshot per dispatch §3.5 fallback).

---

## I. What Shipped

MB-T-WIREFRAME-T2 ships the Frame C DetailPane right-pane live terminal surface end-to-end (renderer-side; daemon-side PTY-source already existed via CONSOLE-T02 `eac381e` + MB-T40 `5704dd2`):

```
operator selects session in Frame C SessionList
  → FrameCRoot setInternalSelected (frame-c-root.tsx WB6, unchanged)
  → DetailPane mounts (selected !== null gate)
  → DetailPane HYBRID render (Sub-Q-A=ii) — tabs "Live" (default) / "Summary"
    ├── TerminalHeaderBar: <sessionName> @ <branchName> + ctx N% + uptime — + plan —
    ├── Live tab:
    │     ├── ToolIndicatorStrip: parseToolIndicators(chunkBuffer) →
    │     │     Cooking 12m 04s · 4 tools queued (1Hz local tick)
    │     │     + Bash:/Read:/Edit/Write event list (latest 5)
    │     │     + next: <preview> (placeholder, Tier 3 followup)
    │     └── TerminalStream:
    │           ├── consoleBridge.openPanel(targetSessionName) — establishes
    │           │   WS subscription per WB2 SPIKE outcome 2
    │           ├── consoleBridge.onStdoutChunk filter
    │           │   p.sessionName === targetSessionName
    │           ├── adapter.write(chunkBytes) into xterm (or fake)
    │           └── auto-scroll bottom-anchored + operator-pause +
    │               "Auto-scroll paused · Resume" affordance
    └── Summary tab: preserved Wave B WB8 swarm-state.md body
        (display:none toggle, NOT React unmount — xterm scrollback survives)
```

Wiring threaded through: `tile-grid/mount.ts:tryAutoMountFrameC` (Wave B sentinel zone, operator-acked α zone-extension-in-place at HALT-WB12) → `mountFrameC` → `FrameCRoot` → `DetailPane` props → TerminalStream + ToolIndicatorStrip + TerminalHeaderBar.

### Commit chain (chronological, post-ticket-body)

| # | SHA | WB | Subject |
|---|---|---|---|
| 1 | `30ab109` | docs | Authored ticket body per Q-MBTWFT2-A=ii + B=i + C=γ all defaults |
| 2 | `fcf0c65` | WB1 RED | probe-mbtwft2-01-terminal-stream-mount (5/5 RED at import-resolve) |
| 3 | `d627096` | WB2 spike + GREEN | TerminalStream component + spike-ADR (outcome 2: openPanel required on mount) + fixture-maintenance fake openPanel |
| 4 | `c604862` | WB3 RED | probe-mbtwft2-02-header-bar-renders (9/9 RED) |
| 5 | `fc6737f` | WB4 GREEN | TerminalHeaderBar component (Sub-Q-C=γ placeholders) |
| 6 | `35c5533` | WB5 RED | probe-mbtwft2-03-tool-indicator-parser (8/8 RED) |
| 7 | `0914bc6` | WB6 GREEN | tool-indicator-parser pure-fn (Sub-Q-B=i regex set) |
| 8 | `9ff016b` | WB7 RED | probe-mbtwft2-04-tool-indicator-strip (6/6 RED including 1Hz fake-timer) |
| 9 | `85712c2` | WB8 GREEN | tool-indicator-strip + cooking 1Hz tick |
| 10 | `2fb0b5b` | WB9 RED | probe-mbtwft2-05-auto-scroll-pause (4/5 RED + 1 default-state non-regression) |
| 11 | `25dd2c6` | WB10 GREEN | TerminalStream auto-scroll + operator-pause + resume affordance |
| 12 | `4f5a6a4` | WB11 GREEN | DetailPane HYBRID integration (Sub-Q-A=ii tabs Live/Summary) |
| 13 | `f019102` | WB12 GREEN | mount.tsx + frame-c-root.tsx wiring + Wave B sentinel-zone extension |
| 14 | `143b31d` | WB13 smoke | runtime-launch smoke (WINDOW_READY observed; operator-manual UX deferred) |
| 15 | (this) | WB14 docs | findings doc + FOLLOWUPS.md updates + dispatch §1 reclassification |

---

## II. Sub-Q disposition

All three Sub-Qs operator-acked DEFAULTS at HALT-TICKET-BODY-PRE-COMMIT 2026-05-12 + per-HALT confirmations:

| Sub-Q | Resolution | Effect on scope |
|---|---|---|
| Sub-Q-MBTWFT2-A — DetailPane integration mode | (ii) HYBRID tab strip (default Live) | Tab strip shipped at WB11; CSS `display:none` (not unmount) preserves xterm scrollback across tab switches per ticket §8 risk mitigation. Summary tab preserves Wave B swarm-state body (no regression). |
| Sub-Q-MBTWFT2-B — tool-invocation parsing strategy | (i) regex on PTY lines + Tier 2 followup | parseToolIndicators ships at WB6 with 5 regex patterns (Cooking / Bash / Read / Edit / Write). Tier 2 followup MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT filed (this WB). |
| Sub-Q-MBTWFT2-C — header uptime + plan-name data source | (γ) defer with placeholders | TerminalHeaderBar ships `<sessionName> @ <branchName>` + `ctx N%` + literal `uptime —` + literal `plan —`. Tier 2 followup MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH filed (this WB). |

Per-HALT operator confirmations during execution:

| HALT gate | Operator decision | Reference |
|---|---|---|
| HALT-TICKET-BODY-PRE-COMMIT | ACK draft as-is; commit + push | T2 TICKET-BODY ACK 2026-05-12 |
| HALT-WB2-PRE-COMMIT (spike outcome 2; fixture-maintenance fix; single 4-file commit shape) | ACK spike outcome 2 + ADR; ACK in-place fake-console-bridge.ts edit (option b); ACK single-3-file commit shape (option c) | T2 WB2 ACK 2026-05-12 |
| HALT-WB3-PRE-COMMIT (header text convention) | ACK probe as-drafted; commit + push | "ACK probe as-drafted; commit + push WB3 RED" 2026-05-12 |
| HALT-WB12-PRE-COMMIT (tile-grid/mount.ts sentinel-zone-extension scope) | ACK (α) zone-extension in-place; commit + push | "ACK (α) zone-extension in-place; commit + push WB12" 2026-05-12 |

---

## III. Architectural deltas

### III.A — `console:stdout-chunk` lifecycle [KNOWN per spike ADR §2]

WB2 SPIKE source-trace through `ConsoleIpcController` (`packages/dispatch-workstation/src/main/console-ipc.ts:200-368`) established that `console:stdout-chunk` events are emitted ONLY from inside the WebSocket subscription established by `openConsolePanel`. Sole production caller of `openConsolePanel` is the native menu `onOpen` handler at `main.ts:349`.

**Implication:** any renderer surface that wants per-session PTY chunks must invoke `consoleBridge.openPanel(targetSessionName)` on mount. TerminalStream adopts this pattern with try/catch for `PanelAlreadyOpen` + `PanelCapExceeded` (precedent: `main.ts:349-352`).

`coarchitect:ptyChunk` is NOT a viable per-session reuse path — hardcoded to `__orchestrator_active` per `pty-stream-relay.ts:48` (Q-MBT40-2(a)); v3.0 chat-shell legacy.

### III.B — DetailPane HYBRID tab strip + CSS-visibility-toggle pattern

WB11 ships HYBRID tabs with both Live + Summary panels mounted simultaneously, toggled via CSS `display:none`. Rationale (ticket §8 risk register Sub-Q-A=ii mitigation): tab switches must NOT unmount TerminalStream because xterm.js scrollback would be lost. CSS-visibility-toggle preserves DOM textContent for existing probes (Wave B WB7 probe-mbtwbfcs-04 + Wave C #5 probe-mbtwtws-02 both PASS post-WB11).

### III.C — chunk-buffer dual subscription (DetailPane + TerminalStream)

DetailPane and TerminalStream BOTH subscribe to `consoleBridge.onStdoutChunk` for the same selected session — DetailPane to accumulate the parser buffer (16KB cap, truncate from front) for ToolIndicatorStrip; TerminalStream to write to xterm adapter. Both filter by `p.sessionName === selectedSessionName`. Dual subscription is acceptable: both are listener-only; the WS that produces chunks is established once (TerminalStream's `openPanel` call; DetailPane is listener-only).

### III.D — Wave B sentinel-zone extension precedent

`tile-grid/mount.ts:163-194` Wave B `MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB10` zone now contains props-propagation extensions for two sibling tickets: T1's WB4 GREEN (`4414ef9`) for `workstationBridge`; T2's WB12 GREEN (`f019102`) for `consoleBridge` + `createTerminal`. The zone's scope "auto-mount Frame C with the right props" naturally encompasses additive prop propagations per operator-acked HALT-WB12 2026-05-12 + CLAUDE.md §3.3 zone-internal extension permissibility within ticket scope.

---

## IV. Probe distribution

| Probe | WB | Tests | Type |
|---|---|---|---|
| `probe-mbtwft2-01-terminal-stream-mount.spec.tsx` | WB1 | 5 | component render + per-session filter + cleanup |
| `probe-mbtwft2-02-header-bar-renders.spec.tsx` | WB3 | 9 | component render + 5 text-content assertions + 2 edge cases |
| `probe-mbtwft2-03-tool-indicator-parser.spec.ts` | WB5 | 8 | pure-fn parser; Cooking/Bash/Read/Edit/Empty/Mixed/Cooking+events |
| `probe-mbtwft2-04-tool-indicator-strip.spec.tsx` | WB7 | 6 | component render + 1Hz fake-timer tick + nextTool slot + empty-state |
| `probe-mbtwft2-05-auto-scroll-pause.spec.tsx` | WB9 | 5 | scroll-event-driven paused state + resume click |
| **Total** | | **33** | |

All 33 tests PASS at WB14 docs commit time. Consumer non-regression CLEAN: 24 frame-c test files, 129 tests, all PASS at final verification.

---

## V. Architecture notes

### V.A — Fixture-maintenance cross-territory edit (operator-acked)

WB2 GREEN included a single-line additive edit to `test/unit/console-t03/fake-console-bridge.ts` (CONSOLE-T03 fixture directory) adding `openPanel: async () => {}` to the fake. The fake predated the post-Fix-C `openPanel` addition to the production `ConsoleBridge` interface (`console-bridge.ts:67`). Operator-arbitrated at HALT-WB2-PRE-COMMIT (option b: in-place fixture-maintenance addition preferred over T2-local fake fork). Cross-territory rationale: contract-aligning shim brings fake into parity with current production interface. CONSOLE-T03 tests verified non-regressing (38/38 PASS) post-edit.

### V.B — Lazy xterm adapter shim (T2 territory; duplicated from console-panel/mount.ts)

`frame-c/lazy-xterm-adapter.ts` (NEW at WB12) duplicates `console-panel/mount.ts:58-84` `defaultLazyAdapterFactory` (~25 lines). Duplication preserved for territorial separation (CONSOLE-T03 mount.ts territory unchanged). Tier 3 followup MB-F-LAZY-XTERM-ADAPTER-SHARED-EXTRACTION filed (this WB).

### V.C — Backward-compat shim for Wave C #5 ctx-text testid

`terminal-header-bar.tsx` WB11 edit added `data-testid="frame-c-detail-pane-ctx-text"` to the ctx pill span as a backward-compat shim so Wave C #5 probe-mbtwtws-02-detail-pane-ctx-text continues to pass. When TerminalHeaderBar replaces the legacy meta-row inside DetailPane, the testid moves to the header without consumer-probe regression.

---

## VI. Documentation drift

None observed. CLAUDE.md §1 frozen surfaces (REGISTRY.md §2, CONDUCTOR_API_CONTRACT.md, dispatch-core/src/v3/schema.ts §1-§13, WORKSTATION_CONTRACT.md §6) unchanged. Default Sub-Q resolutions (A=ii / B=i / C=γ) avoided all amendment paths.

---

## VII. Consumer non-regression

Final probe-suite snapshot at WB13 smoke verification (HEAD `f019102`):

- `pnpm --filter dispatch-workstation typecheck`: CLEAN.
- `pnpm --filter dispatch-workstation exec vitest run test/unit/frame-c/`: 24 files / 129 tests PASS.
- `pnpm --filter dispatch-workstation exec vitest run test/unit/console-t03/` (post-fake-console-bridge edit): 15 files / 38 tests PASS.

Specifically verified non-regressing:
- Wave B WB7 probe-mbtwbfcs-04-detail-pane-renders (4 tests): swarm-state body still renders inside Summary panel; textContent assertions pass because `display:none` does NOT exclude text from textContent.
- Wave C #5 probe-mbtwtws-02-detail-pane-ctx-text (5 tests): testid moved to TerminalHeaderBar's ctx span; queryByTestId still finds it as a descendant of `frame-c-detail-pane`.
- T1 WB10 uptime-format integration probes: all PASS.
- T3 WB-final action-bar probes: all PASS (ActionBar at DETAIL_PANE_FOOTER preserved).
- CONSOLE-T03 38 tests: PASS post fake-console-bridge.ts `openPanel` addition.

---

## VIII. WB Skip Rationale

No WBs skipped. All 14 WBs from the ticket §4 ladder executed, including:
- WB2 SPIKE (CLAUDE.md §2.8 internal-code spike via source-trace).
- WB11 + WB12 had no separate RED probes (per ticket §4 — exercised by consumer non-regression + WB13 smoke); the existing probe suite covered the integration.
- WB13 smoke ran the build + electron launch + WINDOW_READY observation; operator-manual UX validation deferred per dispatch §3.5 fallback.

---

## IX. New Followups Filed

Filed this WB14 commit:

| ID | Tier | Source |
|---|---|---|
| `MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT` | Tier 2 | Sub-Q-B=(i) operator-acked regex on PTY lines (vs. structured CC events); migration when CC offers machine-readable surface |
| `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH` | Tier 2 | Sub-Q-C=(γ) operator-acked defer-with-placeholders; closure path is TileGridSessionEntry extension with `spawnedAt` + `plan` from daemon session-meta or new IPC |
| `MB-F-T2-NEXT-TOOL-PREVIEW-FIXTURE-MISSING` | Tier 3 | WB6 GREEN deferred nextTool regex pending operator-verifiable CC fixture |
| `MB-F-T2-PANEL-CAP-AWARE-UX` | Tier 3 | ADR §3.3 — when operator selects N sessions and panel cap M<N, (N-M+1)st selection fails openPanel silently; UX surface deferred |
| `MB-F-LAZY-XTERM-ADAPTER-SHARED-EXTRACTION` | Tier 3 | WB12 GREEN duplicated console-panel/mount.ts:58-84 lazy-shim ~25 lines for territorial separation; closure path is shared util extraction if minify-induced consolidation desired |
| `MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW` | Tier 1 | WB2 commit cycle index-rewrite incident; dispatch §5.4 stress regime Tier 1 by default in Round 9 |

---

## X. Open Items

### X.A — Operator-manual UX validation per dispatch §3.5 fallback

WB13 runtime smoke verified WINDOW_READY + electron-launch-without-crash. The following per-ticket WB13 acceptance items require operator-side interactive verification (deferred per dispatch §3.5 visual-comparison gate fallback until T6 headless screenshot pipeline ships):

1. SessionList row click → DetailPane mount with TerminalHeaderBar visible.
2. TerminalHeaderBar `<sessionName> @ <branchName>` + `ctx N%` rendering for real spawned session.
3. ToolIndicatorStrip population from real CC stdout patterns.
4. TerminalStream live PTY chunks rendering via xterm.js (production adapter).
5. Sub-Q-A=ii HYBRID tab Live/Summary toggle preserving xterm scrollback.
6. Scroll-pause UX (Auto-scroll paused · Resume affordance).

### X.B — Tier 2 followups requiring follow-on tickets

- `MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT`: closure path = migrate to structured CC events when CC SDK exposes them (e.g., `--output-format=jsonl` or hook surface).
- `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH`: closure path = extend `TileGridSessionEntry` with `spawnedAt` + `plan` from daemon session-meta. Cross-references T1's `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` (Tier 3, similar shape) — may consolidate.

### X.C — Tier 1 stress-regime followup

`MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW` (Tier 1 per dispatch §5.4 Round 9 stress regime). Closure path: T6 methodology infrastructure or separate per-session-worktree migration. Documented at WB2 commit body `d627096`.

---

## XI. Dispatch §1 reclassification

Per ticket §4 WB14:

| Dispatch §1 right-pane element | Pre-T2 status | Post-T2 status |
|---|---|---|
| Live PTY stream (DetailPane body) | NOT SHIPPED | SHIPPED (HYBRID Live tab; Sub-Q-A=ii) |
| Header bar `<branch> @ <branch>` | NOT SHIPPED | SHIPPED (`<sessionName> @ <branchName>` per HALT-WB3 ack) |
| Header bar ctx N% | PARTIAL (Wave B WB7) | SHIPPED (moved into TerminalHeaderBar with backward-compat testid) |
| Header bar uptime | NOT SHIPPED | PARTIAL — placeholder `uptime —` (Sub-Q-C=γ; Tier 2 followup MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH) |
| Header bar plan | NOT SHIPPED | PARTIAL — placeholder `plan —` (Sub-Q-C=γ; same followup) |
| Tool invocation indicators (Cooking, Bash, Read, Edit) | NOT SHIPPED | SHIPPED via parseToolIndicators (Sub-Q-B=i regex) + ToolIndicatorStrip |
| Cooking timer + tool-queue counter | NOT SHIPPED | SHIPPED with 1Hz client-side tick |
| Auto-scroll with operator-pause | NOT SHIPPED | SHIPPED with PAUSED_TOLERANCE_PX=4 + Resume affordance |
| "next tool" preview line | NOT SHIPPED | PARTIAL — slot rendered; parser returns null until fixture (Tier 3 MB-F-T2-NEXT-TOOL-PREVIEW-FIXTURE-MISSING) |
| Bottom action bar (kill/diff/merge/focus) | T3 territory | NOT IN T2 SCOPE (T3 closed WB9 findings doc `bae1b97`) |
| `bypass-perms` indicator + `dispatch-workstation` source label | T3 territory | NOT IN T2 SCOPE |

**Right-pane Body: SHIPPED** (all 6 sub-items: live tail, indicators, cooking, queue, scroll, next-preview-slot).

**Right-pane Header bar: PARTIAL** (branch + ctx ship; uptime + plan placeholder per Sub-Q-C=γ Tier 2 followup).
