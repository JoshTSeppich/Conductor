# c5-ticket-wb1 — tile-grid-app integration trinity (2026-05-12)

**Session**: `c5-ticket-wb1` (Round 11 §3.9 Wave 2 SPECULATIVE)
**Manifest**: `docs/coordination/territorial-manifests/c5-tilegrid-wiring.txt`
**Trinity scope**: `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP` + `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` + `MB-F-FRAME-C-IPC-LOOKUP-SESSION`

---

## §1 — Outcome (§2.11 classification: "Capability enabled with known limitations")

c5 ships **renderer-side integration anchors** for all three trinity gaps. End-to-end closure of each followup requires downstream work outside c5 territory (preload.mts subscribe-API extension, main.ts emit-on-write extensions, tile-grid.tsx prop-drill into inner tiles). The anchor surface c5 ships is the **handoff contract**: the modules + bridge-shape extensions + TileGridApp wiring that downstream consumers slot into.

| Gap | c5 anchor status | Downstream blockers |
|---|---|---|
| MB-F-FRAME-C-IPC-LOOKUP-SESSION | **shipped** (registry helper in frame-c-ipc.ts at 56925b8) | t3's main.ts integration of `createProductionLookupSession(c5Registry)` + preload.mts bridge for register/unregister wiring |
| MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP | **shipped** (frame-mode-subscription module + TileGridApp wiring at a833b94) | preload.mts `onFrameModeChange` subscribe API + main.ts emit on writeFrameMode + tile-grid.tsx frameMode prop drill |
| MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING | **shipped** (scroll-to-session-consumer module + TileGridApp wiring at 1402e15) | preload.mts `onScrollToSession` subscribe API + tile-grid.tsx visual scroll/highlight implementation |

## §2 — WB ladder

| WB | SHA | Type | Description |
|---|---|---|---|
| WB1 | `63eba0f` | red (contaminated) | session-registry helper probe (8 conditions, contaminated with foreign files) |
| Revert | `9b8a4e9` | chore | partial-revert of cross-session contamination; restored 2 forbidden paths |
| WB2 | `a400c10` | red | probe amendment for cross-contract alignment with t3 `SessionRegistrySource` (lookup→getSession; 9 conditions) |
| Coord-revert | `31d2a59` | docs | revert + alignment coord doc |
| WB3 | `56925b8` | green | `createSessionRegistry()` helper in frame-c-ipc.ts (flips 9 conditions GREEN) |
| WB4 | `24045ab` | red | frame-mode-subscription module + TileGridApp wiring probe (9 conditions) |
| WB5 | `a833b94` | green | frame-mode-subscription.ts module + TileGridApp wiring (flips 9 conditions GREEN) |
| WB6 | `e54f878` | red | scroll-to-session-consumer module + TileGridApp wiring probe (9 conditions) |
| WB7 | `1402e15` | green | scroll-to-session-consumer.ts + TileGridApp wiring (flips 9 conditions GREEN) |
| WB-final | this commit | docs | end-to-end coord doc + trinity findings doc |

Cairn-grammar commits: 6 (4 red + 3 green + 1 amended-red). Housekeeping: 3 (1 chore-revert + 2 docs). Total: 9 commits.

## §3 — Architecture (post-c5)

### §3.1 Three new modules in `src/tile-grid/`

**`frame-mode-subscription.ts`** (a833b94):
```typescript
export interface FrameModeBridge {
  onFrameModeChange?: (cb: (mode: FrameMode) => void) => () => void;
}
export function subscribeToFrameMode(
  bridge: FrameModeBridge,
  callback: (mode: FrameMode) => void,
): () => void;
```

**`scroll-to-session-consumer.ts`** (1402e15):
```typescript
export interface ScrollToSessionPayload { readonly sessionName: string; }
export interface ScrollToSessionBridge {
  onScrollToSession?: (
    cb: (payload: ScrollToSessionPayload) => void,
  ) => () => void;
}
export function subscribeToScrollToSession(
  bridge: ScrollToSessionBridge,
  callback: (payload: ScrollToSessionPayload) => void,
): () => void;
```

Both modules: defensive no-op cleanup when bridge method undefined (production path until preload.mts extension lands).

### §3.2 `WorkstationBridgeShape` extensions (tile-grid-app.tsx)

```typescript
export interface WorkstationBridgeShape
  extends FrameModeBridge,
    ScrollToSessionBridge {
  onSpawnResult: ...;
  detachTile?: ...;
  // ... existing fields unchanged ...
}
```

Both new fields are **optional** — TileGridApp degrades gracefully when bridge methods absent.

