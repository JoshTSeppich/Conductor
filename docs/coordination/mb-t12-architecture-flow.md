# MB-T12 Architecture & Cross-Layer Flow Diagrams

**Date:** 2026-05-07
**HEAD at authoring:** post-WB13 (`57f8bb4`)
**Source:** extracted from WB11b commit body (`59becfa`); expanded with
companion flow diagrams discovered during WB14 findings authoring.

This doc is the persistent home for the MB-T12 cross-layer architecture
flows so they're discoverable outside `git log`. Per the post-WB13
followup `MB-F-T12-CROSS-LAYER-FLOW-DIAGRAM-DOC` (Tier 3, filed +
CLOSED at WB14).

---

## I. Component composition

```
┌──────────────────────────────────────────────────────────────────┐
│  workstation-shell.html (renderer)                               │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  <div id="kanban-region">  ←  dispatch-web webview      │     │
│  └─────────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  <div id="console-tile-region"> (flex-grow)             │     │
│  │  └─ <div id="tile-grid-root">                           │     │
│  │      └─ <TileGridApp>                          (WB9)    │     │
│  │          └─ <TileGrid sessions={...}>          (WB6)    │     │
│  │              ├─ <Tile sessionName="a">         (WB5)    │     │
│  │              │   ├─ header chrome (WB5)                  │    │
│  │              │   │   ├─ kill button   → onKill          │    │
│  │              │   │   ├─ collapse btn  → onCollapse      │    │
│  │              │   │   ├─ detach btn    → onDetach        │    │
│  │              │   │   ├─ slot:picker   (MB-T16 future)   │    │
│  │              │   │   └─ slot:autopilot (MB-T17 future)  │    │
│  │              │   ├─ body                                │    │
│  │              │   │   ├─ <ConsolePanel>           (WB4)  │    │
│  │              │   │   │   targetSessionName=a            │    │
│  │              │   │   │   listener filter on sessionName │    │
│  │              │   │   └─ OR detached-placeholder (WB11a) │    │
│  │              │   │       (when status='detached')       │    │
│  │              │   └─ slot:footer (MB-T18 future)         │    │
│  │              ├─ <Tile sessionName="b">                  │    │
│  │              ├─ <Tile sessionName="c">                  │    │
│  │              └─ resize handles (vertical/horizontal)    │    │
│  └─────────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  <div id="splitter">  ←  6px ns-resize                  │     │
│  └─────────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  <div id="chat-region">  ←  COARCH-T03 chat panel       │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                                ↕ contextBridge (preload.mts)
┌──────────────────────────────────────────────────────────────────┐
│  Main process                                                    │
│   ├─ ConsoleIpcController       (CONSOLE-T02 + WB11a)            │
│   │   ├─ panels: Map<sessionName, PanelState>                    │
│   │   ├─ defaultEmit (= mainWindow.webContents.send)             │
│   │   ├─ sessionTargets: Map<sessionName, target-fn>     (WB11a) │
│   │   └─ setSessionTarget(name, fn|null)                  (WB11a) │
│   ├─ DetachTileIpcController     (WB11b)                          │
│   │   ├─ windows: Map<sessionName, BrowserWindow>                 │
│   │   ├─ detach(name) → opens BrowserWindow                       │
│   │   └─ tile:detach IPC handler                                  │
│   ├─ SpawnIpcController         (MB-T05; reused per Q-MBT12-5=a)  │
│   │   └─ workstation:spawn-result event                           │
│   ├─ SessionKillIpcController   (sess-mbt11)                      │
│   ├─ AutopilotLoop              (sess-mbt11)                      │
│   ├─ ApprovalPolicyResolver     (sess-mbt13 + Tier-E shim)        │
│   └─ AuditModalIpcController    (sess-mbt13)                      │
└──────────────────────────────────────────────────────────────────┘
                                ↕ HTTP / WebSocket
┌──────────────────────────────────────────────────────────────────┐
│  dispatch-daemon                                                 │
│   ├─ /v2/sessions, /v2/events/stream                             │
│   ├─ /v3/sessions/:name/console/stream  (WS)                     │
│   ├─ /v3/sessions/:name/approval-policy (GET/PUT)                │
│   └─ /v3/audit/swarm-audit                                       │
└──────────────────────────────────────────────────────────────────┘
```

## II. Spawn auto-mount flow (WB9)

Operator clicks `+ Spawn Session` → daemon spawns a tmux session →
workstation:spawn-result event fires → TileGridApp appends a new tile
→ TileGrid layout reflows (computeGridLayout(N)).

