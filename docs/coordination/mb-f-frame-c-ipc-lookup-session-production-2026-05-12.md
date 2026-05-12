# MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11 — production wiring coordination

**Session:** `t3-ticket-body-0905` (Round 11 §3.9 Wave 2 SPECULATIVE)
**Date:** 2026-05-12
**Territorial manifest:** `docs/coordination/territorial-manifests/t3-frame-c-lookup-stub.txt`
**Followup of record:** `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` (Tier 2, filed in `docs/FOLLOWUPS.md` at WB7 docs of `MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS`)

## §1 — Problem statement [KNOWN]

`packages/dispatch-workstation/src/main/main.ts:592` currently passes a degenerate stub:

```typescript
createDefaultFrameCIpcController({
  // STUB lookup — Tier 2 followup MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB
  // filed at WB7 docs. Production wiring depends on TileGridApp ↔
  // main session-shape exposure (cwd + branchName per session).
  lookupSession: () => null,
  emitScroll: (payload) => { mainWindow?.webContents.send('frame-c:scroll-to-session', payload); },
  writeFrameMode,
}).registerHandlers(ipcMain);
```

The stub makes every `frame-c:diff` / `frame-c:merge` / `frame-c:focus` invocation fail with `error_type='SessionNotFound'`. Operator-visible: the WB6 banner UX renders "session 'X' not registered with workstation" for every action, regardless of whether the session is real.

## §2 — Architectural posture [MODELED]

The lookup needs two facts per session: `cwd` (working directory) and `branchName`. Their sources differ:

- **`cwd`** — already exposed renderer→main via the extended `SpawnSessionResult` envelope (MB-T18 WB2 + `tile-grid-app.tsx` propagation at line 168-181). Reachable to main if main listens to spawn-result events or mirrors TileGridApp's `onPersistSessions` callback.
- **`branchName`** — currently underspecified. `TileGridSessionEntry` declares `branchName?: string` (`tile-grid.tsx:36-37`) as a future MB-T15 stub field but no production pipeline populates it today.

**The stub-replacement cannot land as a single edit** without first establishing:

1. A `SessionRegistrySource` implementation on the main side, mirroring TileGridApp's session list (cwd + branchName) into a main-process-readable shape.
2. Renderer→main propagation so that `branchName` is sourced from TileGridApp / spawn metadata. This is where the c5-trinity tile-grid-app integration anchor enters — c5 owns `tile-grid-app.tsx` writes; the integration probe `test/unit/main/probe-frame-c-ipc-lookup-*.spec.ts` (c5 territory) will verify the end-to-end wire.

## §3 — This WB's deliverable [KNOWN]

The t3 manifest scope ships the **stable factory module** the downstream stub-replacement WB will consume:

| File | Purpose |
|---|---|
| `src/main/frame-c-ipc-deps.ts` | Types-only seam. Re-exports `FrameCIpcDeps`, `SessionLookupFn`, `ScrollEmitter`, `FrameCIpcMain` from `frame-c-ipc.ts`. Adds `SessionRegistrySource` — the production-side lookup-source abstraction. |
| `src/main/frame-c-ipc-deps-production.ts` | Exports `createProductionLookupSession(source: SessionRegistrySource): SessionLookupFn`. Pure pass-through; no caching/defensive-copy/normalization. |
| `test/unit/main/probe-frame-c-deps-production-01-factory-wiring.spec.ts` | Asserts factory export + hit pass-through + miss pass-through. 3/3 GREEN. |
| `docs/coordination/mb-f-frame-c-ipc-lookup-session-production-2026-05-12.md` | This doc. |

**Not in territory (explicit non-scope):**

- `main.ts` — not in TERRITORY, not in READ-ONLY. The literal swap of `lookupSession: () => null` to `lookupSession: createProductionLookupSession(<source>)` belongs to the downstream wire WB.
- `frame-c-ipc.ts` — READ-ONLY for this session (writable for c5-trinity). No edits here; `frame-c-ipc-deps.ts` re-exports rather than redefines.
- `tile-grid-app.tsx`, `tile-grid.tsx` — READ-ONLY. The renderer side that exposes `branchName` is c5-trinity territory.

## §4 — Coordination plan with c5-trinity [MODELED]

c5-trinity (`SESSION-c5-ticket-wb1`, manifest `c5-tilegrid-wiring.txt`) writes:
- `src/tile-grid/tile-grid-app.tsx` — adds frame-mode subscription + scroll-to-session consumer.
- `src/tile-grid/frame-mode-subscription.ts` — new renderer module.
- `src/tile-grid/scroll-to-session-consumer.ts` — new renderer module.
- `src/main/frame-c-ipc.ts` — may modify (territory permission).
- `test/unit/main/probe-frame-c-ipc-lookup-*.spec.ts` — integration probes against the WB4 controller.

**Interaction point:**
- c5's frame-c-ipc.ts edits (if any) preserve the type surface this WB re-exports. If c5 renames `SessionLookupFn` or changes its signature, this WB's `frame-c-ipc-deps.ts` re-export breaks loudly at typecheck time — caught at the downstream merge of either session, not silently.
- c5's `probe-frame-c-ipc-lookup-*.spec.ts` integration probes can import `createProductionLookupSession` from this WB's factory module if it's useful to exercise the production passthrough against a c5-shaped session-source fixture. Optional; this WB doesn't require it.
- Neither session edits `main.ts:592`. That swap is the **third leg** of the followup closure — a future WB that:
  - constructs a `SessionRegistrySource` impl (main-side mirror of TileGridApp's session entries, sourced from spawn-result + branchName propagation),
  - imports `createProductionLookupSession`,
  - replaces the `() => null` stub at `main.ts:592` (within the `=== BEGIN: MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS-ipc ===` sentinel zone).

## §5 — Verification evidence [KNOWN]

- WB1 RED — 3/3 fail at `expect(createProductionLookupSession).toBeDefined()` against dynamic import of nonexistent module. Pattern mirrors `test/unit/frame-c-ipc/probe-mbtwbdpfa-03-ipc-channels.spec.ts` RED state at `11f6f29`.
- WB2 GREEN — 3/3 pass: factory export, hit pass-through (reference equality + structural equality), miss pass-through.
- `pnpm --filter dispatch-workstation typecheck` — clean (no diagnostics emitted).

## §6 — Honest scope-gap [KNOWN]

This WB does not close `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` end-to-end. The followup remains **Tier 2 open** with one leg shipped (factory module + types seam + probes) and two legs pending:

- (B) main-side `SessionRegistrySource` implementation — depends on c5-trinity's branchName propagation + a main-process session mirror.
- (C) literal `main.ts:592` stub-replacement — depends on (B).

This is the §2.11 outcome classification **"Capability enabled with known limitations"**: the production factory is ready to consume; downstream legs are blocked on integration anchors not owned by this session.
