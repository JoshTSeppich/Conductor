# MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE — WB-final findings

**Session:** r12-mvp-w1-orchestrator-focus-pane (gen-7 V4 cascade Wave R12-MVP-Wave-1)
**Dispatch authorization:** operator OPTION (B) AUTHORIZED at ~17:35 MDT 2026-05-17
**Date:** 2026-05-17 ~20:00 MDT
**Author:** Claude Opus 4.7 (CC sub-session)

---

## §I — Scope shipped

**One-liner (verbatim from manifest):** NEW dedicated `src/orchestrator-focus-pane/` consumer of EXISTING `pty-stream-relay` broadcast bound to `__orchestrator_active`; large bordered view ~60% width with header (pid/uptime/cpu/budget anchors) + xterm-style streaming body + build.md filename/total/queued/running/done step counters.

**Component 1** of the operator-vision 23b4362 five-component decomposition (§Component 1 — orchestrator-focus-pane). Reuses existing Component 5 (live tmux output streaming primitive) without duplication.

### Files shipped (7 NEW + 2 EDIT)

| Path | Type | Lines | Purpose |
|------|------|------:|---------|
| `packages/dispatch-workstation/src/orchestrator-focus-pane/focus-pane.tsx` | NEW | ~80 | React component; overlay layout + adapter bridge + header integration |
| `packages/dispatch-workstation/src/orchestrator-focus-pane/focus-pane-header.tsx` | NEW | ~95 | Header chrome with 9 testid anchors (pid/uptime/cpu/budget + filename/total/queued/running/done) |
| `packages/dispatch-workstation/src/orchestrator-focus-pane/focus-pane-ipc.ts` | NEW | ~60 | Renderer-side PtyChunkBridge + consumePtyChunkStream + getDefaultPtyChunkBridge factory |
| `packages/dispatch-workstation/src/orchestrator-focus-pane/index.ts` | NEW | 4 | Public surface re-exports |
| `packages/dispatch-workstation/src/orchestrator-focus-pane/mount.ts` | NEW | ~115 | Renderer auto-mount entry + lazy xterm adapter factory + DOMContentLoaded entry |
| `packages/dispatch-workstation/scripts/build-orchestrator-focus-pane.mjs` | NEW | ~40 | esbuild config (mirrors build-tile-grid.mjs) |
| `packages/dispatch-workstation/src/main/main.ts` | EDIT | +29 | Sentinel zone insert (`=== BEGIN: MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE mount ===` lines 1152-1180) |
| `packages/dispatch-workstation/tsconfig.json` | EDIT | +1 token | Append `"src/orchestrator-focus-pane"` to exclude list (gen-7 HALT-1 amendment) |
| `packages/dispatch-workstation/src/main/workstation-shell.html` | EDIT | +9 lines | Append `<script src="../orchestrator-focus-pane/renderer.js" defer></script>` before `</body>` (gen-7 HALT-1 amendment) |

### Test probes shipped (5 unit + 1 integration; 51 tests total — all PASS)

| Probe | Tests | Coverage |
|-------|------:|----------|
| `test/unit/orchestrator-focus-pane/probe-mbt-mvp-w1-01-focus-pane-mounts.spec.tsx` | 6 | Component mounts + adapter open/dispose lifecycle |
| `test/unit/orchestrator-focus-pane/probe-mbt-mvp-w1-02-ipc-consumer-pty-chunk.spec.ts` | 8 | Consumer subscribe/forward/dispose + factory null-guards |
| `test/unit/orchestrator-focus-pane/probe-mbt-mvp-w1-03-header-pid-uptime-cpu-budget.spec.tsx` | 11 | Header anchors + uptime live + reactivity |
| `test/unit/orchestrator-focus-pane/probe-mbt-mvp-w1-04-layout-60pct-width.spec.tsx` | 9 | Overlay layout + containment + spawnedAtMs pass-through |
| `test/unit/orchestrator-focus-pane/probe-mbt-mvp-w1-05-step-counters.spec.tsx` | 12 | filename/total/queued live + running/done placeholders |
| `test/integration/probe-mbt-mvp-w1-06-orchestrator-focus-pane-e2e.test.ts` | 5 | E2E pipeline: broadcaster → registerPtyRelay (REAL) → bridge → consumer → adapter |