```
[operator clicks + Spawn Session]
  → spawn modal collects {repoPath, sessionName}
  → workstationBridge.requestSpawn({repoPath, sessionName})
  → ipcRenderer.send('workstation:spawn-requested', payload)
  → SpawnIpcController.handleSpawnRequest(payload)
    → spawnSession(req, deps)
      → cap-check → tmux new-session → liveness-check → daemon-register
    → reply = {type:'success', result:{sessionName, sessionId, panelMounted:false}}
  → event.sender.send('workstation:spawn-result', reply)

[renderer]
  → workstationBridge.onSpawnResult(cb) handler fires
  → TileGridApp.useEffect cb:
    → if reply.type === 'success' && result.sessionName → setSessions(append)
  → React re-renders TileGrid with new sessions[]
  → computeGridLayout(N+1) recomputes grid template
  → New <Tile sessionName=...> mounts at the appended position
  → ConsolePanel in body subscribes to consoleBridge with targetSessionName
    filter (WB4)
```

## III. Detach-to-window flow (WB11a + WB11b — operator-arbitrated split)

Operator clicks tile-X's Detach button → tile-X opens in a NEW
BrowserWindow loading `console-panel.html?session=X` → main-grid tile-X
shows "detached" placeholder → close detached window → tile-X re-mounts
in main grid.

```
[Phase 1 — operator clicks Detach button on tile-X]
                        (renderer)                              (main process)

  Tile.detach-btn onClick
    → onDetach('X')
    → TileGridApp.handleDetach('X')
      → workstationBridge.detachTile('X')                                  ───┐
        → ipcRenderer.invoke('tile:detach', {sessionName:'X'})                │
                                                                              ▼
                                              ipcMain handler ('tile:detach')
                                                → DetachTileIpcController.detach('X')
                                                  → windowFactory.open({...})
                                                    → new BrowserWindow({preload:..., webPrefs:...})
                                                    → win.loadURL('file://...html?session=X')
                                                    → returns DetachedWindowHandle
                                                  → windows.set('X', handle)
                                                  → setSessionTarget('X', detachedSendFn)
                                                    → consoleController.sessionTargets.set('X', fn)
                                                  → handle.onClosed(cleanupCb)
                                                  → returns {ok: true}
                                             ◀─── ack
      ◀─── promise resolves
      → setSessions(s.X.status='detached')   (optimistic)
      → React re-renders Tile-X with detached placeholder

[Phase 2 — operator works in the detached BrowserWindow]
                        (detached window)                       (main process)

  console-panel.html?session=X loads
    → tile-grid bundle script ../tile-grid/renderer.js loads
      [tile-grid auto-mount returns no-root because no #tile-grid-root]
    → console-panel bundle script ../console-panel/renderer.js loads
      → tryAutoMountStandalone() reads URL ?session=X
      → mountConsolePanel({rootElementId:'console-root', targetSessionName:'X', ...})
      → <ConsolePanel targetSessionName='X' /> renders
      → listeners filter on p.sessionName === 'X'

  daemon STDOUT chunk for session X
    → ConsoleIpcController WS receives line message
      → routes through emitToWebview('console:stdout-chunk', {sessionName:'X', bytes:...})
      → sessionTargets.get('X') exists (registered in Phase 1)         ───┐
        → target('console:stdout-chunk', payload)                          │
        → detachedWin.webContents.send('console:stdout-chunk', payload)    │
                                                                           ▼
                                              [detached window]
                                              → ConsolePanel listener fires (passes filter)
                                              → adapter.write(bytes)

[Phase 3 — operator closes the detached BrowserWindow]
                        (operator)                              (main process)

  user closes win
    → BrowserWindow 'closed' event fires
    → handle.onClosed callback (registered in Phase 1)
      → windows.delete('X')
      → setSessionTarget('X', null)
        → consoleController.sessionTargets.delete('X')
          (events for X now route to defaultEmit = mainWindow)
      → notifyMainWindow('X')
        → mainWindow.webContents.send('tile:detach-closed', {sessionName:'X'})
                                                                         ───┐
                                                                            │
                                                                            ▼
                                              [main grid renderer]
                                              → workstationBridge.onTileDetachClosed cb fires
                                              → TileGridApp.useEffect handler:
                                                → setSessions(s.X.status='open')
                                              → React re-renders Tile-X with ConsolePanel
                                                (placeholder gone; body re-mounts)
```

## IV. Drag-resize flow (WB7)

Operator drags a vertical/horizontal resize handle → TileGrid updates
inline grid-template-rows/columns in real time → on drag-end, fires
onResizeEnd(GridOverride) which the parent persists.

