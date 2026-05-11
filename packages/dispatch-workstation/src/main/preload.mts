import { contextBridge, ipcRenderer } from 'electron';
import { makeConsoleBridge, type ConsoleBridgeIpc } from './console-bridge.js';
import { attachSpawnResultListener } from './spawn-result-listener.js';

// COARCH-T04: build-doc config bridge methods added.
// MB-T40 WB2: channel rebindings per A3 ratification.
//   sendAndStream → workstation:session-send-prompt invoke
//   onStreamChunk → coarchitect:ptyChunk
//   onStreamDone  → coarchitect:ptyTurnDone
//   onStreamError → no-op stub (A3: PTY model has no stream error semantics)
// MB-T-HSO-WIRE WB14b: AnthropicChatClient + coarchitect:sendAndStream
// handler removed entirely (v3.0 path). The sendAndStream bridge method
// still resolves via the workstation:session-send-prompt IPC path.
contextBridge.exposeInMainWorld('coarchitectBridge', {
  fetchHistory: () => ipcRenderer.invoke('coarchitect:fetchHistory'),
  postMessage: (msg: unknown) => ipcRenderer.invoke('coarchitect:postMessage', msg),
  sendAndStream: (content: string) =>
    ipcRenderer.invoke('workstation:session-send-prompt', {
      sessionName: '__orchestrator_active',
      prompt: content,
    }),
  getBuildDocConfig: () => ipcRenderer.invoke('coarchitect:getBuildDocConfig'),
  setBuildDocConfig: (config: unknown) => ipcRenderer.invoke('coarchitect:setBuildDocConfig', config),
  clearBuildDocConfig: () => ipcRenderer.invoke('coarchitect:clearBuildDocConfig'),
  onStreamChunk: (cb: (chunk: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, chunk: string) => cb(chunk);
    ipcRenderer.on('coarchitect:ptyChunk', h as any);
    return () => ipcRenderer.removeListener('coarchitect:ptyChunk', h as any);
  },
  onStreamDone: (cb: (text: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, text: string) => cb(text);
    ipcRenderer.on('coarchitect:ptyTurnDone', h as any);
    return () => ipcRenderer.removeListener('coarchitect:ptyTurnDone', h as any);
  },
  onStreamError: (_cb: (err: { code: string; message: string }) => void) => {
    // A3 ratification: no-op stub; PTY model has no stream error semantics
    return () => {};
  },
  // === BEGIN: MB-T26 cost-meter bridge ===
  // Q-MBT26-5=d operator-confirmed 2026-05-07 (push-based via onCostUpdate).
  // Implementation: on registration, immediately invoke 'coarchitect:
  // getDailyCost' to fetch today's running total; subscribe to live
  // 'coarchitect:cost-update' broadcasts emitted by coarchitect-ipc.ts
  // captureUsageToLedger after each Conductor API call. Returns cleanup-
  // fn matching the onStream* / onSpawnResult / onTileDetachClosed pattern.
  onCostUpdate: (cb: (totalUsd: number) => void) => {
    ipcRenderer
      .invoke('coarchitect:getDailyCost')
      .then((total: unknown) => {
        if (typeof total === 'number') cb(total);
      })
      .catch(() => {
        // initial fetch failure — wait for next live update
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, total: number) => cb(total);
    ipcRenderer.on('coarchitect:cost-update', h as any);
    return () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ipcRenderer.removeListener('coarchitect:cost-update', h as any);
  },
  // === END: MB-T26 ===
  // === BEGIN: MB-T34 rate-limit bridge ===
  // C-MBT34-1=(b mod) operator-confirmed 2026-05-08. Mirrors MB-T26
  // onCostUpdate pattern. Implementation: on registration, immediately
  // invoke 'coarchitect:getRateLimitState' to fetch the current snapshot
  // (or null if no API call has completed yet); subscribe to live
  // 'coarchitect:rate-limit-update' broadcasts emitted by
  // captureRateLimitToBroadcast in coarchitect-ipc.ts MB-T34 zone.
  // Returns cleanup-fn matching the onStream* / onCostUpdate pattern.
  //
  // Cross-session: Terminal B (MB-T25 plan-usage ring) is the consumer.
  // The cb param receives RateLimitState (nested-bucket shape per
  // anthropic-api-client.ts). Typed as unknown here because preload
  // runs in a separate module-resolution context; renderer-side
  // narrows with a type guard.
  onRateLimitUpdate: (cb: (state: unknown) => void) => {
    ipcRenderer
      .invoke('coarchitect:getRateLimitState')
      .then((state: unknown) => {
        if (state !== null && state !== undefined) cb(state);
      })
      .catch(() => {
        // initial fetch failure — wait for next live update
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, state: unknown) => cb(state);
    ipcRenderer.on('coarchitect:rate-limit-update', h as any);
    return () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ipcRenderer.removeListener('coarchitect:rate-limit-update', h as any);
  },
  // === END: MB-T34 ===
  // MB-T25 NOTE: `coarchitectBridge.onRateLimitUpdate` authorship lives in
  // Terminal D's MB-T34 zone (f326d21 origin/mbt34-worktree at WB5).
  // Per operator HALT 1 dual-authorship-overlap arbitration 2026-05-08:
  // D's MB-T34 zone owns the preload.mts subscriber (with initial-fetch
  // via 'coarchitect:getRateLimitState' invoke). MY MB-T25 ticket
  // consumes via mount.ts CoarchitectBridge interface +
  // plan-usage-ring.tsx PlanUsageRing component — purely consumer-side,
  // no preload.mts authorship at MB-T25's territory. Incident filed as
  // MB-F-PARALLEL-CAIRN-WORKTREE-DUAL-AUTHORSHIP-OVERLAP (Tier 1) at
  // MB-T25 WB-final findings doc.
});

// Shell bridge for wrapper layout plumbing (splitter state persistence).
contextBridge.exposeInMainWorld('shellBridge', {
  getSplitterPos: () => ipcRenderer.invoke('shell:getSplitterPos'),
  saveSplitterPos: (pos: number) => ipcRenderer.invoke('shell:saveSplitterPos', pos),
});

// MB-T04: spawn-from-UI bridge. openRepoDialog opens native directory picker
// and returns selected path (or null on cancel). requestSpawn fires the
// 'workstation:spawn-requested' IPC event consumed by spawn-ipc.ts; payload
// shape per WORKSTATION_CONTRACT.md §3.3 spawn-new-session target = repo
// path + session name (initial prompt deferred to MB-T05+).
//
// MB-F-#83: onSpawnResult subscribes to 'workstation:spawn-result' (emitted
// by spawn-ipc.ts:297 / :308). Returns cleanup-fn per the
// coarchitectBridge.onStream* pattern. Listener-attach logic lives in
// spawn-result-listener.ts so the seam is unit-testable without booting
// Electron.
contextBridge.exposeInMainWorld('workstationBridge', {
  openRepoDialog: () => ipcRenderer.invoke('workstation:open-repo-dialog'),
  requestSpawn: (payload: { repoPath: string; sessionName: string }) =>
    ipcRenderer.send('workstation:spawn-requested', payload),
  onSpawnResult: (cb: (reply: unknown) => void) =>
    attachSpawnResultListener(ipcRenderer, cb),
  // MB-T09: session-send-prompt bridge per Q-MBT09-4=a.
  // Consumed by orchestrator (MB-T11) and tile footer (MB-T12).
  sendPromptToSession: (payload: unknown) =>
    ipcRenderer.invoke('workstation:session-send-prompt', payload),
  // MB-T11 WB3: session-kill bridge per Q-MBT11-3=a.
  // Consumed by orchestrator-action-handler (WB5) for the kill action.
  killSession: (payload: unknown) =>
    ipcRenderer.invoke('workstation:session-kill', payload),
  // MB-T13 WB7: audit-modal-fetch bridge per Q-MBT13-9=a.
  // Consumed by the WB8 audit-modal renderer when the operator
  // clicks "Show recent orchestrator actions" in the menu.
  fetchAuditModal: () =>
    ipcRenderer.invoke('workstation:audit-modal-fetch'),
  // MB-T12 WB11b: detach-tile bridge per Q-MBT12-4=a.
  // detachTile invokes 'tile:detach' which causes the main process
  // (DetachTileIpcController in detach-tile-ipc.ts) to open a new
  // BrowserWindow loading console-panel.html?session=<name>. The
  // returned promise resolves with { ok: true } when the window opened.
  detachTile: (sessionName: string) =>
    ipcRenderer.invoke('tile:detach', { sessionName }),
  // MB-T12 WB11b: subscribe to 'tile:detach-closed' main-process events
  // fired when an operator closes a detached console window. The
  // detached session's tile re-mounts in the main grid (TileGridApp
  // flips status to 'open'). Returns a cleanup fn matching the
  // onSpawnResult / onStream* pattern.
  onTileDetachClosed: (cb: (payload: { sessionName: string }) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, payload: { sessionName: string }) => cb(payload);
    ipcRenderer.on('tile:detach-closed', h as any);
    return () => ipcRenderer.removeListener('tile:detach-closed', h as any);
  },
  // MB-T16 WB2: per-session approval-policy bridge per Q-MBT16-1..8.
  // getSessionApprovalPolicy invokes 'workstation:approval-policy-get'
  // → main-process ApprovalPolicyIpcController → daemon
  // GET /v3/sessions/:name/approval-policy. Returns full GetResponse
  // shape including updated_at (null for no-row default per Q-MBT13-4=c).
  getSessionApprovalPolicy: (sessionName: string) =>
    ipcRenderer.invoke('workstation:approval-policy-get', { sessionName }),
  // MB-T16 WB2: putSessionApprovalPolicy invokes
  // 'workstation:approval-policy-put' → daemon PUT
  // /v3/sessions/:name/approval-policy. Returns the updated GetResponse
  // with server-assigned updated_at. Caller (TileApprovalPicker)
  // handles optimistic-UI rollback per Q-MBT16-3=a on rejection.
  putSessionApprovalPolicy: (sessionName: string, policy: string) =>
    ipcRenderer.invoke('workstation:approval-policy-put', { sessionName, policy }),
  // MB-T17 WB2: per-session autopilot toggle bridge per Q-MBT17-1..13.
  // getSessionAutopilotEnabled invokes 'workstation:autopilot-get'
  // → main-process AutopilotIpcController → AutopilotLoop.isEnabled
  // (workstation-side autopilot-state.json). Returns { enabled: boolean };
  // default false per Q-MBT17-8=a / autopilot-state-store.ts:61.
  // Significant deviation from MB-T16 picker bridge: NO daemon route;
  // autopilot is workstation-side only (Phase 1 diagnose §I-E).
  getSessionAutopilotEnabled: (sessionName: string) =>
    ipcRenderer.invoke('workstation:autopilot-get', { sessionName }),
  // MB-T17 WB2: setSessionAutopilotEnabled invokes
  // 'workstation:autopilot-put' → AutopilotLoop.setEnabled. Returns
  // { enabled: boolean } echoing the persisted value. Caller
  // (TileAutopilotToggle) handles optimistic-UI rollback per
  // Q-MBT17-3=a on rejection.
  setSessionAutopilotEnabled: (sessionName: string, enabled: boolean) =>
    ipcRenderer.invoke('workstation:autopilot-put', { sessionName, enabled }),
  // §C.5: subscribe to 'workstation:tile-token-update' events emitted by
  // tile-token-scraper after per-session 500ms debounce. Payload shape:
  // { sessionName: string; tokensUsed: number }. Returns cleanup-fn matching
  // the onTileDetachClosed / onSpawnResult pattern.
  onTileTokenUpdate: (
    cb: (payload: { sessionName: string; tokensUsed: number }) => void,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, payload: { sessionName: string; tokensUsed: number }) => cb(payload);
    ipcRenderer.on('workstation:tile-token-update', h as any);
    return () => ipcRenderer.removeListener('workstation:tile-token-update', h as any);
  },
  // === BEGIN: MB-T24 dispatch-mode gate IPC ===
  // Q-MBT24-5=c (hard gate at spawn-ipc.ts) operator-confirmed at HALT 0
  // 2026-05-08. spawn-ipc.ts emits 'workstation:spawn-confirm-required'
  // when dispatchMode === 'ask' and the renderer fires
  // 'workstation:spawn-requested'; renderer subscribes here, surfaces a
  // confirmation modal (workstation-shell.html MB-T24 zone), and fires
  // 'workstation:spawn-confirm-response' on the operator's choice.
  //
  // onSpawnConfirmRequired: subscribe to 'workstation:spawn-confirm-
  // required'. Returns cleanup-fn (matches onSpawnResult / onStream*
  // pattern). Payload shape: { requestId, repoPath, sessionName }.
  onSpawnConfirmRequired: (
    cb: (payload: {
      requestId: string;
      repoPath: string;
      sessionName: string;
    }) => void,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (
      _: unknown,
      payload: { requestId: string; repoPath: string; sessionName: string },
    ) => cb(payload);
    ipcRenderer.on('workstation:spawn-confirm-required', h as any);
    return () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ipcRenderer.removeListener('workstation:spawn-confirm-required', h as any);
  },
  // respondSpawnConfirm: fires 'workstation:spawn-confirm-response' with
  // operator's decision. One-way send; main-process gate looks up by
  // requestId and either fires the cached spawn (confirm) or discards
  // it (cancel).
  respondSpawnConfirm: (requestId: string, decision: 'confirm' | 'cancel') =>
    ipcRenderer.send('workstation:spawn-confirm-response', {
      requestId,
      decision,
    }),
  // === END: MB-T24 ===
});