---

## §II — Phase-1 diagnose findings

**Agent invocation:** `cairn-phase-1-diagnose` agentId `a2483da4fd7ede4ea` (50k token budget per operator ack for >3 WB scope).

**Arbitration questions raised and resolved:**

| Q | Question | Disposition | Outcome |
|---|----------|-------------|---------|
| Q1 | IPC channel reuse vs new | (a) reuse `coarchitect:ptyChunk` | NO new IPC channel; NO WORKSTATION_CONTRACT.md §6 amendment |
| Q2 | terminal-adapter.ts reuse | (a) reuse-as-is | Single import; no wrapper |
| Q3 | Header anchors data source | (a) ship uptime live; pid/cpu/budget placeholder | filename/total/queued live; pid/cpu/budget em-dash |
| Q4 | Step counters data source | (a) ship filename/total/queued; running/done placeholder | Tier-2 followup filed blocked-by MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING |
| Q5 | main.ts sentinel location | (a) after MB-T17 line 1150 | Inserted in mount-cluster (MB-T12→T16→T17→MVP-W1) |
| Q6 | ~60% width layout | (c) fixed-position overlay | width:60vw, position:fixed, no shell.html flex integration needed initially |
| Q7 | Mount pattern | (a) shared window auto-mount | mount.ts creates body-level div; shell.html `<script>` tag added at HALT-1 |
| Q-AC | Acceptance criteria | (a) per-probe acceptance | 51/51 tests PASS |

**Risks raised and dispositions:**

| R | Risk | Disposition |
|---|------|-------------|
| R1 | package.json build chain READ-ONLY | DEFER (filed MB-F-MVP-W1-BUILD-SCRIPT-CHAIN-WIRING-PENDING Tier-2) |
| R2 | coarchitect:ptyChunk channel-doc gap | Tier-2 followup filed (MB-F-COARCHITECT-PTYCHUNK-CHANNEL-DOCUMENTATION) |
| R3 | workstation-shell.html READ-ONLY | RESOLVED at gen-7 HALT-1 ack — territory amendment granted |
| R4 | running/done count not derivable | DEFER (blocked-by MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING) |
| R5 | dispatch-core dist rebuild | N/A — no dispatch-core imports added by Wave-1 |
| R6 | Pre-existing test flakes | N/A — orthogonal to focus-pane territory |
| R7 | shell flex layout conflict | RESOLVED by Q6=(c) overlay strategy |

---

## §III — Cross-wave findings closed by this ticket

### MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING (Tier-1; filed by Wave-2)

**Mechanism:** WB1 GREEN commit `a904bdb` introduced `src/orchestrator-focus-pane/focus-pane.tsx` without adding the directory to `tsconfig.json` exclude list. tsconfig.json does NOT enable `jsx` at compiler-options level — it excludes every renderer-side `.tsx` file individually (or by directory: `src/chat-shell`, `src/frame-c`). Workstation typecheck failed with TS17004 against every `.tsx` line of `focus-pane.tsx` + `focus-pane-header.tsx` (and TS6142 on `.ts` files importing them).

**Closure:** tsconfig amendment landed at WB-final commit (this ticket). One-token append `"src/orchestrator-focus-pane"` to exclude list — mirrors existing `"src/chat-shell"` + `"src/frame-c"` exclusion pattern. `pnpm --filter dispatch-workstation typecheck` CLEAN [KNOWN — 19:55 MDT].

**Authority:** gen-7 V4 §C(VIII) coarch-authority + CLAUDE.md §3.4 mechanical-translation envelope ack 19:50 MDT.

---

## §IV — Followup rows filed (new at this WB-final)