```
[mousedown on handle] tile-resize-handle-vertical-i
  → startDrag('vertical', i, e.clientX, e.clientY)
    → readCurrentSizes() (test seam OR getBoundingClientRect)
      returns { colPx: [...], rowPx: [...] }
    → dragRef.current = { orientation, borderIdx:i, startX, startY, initialSizes }

[document mousemove] (cursor leaves handle box)
  → applyDrag(currentX, currentY)
    → delta = currentX - startX
    → next = computeNewSizesAfterDrag(initialSizes, i, delta, MIN_BAND_PX=80)
      pure fn — clamps so neither adjacent band shrinks below 80px
    → setColCss(next.map(px => `${px}px`))
  → React re-renders with new gridTemplateColumns

[document mouseup]
  → endDrag()
    → dragRef.current = null
    → setColCss((latest) => {
        override = { colSizes: latest, rowSizes: rowCss? }
        onResizeEnd(override)
      })
  → parent (TileGridApp) calls onPersistGridOverride(override)
    → (WB12 ships in-memory only; WB14 follow-up
       MB-F-T12-RENDERER-PERSISTENCE-WIRING wires the IPC to
       writeGridOverride in tile-grid-state.json)
```

## V. Drag-swap flow (WB8)

Operator drags tile-A's header onto tile-B's header → tile-A and tile-B
swap orderIndex → React reorders tiles.

```
[mousedown on tile-A's header background] (excluding kill/detach/collapse buttons)
  → Tile.onMouseDown filter: isInteractiveTarget(e.target) → if true skip
  → onSwapDragStart('A')
  → TileGrid.draggingSwapRef.current = 'A'

[mousemove in drag] (no visual feedback in v3.0)

[mouseup on tile-B's header]
  → Tile.onMouseUp filter: isInteractiveTarget(e.target) → if true skip
  → onSwapDrop('B')
  → TileGrid.handleSwapDrop('B'):
    → source = draggingSwapRef.current ('A')
    → if source !== 'B' → onSwap('A', 'B')
    → draggingSwapRef.current = null
  → TileGridApp.handleSwap('A', 'B'):
    → setSessions((current) => {
        idxA = findIndex(s => s.name === 'A')
        idxB = findIndex(s => s.name === 'B')
        next[idxA], next[idxB] = next[idxB], next[idxA]
        return persistAndUpdate(next)
      })
  → React re-renders with swapped tile order

[edge cases]
  - source === target (drop on same tile): no onSwap fired
  - drop outside any header (document mouseup): draggingSwapRef cleared,
    no onSwap
  - mousedown on a button (kill/detach/collapse): isInteractiveTarget
    true; drag never starts; button click handler fires normally
```

## VI. Multi-target console event routing (WB11a refactor)

Pre-WB11a: `ConsoleIpcController.emitToWebview` was a single dep
injected at construction (= `mainWindow.webContents.send`). All
console:* events went to the main window.

Post-WB11a: a routing wrapper checks the payload's sessionName against
a `sessionTargets: Map<string, target-fn>` registry. If a target is
registered for that session, the event goes there; otherwise falls
back to `defaultEmit` (mainWindow).

```
controller.emitToWebview('console:open', { sessionName: 'X' })
  → if (payload?.sessionName === 'X' && sessionTargets.has('X'))
      sessionTargets.get('X')('console:open', payload)
        → (e.g.) detachedWindow.webContents.send('console:open', payload)
    else
      defaultEmit('console:open', payload)
        → mainWindow.webContents.send('console:open', payload)
```

This is the seam that makes the detach flow possible. Pre-WB11a, all
console:* events would reach the main window even when the operator
detached the tile — leaking output into the wrong place.

## VII. References

- WB1 commit: `5803ce5` red(MB-T12) — scaffold + decisions doc
- WB6 commit: `4023b86` green(MB-T12) — TileGrid top-level component
- WB9 commit: `43adea5` green(MB-T12) — TileGridApp wrapper + spawn auto-mount
- WB11a commit: `e91c52f` green(MB-T12) — ConsoleIpcController.setSessionTarget
- WB11b commit: `59becfa` green(MB-T12) — DetachTileIpcController + factory
- WB12 commit: `827cc1f` green(MB-T12) — main.ts + workstation-shell.html integration
- decisions doc: `docs/coordination/mb-t12-decisions-2026-05-07.md`
- WB13 verification: `docs/coordination/mb-t12-wb13-verification-2026-05-07.md`
- findings: `docs/coordination/mb-t12-findings-2026-05-07.md` (WB14)
