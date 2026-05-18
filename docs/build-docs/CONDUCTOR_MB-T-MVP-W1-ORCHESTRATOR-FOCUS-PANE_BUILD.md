# CONDUCTOR — MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE — build doc

**Ticket:** MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE
**Component:** operator-vision 23b4362 §Component 1 — orchestrator-focus-pane
**Status:** SHIPPED 2026-05-17 (WB1-WB7 + WB-final)
**Session:** r12-mvp-w1-orchestrator-focus-pane

---

## §1 — Scope

NEW dedicated `packages/dispatch-workstation/src/orchestrator-focus-pane/` consumer of EXISTING `pty-stream-relay` broadcast bound to `__orchestrator_active`; large bordered fixed-position overlay (~60% viewport width) with header chrome (pid/uptime/cpu/budget anchors) + xterm-style streaming body + build.md filename/total/queued/running/done step counters.

---

## §2 — WB ladder (7 WB + WB-final)

| WB | Subject | Probe | RED commit | GREEN commit |
|----|---------|-------|------------|--------------|
| WB1 | focus-pane.tsx mount + adapter-bridge | probe-01 (6 tests) | `701a1dc` | `a904bdb` |
| WB2 | focus-pane-ipc.ts renderer-side consumer | probe-02 (8 tests) | `8697d09` | `ec0b6a2` |
| WB3 | focus-pane-header.tsx chrome (uptime + placeholders) | probe-03 (11 tests) | `dbac379` | `94aea81` |
| WB4 | overlay layout + FocusPaneHeader integration | probe-04 (9 tests) | `0ba31a3` | `da80420` |
| WB5 | build.md step counters | probe-05 (12 tests) | `79e2cd2` | `1c9e183` |
| WB6 | e2e broadcast pipeline integration | probe-06 (5 tests) | — | `483dd64` (RED-implicit) |
| WB7 | production wiring (mount.ts + esbuild + main.ts sentinel) | runtime smoke | — | `deeddf9` |
| WB-final | amendments + closure docs + FOLLOWUPS | — | — | _(this commit)_ |

---

## §3 — Architecture

```
                  ┌───────────────────────────────────┐
                  │  __orchestrator_active session    │
                  │  (tmux PTY stdout)                │
                  └─────────────────┬─────────────────┘
                                    │
                                    ▼
                  ┌───────────────────────────────────┐
                  │  ConsoleIpcController             │
                  │  addStdoutObserver (existing)     │
                  └─────────────────┬─────────────────┘
                                    │
                                    ▼
                  ┌───────────────────────────────────┐
                  │  src/main/pty-stream-relay.ts     │
                  │  registerPtyRelay                 │
                  │  filter: sessionName ===          │
                  │          '__orchestrator_active'  │
                  │  emit: 'coarchitect:ptyChunk'     │
                  └─────────────────┬─────────────────┘
                                    │  ipcMain.send
                                    ▼
                  ┌───────────────────────────────────┐
                  │  src/main/preload.mts             │
                  │  coarchitectBridge.onStreamChunk  │
                  │  (existing surface; reused)       │
                  └─────────────────┬─────────────────┘
                                    │  ipcRenderer.on
                                    ▼
       ╔════════════════════════════════════════════════════╗
       ║  NEW: src/orchestrator-focus-pane/                 ║
       ║                                                    ║
       ║  ┌──────────────────────────────────────────────┐  ║
       ║  │  focus-pane-ipc.ts                           │  ║
       ║  │  getDefaultPtyChunkBridge() wraps            │  ║
       ║  │  coarchitectBridge.onStreamChunk into        │  ║
       ║  │  PtyChunkBridge interface                    │  ║
       ║  │  consumePtyChunkStream(bridge, target)       │  ║
       ║  └──────────────────┬───────────────────────────┘  ║
       ║                     │                              ║
       ║                     ▼                              ║
       ║  ┌──────────────────────────────────────────────┐  ║
       ║  │  mount.ts                                    │  ║
       ║  │  tryAutoMountOrchestratorFocusPane:          │  ║
       ║  │    - creates body-level overlay div          │  ║
       ║  │    - creates ONE TerminalAdapter (xterm)     │  ║
       ║  │    - renders <FocusPane                      │  ║
       ║  │            createTerminal=passthrough        │  ║
       ║  │            spawnedAtMs=opts.spawnedAtMs />   │  ║
       ║  │    - wires consumer to write into adapter    │  ║
       ║  └──────────────────┬───────────────────────────┘  ║
       ║                     │                              ║
       ║                     ▼                              ║
       ║  ┌──────────────────────────────────────────────┐  ║
       ║  │  focus-pane.tsx                              │  ║
       ║  │  <FocusPane>                                 │  ║
       ║  │    overlay style: position:fixed,            │  ║
       ║  │      width:60vw, height:70vh, zIndex:1000    │  ║
       ║  │    <FocusPaneHeader spawnedAtMs nowMs        │  ║
       ║  │      buildMdFilename buildMdTotal            │  ║
       ║  │      buildMdQueued />                        │  ║
       ║  │    <body div ref={bodyRef}                   │  ║
       ║  │      data-testid="orchestrator-focus-pane-   │  ║
       ║  │                   body" />                   │  ║
       ║  │  on mount: adapter.open(bodyRef.current)     │  ║
       ║  │  on unmount: adapter.dispose()               │  ║
       ║  └──────────────────────────────────────────────┘  ║
       ╚════════════════════════════════════════════════════╝
                              │
                              ▼
       ┌───────────────────────────────────────────────────┐
       │  EXISTING: src/console-panel/terminal-adapter.ts  │
       │  createXtermAdapter() → @xterm/xterm Terminal     │
       │  TerminalAdapter { open, write, dispose }         │
       └───────────────────────────────────────────────────┘
```