| Row | Tier | Closure path |
|-----|------|--------------|
| `MB-F-ORCHESTRATOR-MANIFEST-PATH-VERIFICATION-PRE-DISPATCH` | Tier-2 | orchestrators run `git ls-files` glob-match against manifest territory before dispatch; analogous to gen-6 §1.2 stale-dispatch pre-check |
| `MB-F-MVP-W1-HEADER-PID-CPU-BUDGET-WIRING` | Tier-2 | new IPC channel sourced from orchestrator-process metrics OR PTY-scrape (mirrors MB-T15 closure path); WORKSTATION_CONTRACT.md §6 amendment likely required |
| `MB-F-MVP-W1-STEP-COUNTERS-RUNNING-DONE-AWAIT-WAVE-4-PRODUCTION-WIRING` | Tier-2 | blocked-by MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING (row 351); when that resolves, dispatch-loop tick result becomes broadcastable to renderer; running/done counters move from placeholder to live |
| `MB-F-MVP-W1-BUILD-SCRIPT-CHAIN-WIRING-PENDING` | Tier-2 | append `node scripts/build-orchestrator-focus-pane.mjs` to package.json `build` script chain; mirrors tile-grid/console-panel/chat-shell precedent; trivial diff but requires package.json territory grant |
| `MB-F-COARCHITECT-PTYCHUNK-CHANNEL-DOCUMENTATION` | Tier-2 | document `coarchitect:ptyChunk` + `coarchitect:ptyTurnDone` channels in WORKSTATION_CONTRACT.md §6; both emitted by pty-stream-relay.ts but not in §6 channel inventory |

### Resolved-at-ship (no row filed per gen-7 HALT-1 ack)

- `MB-F-MVP-W1-PRODUCTION-MOUNT-WIRING-PENDING-SHELL-HTML-AMENDMENT` — proposed at HALT-1, RESOLVED by shell.html amendment at this WB-final commit.

---

## §V — Design-conformance gap inventory (per operator-amendment 19:20 MDT)

Per `docs/coordination/conductor-v-mvp-design-audit-2026-05-17.md` §5.6, the operator-vision design bundle (`docs/design-handoff/conductor-v-mvp/project/{orchestrator-strip.jsx, tmux-pane.jsx, tmux-content.jsx}`) specifies visual details NOT covered by WB1-WB7 scope:

| Design element | Bundle anchor | Current state | Gap class |
|----------------|---------------|---------------|-----------|
| ASCII banner box (`ORCH_BANNER`) | `tmux-content.jsx:163-170` | NOT rendered | Visual chrome — deferred to operator-acked next-cycle EXPANSION-1 |
| Line-class colors (`sys/ok/warn/err/banner`) | `tmux-pane.jsx:5-11` `TMUX_COLORS` | xterm renders raw text without per-class color mapping | Visual chrome — next-cycle |
| `cwd $ █` blinking cursor when status=running | `tmux-pane.jsx:92-97` | NOT rendered | Visual chrome — next-cycle |
| `paneIn` / `paneOut` keyframe animations | `Conductor V_MVP.html:458-466` | NOT animated (static overlay) | Visual chrome — next-cycle |
| 24px titlebar with status dot + name + cmd | `tmux-pane.jsx:48-77` | Header renders 9 anchors as inline spans; layout/styling not yet matched to design | Visual chrome — next-cycle |
| IBM Plex Mono 13px body + 1.55 line-height | `Conductor V_MVP.html` body styles | xterm-rendered (different font) | Visual chrome — next-cycle |
| OrchestratorStrip (segmented progress bar + 64-slot grid + rate/ETA) | `orchestrator-strip.jsx` | SEPARATE component; NOT shipped at all in Wave-1 | Sibling-component — operator GRANTED next-cycle EXPANSION-1 |

Per operator-amendment 19:50 MDT: W1 territory expanded for NEXT CYCLE (topbar + orchestrator-strip + TmuxPane body styling). This WB-final scope is unchanged — Wave-1 ships the MVP-renderable surface; design polish + sibling components land in EXPANSION-1.

---

## §VI — Verification record

