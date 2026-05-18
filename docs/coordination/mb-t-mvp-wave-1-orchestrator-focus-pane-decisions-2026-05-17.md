# MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE — WB-final decisions

**Session:** r12-mvp-w1-orchestrator-focus-pane
**Date:** 2026-05-17

---

## §I — Operator-arbitrated decisions (binding)

### §I.1 Q-MVP-W1-1=(a) — Reuse `coarchitect:ptyChunk` broadcast

**Decision:** Renderer subscribes to existing `coarchitect:ptyChunk` IPC broadcast emitted by `src/main/pty-stream-relay.ts:52`. NO new IPC channel added; NO WORKSTATION_CONTRACT.md §6 amendment required.

**Rationale:** pty-stream-relay already filters chunks for `__orchestrator_active` at line 48 — the renderer receives only orchestrator chunks. Adding a new channel would have required a frozen-contract amendment AND a new main-side controller; reusing avoids both.

**Trade-off accepted:** The focus-pane consumer name is now coupled to the `coarchitect:` namespace. Filed Tier-2 followup `MB-F-COARCHITECT-PTYCHUNK-CHANNEL-DOCUMENTATION` to document the channel in WORKSTATION_CONTRACT.md §6 (channel-doc debt; not a runtime concern).

**Ack source:** operator 17:55 MDT 2026-05-17 + gen-7 V4 §C(VIII) coarch-authority.

### §I.2 Q-MVP-W1-2=(a) — Reuse `terminal-adapter.ts` as-is

**Decision:** Import `TerminalAdapter` interface + `createXtermAdapter` factory from `src/console-panel/terminal-adapter.ts` without wrapping.

**Rationale:** Operator-gen-7 boot prompt §C WB1 verbatim: "reusing terminal-adapter.ts xterm-style streaming primitive (Component 5 EXISTS per discovery; do NOT build new primitive)". Reuse-as-is is the minimum-change path; the interface is renderer-context-pure with no Electron dependencies.

**Implementation:** `mount.ts:defaultLazyTerminalAdapter` mirrors `tile-grid/mount.ts:191-217` `defaultLazyAdapterFactory` pattern — buffers writes pre-mount while the real xterm Terminal asynchronously initializes. Same pattern, same lifecycle.

### §I.3 Q-MVP-W1-3=(a) — Header uptime LIVE; pid/cpu/budget PLACEHOLDER

**Decision:**
- `spawnedAtMs` prop drives the live uptime label (formatUptimeLabel inlined from `tile-grid/tile-header.tsx:77-91` pattern; em-dash for undefined / <1min / clock-skew).
- pid / cpuPercent / tokenBudgetUsd: NO props added at this WB; spans render the em-dash literal unconditionally. Tier-2 followup `MB-F-MVP-W1-HEADER-PID-CPU-BUDGET-WIRING` filed for future wiring.

**Rationale:** Header data sources for pid/cpu/budget would require a NEW main-side metrics IPC channel + WORKSTATION_CONTRACT.md §6 amendment (frozen-contract proximity). Honest partial-chrome with placeholder em-dash beats fabricated zeros OR scope creep into a new IPC channel.

**Ack source:** operator 17:55 MDT.

### §I.4 Q-MVP-W1-4=(a) — Step counters filename/total/queued LIVE; running/done PLACEHOLDER

**Decision:**
- `buildMdFilename` / `buildMdTotal` / `buildMdQueued` props added; renderer sources from `workstation:read-build-md` IPC at production wiring time (consumer-side; not implemented at this WB but prop surface is ready).
- `buildMdTotal` mapped from `BuildMdStatus.taskCount` (`src/build-md/types.ts:30`).
- `buildMdQueued` mapped from `BuildMdStatus.readyCount` (`types.ts:32`) — operator-vision's "queued" = data-model's "ready".
- running / done counters: span renders em-dash unconditionally; NO props added. Tier-2 followup blocked-by `MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING` (row 351 — already filed).

**Rationale:** main.ts:645-663 currently wires STUB dispatch-loop deps (`getCompletedTaskIds: () => new Set()`, `fireSpawn: declined`). Running count cannot be derived until the existing Tier-2 row resolves. Same trade-off as Q3: honest partial > scope creep.

### §I.5 Q-MVP-W1-5=(a) — main.ts sentinel insert location

**Decision:** Inserted AFTER `=== END: MB-T17 autopilot IPC ===` (line 1150) and BEFORE the existing MB-T24 dispatch-mode-IPC relocation comment.

**Rationale:** Lands inside the existing mount-cluster pattern (MB-T12 tile-grid → MB-T16 approval-policy → MB-T17 autopilot → NEW MB-T-MVP-W1). Sentinel-zone partitioning per CLAUDE.md §3.3 preserved — adjacent zones unchanged, new zone bracketed.

### §I.6 Q-MVP-W1-6=(c) — Fixed-position overlay layout

**Decision:** FocusPane root carries inline overlay style:
```ts
{
  position: 'fixed', top: '10vh', left: '5vw',
  width: '60vw', height: '70vh', zIndex: 1000,
  border: '1px solid #333', background: '#0a0a0a',
  color: '#e0e0e0', display: 'flex', flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
}
```