// CONSOLE-T02: consoleBridge per vision §10.7 (frozen at eac381e).
// Direction-corrected post operator arbitration of CONSOLE-T02 halt:
//   shell→webview (on*): console:open, console:close, console:stdout-chunk,
//                        console:gap-detected, console:error
//   webview→shell (invoke): console:send-stdin, console:signal,
//                           console:open-panel (Fix-C / cairn finding #82)
// makeConsoleBridge factory lives in console-bridge.ts so the shape can be
// unit-tested without booting electron.
const consoleIpcAdapter: ConsoleBridgeIpc = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (channel, listener) => { ipcRenderer.on(channel, listener as any); },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeListener: (channel, listener) => { ipcRenderer.removeListener(channel, listener as any); },
};
contextBridge.exposeInMainWorld('consoleBridge', makeConsoleBridge(consoleIpcAdapter));

// === BEGIN: MB-T24 dispatch-mode bridge ===
// Q-MBT24-6=c operator-confirmed 2026-05-08: NEW dispatchModeBridge —
// additive surface mirroring commitsBridge precedent. Two methods:
//
//   - getDispatchMode() — invokes 'dispatch-mode:get' main-process IPC
//     handler (registered by src/main/dispatch-mode-ipc.ts at
//     app.whenReady time per main.ts MB-T24 sentinel zone). Returns the
//     persisted DispatchMode ('auto' | 'ask'); defaults to 'ask' per
//     Q-MBT24-2=a when no file / malformed.
//   - setDispatchMode(mode) — invokes 'dispatch-mode:set' with
//     { mode } payload. Echoes the persisted value back so the renderer
//     can reconcile after the write.
//
// Renderer-side consumer is src/chat-shell/dispatch-mode-toggle.tsx
// (DispatchModeToggle component, mounted via mount.ts auto-build path 2
// when window.dispatchModeBridge is exposed). Q-MBT24-5=c hard gate
// at spawn-ipc.ts (WB4a) reads the persisted mode directly via
// dispatch-mode-store.readDispatchMode() — does NOT route through
// this bridge (which is renderer→main; spawn-ipc handler is main-side).
contextBridge.exposeInMainWorld('dispatchModeBridge', {
  getDispatchMode: () => ipcRenderer.invoke('dispatch-mode:get'),
  setDispatchMode: (mode: unknown) =>
    ipcRenderer.invoke('dispatch-mode:set', { mode }),
});
// === END: MB-T24 ===