---

## §4 — Public API

### `FocusPaneProps`

```ts
export interface FocusPaneProps {
  createTerminal: () => TerminalAdapter;
  spawnedAtMs?: number;
  nowMs?: number;
}
```

### `FocusPaneHeaderProps`

```ts
export interface FocusPaneHeaderProps {
  spawnedAtMs?: number;
  nowMs?: number;
  buildMdFilename?: string;
  buildMdTotal?: number;
  buildMdQueued?: number;
}
```

### `PtyChunkBridge`

```ts
export interface PtyChunkBridge {
  onPtyChunk(cb: (chunk: string) => void): () => void;
}
```

### Helpers

```ts
function consumePtyChunkStream(
  bridge: PtyChunkBridge,
  target: { write(chunk: string): void },
): () => void;

function getDefaultPtyChunkBridge(): PtyChunkBridge | null;

function tryAutoMountOrchestratorFocusPane(
  opts?: FocusPaneMountOptions,
): FocusPaneMountResult;
```

---

## §5 — Stable testid contract

| Anchor | Purpose | Renders |
|--------|---------|---------|
| `orchestrator-focus-pane-root` | Overlay root div | structural sentinel |
| `orchestrator-focus-pane-header` | Header chrome wrapper | structural sentinel |
| `orchestrator-focus-pane-body` | xterm mount target | adapter.open(this) |
| `orchestrator-focus-pane-header-pid` | pid metric | em-dash (Tier-2 followup) |
| `orchestrator-focus-pane-header-uptime` | uptime label | live derived from spawnedAtMs |
| `orchestrator-focus-pane-header-cpu` | cpu % | em-dash (Tier-2 followup) |
| `orchestrator-focus-pane-header-budget` | $ budget | em-dash (Tier-2 followup) |
| `orchestrator-focus-pane-header-filename` | build.md filename | live prop |
| `orchestrator-focus-pane-header-total` | build.md task count | live prop |
| `orchestrator-focus-pane-header-queued` | build.md ready count | live prop |
| `orchestrator-focus-pane-header-running` | build.md running count | em-dash (blocked-by Tier-2 row 351) |
| `orchestrator-focus-pane-header-done` | build.md done count | em-dash (blocked-by Tier-2 row 351) |

---

## §6 — Production wiring

### §6.1 Bundle loader

`packages/dispatch-workstation/src/main/workstation-shell.html` line 795 (added at WB-final HALT-1 amendment):