### §3.3 `frame-c-ipc.ts` extension (56925b8)

New exports (alongside existing `FrameCIpcController`, `createDefaultFrameCIpcController`, deps + result types):

```typescript
export interface SessionRegistryEntry {
  readonly cwd: string;
  readonly branchName: string;
}
export interface SessionRegistry {
  register(sessionName: string, entry: SessionRegistryEntry): void;
  unregister(sessionName: string): void;
  getSession(sessionName: string): SessionRegistryEntry | null;
}
export function createSessionRegistry(): SessionRegistry;
```

`SessionRegistry.getSession` matches t3's `SessionRegistrySource` interface verbatim (frame-c-ipc-deps.ts:42-44 at d18353b) — no adapter shim needed.

### §3.4 TileGridApp wiring (a833b94 + 1402e15)

Two new `useState` + `useEffect` pairs added:

```typescript
const [_frameMode, setFrameMode] = useState<FrameMode>('C');
useEffect(() => {
  return subscribeToFrameMode(workstationBridge, setFrameMode);
}, [workstationBridge]);

const [_lastScrollTargetSessionName, setLastScrollTargetSessionName] =
  useState<string | null>(null);
useEffect(() => {
  return subscribeToScrollToSession(workstationBridge, (payload) => {
    setLastScrollTargetSessionName(payload.sessionName);
  });
}, [workstationBridge]);
```

Underscored locals (`_frameMode`, `_lastScrollTargetSessionName`) satisfy `noUnusedLocals` — anchor-only posture; downstream tile-grid.tsx work consumes these via prop drill once tile-grid.tsx is in territory.

## §4 — Downstream integration handoffs

### §4.1 t3-ticket-body-0905 (in-flight; partial ship at d18353b)

t3's `createProductionLookupSession(source: SessionRegistrySource)` factory at `frame-c-ipc-deps-production.ts:31-35` is a pure pass-through:
```typescript
return (sessionName) => source.getSession(sessionName);
```

c5's registry directly satisfies the `SessionRegistrySource` interface. Final integration at `main.ts:588-597`:
```typescript
const registry = createSessionRegistry();   // c5 helper at 56925b8
const lookupSession = createProductionLookupSession(registry);  // t3 factory at d18353b
createDefaultFrameCIpcController({
  lookupSession,
  emitScroll: (payload) => mainWindow?.webContents.send('frame-c:scroll-to-session', payload),
  writeFrameMode,
}).registerHandlers(ipcMain);
```

**Open question**: register/unregister wiring from TileGridApp session lifecycle (spawn-result + kill + detach) to `registry.register`/`unregister`. Requires:
- preload.mts extension exposing publish-style API (e.g., `workstation:register-session` invoke channel).
- main.ts handler that invokes `registry.register(name, {cwd, branchName})`.
- TileGridApp wiring those publishes on each lifecycle transition.

All out of c5 territory. Likely future ticket (post-t3 WB-final).

### §4.2 preload.mts extensions (downstream)

c5 anchors require two new subscribe-style APIs in `frameModeBridge` and a new `frameCBridge` extension:

```typescript
// preload.mts (out of c5 territory; future work)
contextBridge.exposeInMainWorld('frameModeBridge', {
  getFrameMode: () => ipcRenderer.invoke('frame-mode:get'),
  setFrameMode: (mode) => ipcRenderer.invoke('frame-mode:set', { mode }),
  // NEW (post-c5):
  onFrameModeChange: (cb) => {
    const handler = (_event, { mode }) => cb(mode);
    ipcRenderer.on('frame-mode:changed', handler);
    return () => ipcRenderer.off('frame-mode:changed', handler);
  },
});

contextBridge.exposeInMainWorld('frameCBridge', {
  diff: ..., merge: ..., focus: ...,  // existing invoke methods
  // NEW (post-c5):
  onScrollToSession: (cb) => {
    const handler = (_event, payload) => cb(payload);
    ipcRenderer.on('frame-c:scroll-to-session', handler);
    return () => ipcRenderer.off('frame-c:scroll-to-session', handler);
  },
});
```

main.ts side requires:
- `frame-mode:changed` emit on every `writeFrameMode(mode)` call. Cleanest: factor `writeFrameMode` into a `emitOnWrite(mode)` wrapper that calls original + `mainWindow.webContents.send('frame-mode:changed', { mode })`.
- `frame-c:scroll-to-session` emit already lives at main.ts:594 — no change needed.

### §4.3 tile-grid.tsx visual prop-drill (downstream)