**Rationale:** workstation-shell.html was READ-ONLY at HALT-0 surfacing. Overlay strategy was the only path-disjoint option preserving the single-window vision without amendment. Operator-vision §"REPLACES current tab-strip" makes overlay-obscuring an acceptable trajectory (subsequent waves replace the underlying UI anyway).

**Subsequent ack:** At HALT-1 (19:50 MDT), operator GRANTED shell.html amendment for the `<script>` tag. This means in future EXPANSION-1, the overlay could be promoted to a flex-integrated region IF that's the operator preference. Filing under EXPANSION-1 scope, not Wave-1 closure.

### §I.7 Q-MVP-W1-7=(a) — Shared-window auto-mount

**Decision:** `mount.ts` auto-mounts via DOMContentLoaded handler into a body-level fixed-position div the bundle creates itself (default ID `orchestrator-focus-pane-mount-root`). No separate BrowserWindow.

**Rationale:** Coupled with Q6=(c) overlay; separate BrowserWindow would have violated operator-vision single-window three-pane model.

### §I.8 R1=defer — package.json build script chain wiring

**Decision:** `node scripts/build-orchestrator-focus-pane.mjs` is NOT added to the package.json `build` script chain at this WB-final. Tier-2 followup `MB-F-MVP-W1-BUILD-SCRIPT-CHAIN-WIRING-PENDING` filed.

**Operator workaround at dogfood:** Manually invoke the build script after `pnpm --filter dispatch-workstation build` until the followup lands.

### §I.9 HALT-1 amendments — tsconfig.json + workstation-shell.html

**Decision (gen-7 ack 19:50 MDT, CLAUDE.md §3.4 mechanical-translation envelope):**
- tsconfig.json: append `"src/orchestrator-focus-pane"` to exclude list (mirrors existing `"src/chat-shell"` + `"src/frame-c"` pattern)
- workstation-shell.html: append `<script src="../orchestrator-focus-pane/renderer.js" defer></script>` before `</body>` (mirrors existing `tile-grid/renderer.js` + `chat-shell/renderer.js` + `console-panel/renderer.js` script-tag patterns)

**Closure of cross-wave Tier-1:** `MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING` (filed-by-W2) CLOSED at this WB-final commit. Workstation typecheck CLEAN [KNOWN — 19:55 MDT].

---

## §II — CC-delegable architectural decisions (within CLAUDE.md §3.4 envelope)

### §II.1 FocusPaneHeader testid renamed `-bar` → canonical anchor

**Decision (CC):** WB4 GREEN renamed `data-testid="orchestrator-focus-pane-header-bar"` to `data-testid="orchestrator-focus-pane-header"` on the FocusPaneHeader outer div, so the FocusPane probe-01 `getByTestId('orchestrator-focus-pane-header')` continues to work after WB4 integrates FocusPaneHeader into FocusPane.

**Rationale:** Preserves probe-01 contract; canonical anchor name is cleaner than `-bar` suffix; only `-bar` mention was in the WB3 GREEN code (not in any probe), so no probe churn.

### §II.2 formatUptimeLabel INLINED, not imported

**Decision (CC):** WB3 GREEN inlines the 15-line `formatUptimeLabel` algorithm from `src/tile-grid/tile-header.tsx:77-91` into `focus-pane-header.tsx` rather than importing.

**Rationale:** `tile-grid/tile-header.tsx` does NOT export the function; adding an export would require editing `tile-grid/**` (READ-ONLY per manifest). Duplication of a 15-line pure function is a smaller cost than coupling to tile-grid for a self-contained primitive. Attribution comment retained.

### §II.3 Shared TerminalAdapter between FocusPane and consumer

**Decision (CC):** mount.ts creates a single TerminalAdapter and wires:
- FocusPane via a `passthrough = () => adapter` factory (so FocusPane's useEffect receives the same instance)
- `consumePtyChunkStream(bridge, adapter)` to forward chunk writes to that same adapter

**Rationale:** FocusPane owns open/dispose lifecycle; consumer owns write lifecycle. A single adapter avoids two-adapter coordination overhead. Pattern is self-contained inside mount.ts (the FocusPane component itself sees only the createTerminal factory).

### §II.4 mount.ts auto-mount idempotency

**Decision (CC):** mount.ts checks `document.getElementById(rootId)` first; if absent, creates a new div. This means if the bundle is loaded TWICE (e.g., via accidental double-script-tag), the second invocation reuses the existing root — no double-mount.

**Rationale:** Defensive against future shell.html edits that might inadvertently double-include the script tag. Pattern mirrors tile-grid/mount.ts:151 `if (!root) return { mounted: false, reason: 'no-root' }` lookup pattern (we go further: CREATE if absent).

---

## §III — Outcome (CLAUDE.md §2.11)

**Capability enabled with known limitations.** Component 1 of operator-vision 23b4362 ships at this WB-final with full overlay surface visible at runtime + integration probe verifying broadcast pipeline. Design-conformance polish + sibling OrchestratorStrip deferred to operator-acked next-cycle EXPANSION-1 territory.