// === BEGIN: MB-T22 commits bridge ===
// Q-MBT22-7=a operator-confirmed 2026-05-07: static window.commitsBridge
// mirroring window.coarchitectBridge shape. Single method `listCommits`
// invokes 'commits:list' main-process IPC handler (registered by
// src/main/commits-ipc.ts at app.whenReady time per main.ts MB-T22
// sentinel zone). Renderer-side consumer is src/chat-shell/commits-tab
// .tsx (lands at WB4). Result envelope: { groups, error? } per
// commits-ipc.ts CommitsListResponse.
//
// Additive surface — does NOT extend coarchitectBridge (which already
// hosts the chat domain). Commits view has its own bridge to keep
// concerns separate and to avoid extending the StreamingBridge contract
// surface that ChatPanel + chat-shell depend on.
contextBridge.exposeInMainWorld('commitsBridge', {
  listCommits: (opts?: { limit?: number }) =>
    ipcRenderer.invoke('commits:list', opts ?? {}),
});
// === END: MB-T22 commits bridge ===
// === BEGIN: §C.1′ frame-mode bridge ===
// Exposes getFrameMode / setFrameMode to the tile-grid renderer.
// Main-process handlers registered in main.ts §C.1′ sentinel zone before
// createWindow() so mount.ts can call getFrameMode() at auto-mount time
// without racing. Mirrors dispatchModeBridge pattern (Q-MBT24-6=c).
contextBridge.exposeInMainWorld('frameModeBridge', {
  getFrameMode: () => ipcRenderer.invoke('frame-mode:get'),
  setFrameMode: (mode: unknown) => ipcRenderer.invoke('frame-mode:set', { mode }),
});
// === END: §C.1′ frame-mode bridge ===