c5's `_frameMode` + `_lastScrollTargetSessionName` state are renderer-side anchors. Visual consumption requires:
- `TileGridProps.frameMode?: FrameMode` added (already-present `TileProps.frameMode` is the existing sink at `tile.tsx:125`).
- `TileGridProps.scrollTargetSessionName?: string | null` (or DOM-scroll imperative via ref).
- `tile.tsx` already accepts frameMode; its `isCompact = frameMode === 'A'` branch is the visual gate (tile.tsx:165).

All in tile-grid territory, currently FORBIDDEN to c5. Separate ticket required.

## §5 — Cross-session coordination outcomes

### §5.1 Incident: 63eba0f cross-session contamination

Documented at `docs/coordination/coord-c5-revert-and-contract-alignment-2026-05-12.md` (31d2a59). Resolution: partial-revert (`9b8a4e9`) + WB2 RED amendment (`a400c10`) + tightened per-path commit pathspec discipline (operator Phase 1 reinforcement (d)).

### §5.2 `commit-plan-doc-1334` re-resumption

Post-revert, `commit-plan-doc-1334` cleanly re-shipped their WB1 GREEN at `228a2da` ("clean post-c5-revert authoring" per their commit body). Coord-doc handoff worked.

### §5.3 `t3-ticket-body-0905` architectural alignment

t3's WB1 GREEN at `d18353b` introduced `SessionRegistrySource` interface BEFORE c5 reached its WB3 GREEN. Cross-contract alignment achieved via c5 WB2 RED amendment (lookup → getSession rename per Phase 1 reinforcement (c)). The two sessions did not deadlock despite the c5↔t3 dep on tile-grid-app integration anchor (per dispatch-queue row 28).

### §5.4 Discipline tightening

Three new disciplines validated end-to-end in c5:
1. **Per-path `git commit -- <pathspec>` MANDATORY** (not just `git add` pathspec). §2.7 discipline gap closed.
2. **Pre-commit `git status --short` verification MANDATORY**. The shared `.git/index` can be mutated between `git add` and `git commit`; explicit pathspec on commit is the only race-proof scope mechanism.
3. **Foreign-staged-file detection at stage step**. If `git diff --staged --name-only` shows paths outside your territory after your `git add`, unstage them (`git reset HEAD <paths>`) BEFORE committing.

All three propose §2.7 amendments. Operator-arbitrated (post-c5).

## §6 — §2.12 followups surfacing

c5's session generated zero new Tier-1/2/3 followup candidates. The three trinity gaps were the existing scope; their PARTIAL anchor closure is documented above. Sibling rows that touch c5 work:

| FOLLOWUPS.md row | Tier | c5 closure status |
|---|---|---|
| MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11 (row 313) | 2 | partial anchor closure |
| MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11 (row 329) | 2 | partial anchor closure (joint with t3) |
| MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING (row 333) | 3 | partial anchor closure |

Trinity findings doc at `docs/coordination/mb-f-tilegrid-wiring-trinity-2026-05-12.md` (this WB-final commit) propagates Tier-3 forward-propagation memory for the discipline tightening.

## §7 — Verification log

- `pnpm exec vitest run test/unit/tile-grid test/unit/tile-grid-app test/unit/main` → 349/349 GREEN at WB7 GREEN (1402e15) before WB-final.
- `pnpm --filter dispatch-workstation typecheck` → clean at every GREEN WB.
- `git log origin/main..HEAD` → empty after every cairn-grammar push (§2.6 verified).
- 5-package typecheck NOT run (no dispatch-core schema changes; c5 work is workstation-internal).
- Runtime-launch smoke NOT applicable (c5 touches src/tile-grid/* + src/main/frame-c-ipc.ts only; no src/main/main.ts wiring changes per §4.6).

## §8 — Forward work (post-c5)

The three c5 anchors enable downstream tickets to close the trinity gaps end-to-end. Suggested sequencing:

1. **Combined preload.mts + main.ts extension ticket** (cluster-style):
   - frameModeBridge.onFrameModeChange + main.ts writeFrameMode emit wrapper
   - frameCBridge.onScrollToSession (main.ts:594 already emits)
   - workstation:register-session + workstation:unregister-session IPC + registry.register/unregister wiring in main.ts
2. **TileGridApp publish-session-lifecycle ticket**: TileGridApp wires register/unregister bridge calls into onSpawnResult/kill/detach handlers.
3. **tile-grid.tsx + tile.tsx prop-drill ticket**: TileGridProps.frameMode + scrollTargetSessionName threading; tile.tsx already has frameMode prop, scroll target needs new handling.

These three tickets (or any subset bundled) close all three c5 trinity followups to Tier-0 (closed).