```html
<script src="../orchestrator-focus-pane/renderer.js" defer></script>
```

Mirrors existing `tile-grid/renderer.js` + `chat-shell/renderer.js` + `console-panel/renderer.js` script-tag patterns.

### §6.2 Bundle build

```bash
node packages/dispatch-workstation/scripts/build-orchestrator-focus-pane.mjs
# emits dist/orchestrator-focus-pane/renderer.js (~1.5MB)
```

NOT yet in package.json `build` chain (R1=defer ack; Tier-2 followup `MB-F-MVP-W1-BUILD-SCRIPT-CHAIN-WIRING-PENDING`). Operator manually invokes post-build until followup lands.

### §6.3 main.ts sentinel zone

```typescript
// === BEGIN: MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE mount ===
//   (lines 1152-1180 in src/main/main.ts)
// 
// Q-MVP-W1-1=(a) ack: NO new IPC handler. Renderer reuses
// existing 'coarchitect:ptyChunk' broadcast.
//
// Smoke-harness sentinel emits FOCUS_PANE_IPC_READY on MB_TEST_HOOKS=1.
// === END: MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE mount ===
```

### §6.4 tsconfig.json amendment

`packages/dispatch-workstation/tsconfig.json` exclude list appended with `"src/orchestrator-focus-pane"` (mirrors existing `"src/chat-shell"` + `"src/frame-c"` pattern). Closes cross-wave Tier-1 finding `MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING`.

---

## §7 — Followup rows (open)

| Row | Tier | Anchor |
|-----|------|--------|
| `MB-F-MVP-W1-HEADER-PID-CPU-BUDGET-WIRING` | Tier-2 | Q3=(a); placeholder→live transition |
| `MB-F-MVP-W1-STEP-COUNTERS-RUNNING-DONE-AWAIT-WAVE-4-PRODUCTION-WIRING` | Tier-2 | Q4=(a); blocked-by row 351 |
| `MB-F-MVP-W1-BUILD-SCRIPT-CHAIN-WIRING-PENDING` | Tier-2 | R1=defer; package.json amendment |
| `MB-F-COARCHITECT-PTYCHUNK-CHANNEL-DOCUMENTATION` | Tier-2 | R2; WORKSTATION_CONTRACT.md §6 inventory |
| `MB-F-ORCHESTRATOR-MANIFEST-PATH-VERIFICATION-PRE-DISPATCH` | Tier-2 | gen-7 SITREP-3 methodology gap |

### Closed at this WB-final

- `MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING` (Tier-1; filed-by-W2) — closed by tsconfig amendment.
- `MB-F-MVP-W1-PRODUCTION-MOUNT-WIRING-PENDING-SHELL-HTML-AMENDMENT` — resolved-at-ship per gen-7 ack; not filed as OPEN row.

---

## §8 — Verification

- Unit + integration: 51/51 tests PASS (`pnpm --filter dispatch-workstation test test/unit/orchestrator-focus-pane/ test/integration/probe-mbt-mvp-w1-06-orchestrator-focus-pane-e2e.test.ts`)
- 5-package typecheck CLEAN (dispatch-core, dispatch-daemon, dispatch-workstation, dispatch-cli, dispatch-web)
- Workstation build CLEAN
- Focus-pane bundle built (1.5MB)
- Runtime smoke: WINDOW_READY + FOCUS_PANE_IPC_READY observed in stdout within 10s of `electron dist/main/main.js` launch; no ERR_MODULE_NOT_FOUND class bugs

---

## §9 — Next-cycle EXPANSION-1 (operator GRANTED 19:50 MDT 2026-05-17)

This session is recyclable for EXPANSION-1 work at next-startup:
- Topbar (brand + version pill + N panes · M running counts + budget meter)
- OrchestratorStrip (segmented progress bar + 64-slot grid + rate/ETA stats per `docs/design-handoff/conductor-v-mvp/project/orchestrator-strip.jsx`)
- TmuxPane body styling design-conformance (ASCII banner, line-class colors, blinking cursor, paneIn/paneOut animations, IBM Plex Mono body per `tmux-pane.jsx` + `Conductor V_MVP.html`)