| Check | Result | Source |
|-------|--------|--------|
| 51/51 unit + integration probes PASS | [KNOWN] | `pnpm --filter dispatch-workstation test test/unit/orchestrator-focus-pane/ test/integration/probe-mbt-mvp-w1-06-orchestrator-focus-pane-e2e.test.ts` at 19:55 MDT |
| dispatch-core typecheck CLEAN | [KNOWN] | `pnpm --filter dispatch-core typecheck` 19:55 |
| dispatch-daemon typecheck CLEAN | [KNOWN] | `pnpm --filter dispatch-daemon typecheck` 19:55 |
| dispatch-workstation typecheck CLEAN | [KNOWN] | `pnpm --filter dispatch-workstation typecheck` 19:55 (after tsconfig amendment) |
| dispatch-cli typecheck CLEAN | [KNOWN] | `pnpm --filter dispatch-cli typecheck` 19:55 |
| dispatch-web typecheck CLEAN | [KNOWN] | `pnpm --filter dispatch-web typecheck` 19:55 |
| Workstation build CLEAN (tsc + esbuild chain) | [KNOWN] | `pnpm --filter dispatch-workstation build` emits dist/main/main.js with `MB-T-MVP-W1` sentinel block × 4 occurrences |
| Focus-pane bundle built (1.5mb) | [KNOWN] | `node packages/dispatch-workstation/scripts/build-orchestrator-focus-pane.mjs` → `dist/orchestrator-focus-pane/renderer.js` |
| Runtime smoke: WINDOW_READY < 10s | [KNOWN] | Electron launch + grep `WINDOW_READY` in stdout at 19:50 MDT |
| Runtime smoke: FOCUS_PANE_IPC_READY emitted | [KNOWN] | Same launch — sentinel fires from new main.ts block lines 1178-1180 |
| No ERR_MODULE_NOT_FOUND in runtime | [KNOWN] | No ERR_MODULE_NOT_FOUND in stdout |
| Pre-existing kanban-webview MIME-type renderer error | Pre-existing (orthogonal); MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE class | Not introduced by Wave-1 |

---

## §VII — Pattern observations

### §VII.1 Per-path commit discipline catches cross-session staging leaks (re-confirmed)

Wave-2 ran in parallel for the entire duration of this session. At multiple points during Wave-1, `git status --short` showed Wave-2's untracked files (probe-03 + probe-04 + decisions/findings docs). Per-path `git add <pathspec>` + `git commit -o <pathspec>` discipline kept every Wave-1 commit cleanly scoped. Re-validates memory `feedback_per_path_discipline_catches_cross_session_staging_leak`.

### §VII.2 Phase-1 surfacing accelerates HALT-acks

Phase-1 diagnose surfacing all 7 arbitration questions + 7 risks in a single tabular HALT enabled single-line operator ack ("ACK MVP-W1: Q3=(a) Q4=(a) Q6=(c) Q7=(a) R1=defer R3=unblocked-by-Q6"). Surfacing happened at 17:50 MDT; ack at 17:55 MDT — 5-min round-trip cleared the entire ladder. Single-line ack form scales better than per-question acks.

### §VII.3 Integration probe (WB6) reveals composition health without Electron

The WB6 integration probe replaces the Electron IPC seam (ipcMain.send → ipcRenderer.on) with two collaborating fakes that re-inject `coarchitect:ptyChunk` payloads. This pattern lets the REAL `pty-stream-relay.ts` + REAL `focus-pane-ipc.ts` exercise end-to-end without booting Electron. Worth codifying as a Tier-3 followup pattern recommendation: "When integration probes exercise main↔renderer composition, fake only the ipcMain/ipcRenderer seam and import everything else REAL."

---

## §VIII — Outcome classification (CLAUDE.md §2.11)

**Capability enabled with known limitations.**

- New surface ships: orchestrator-focus-pane visible at runtime via fixed-position overlay.
- Live data: uptime (from spawnedAtMs prop), build.md filename/total/queued (prop-driven via existing IPC).
- Placeholder data: pid/cpu/budget (Tier-2 followup MB-F-MVP-W1-HEADER-PID-CPU-BUDGET-WIRING); running/done (Tier-2 blocked-by MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING).
- Visual chrome deferred to operator-acked next-cycle EXPANSION-1 (banner, line-class colors, cursor, animations, OrchestratorStrip sibling).
