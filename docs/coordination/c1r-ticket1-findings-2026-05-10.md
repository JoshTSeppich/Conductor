# §C.1′ Ticket #1 (Frame Router) Findings — 2026-05-10

**Ticket:** §C.1′ ticket #1 — Frame Router  
**WB ladder:** WB1+WB2 RED→GREEN (`44764fd`) → WB3+WB4 RED→GREEN (`44764fd`) → WB5+WB6 GREEN (`44764fd`)  
**Base SHA:** `0db0ac4` (§C.5 findings doc)  
**Fix SHA:** `44764fd`  
**New files:**
- `packages/dispatch-workstation/src/main/frame-mode-state.ts`
- `packages/dispatch-workstation/src/tile-grid/frame-shell-header.tsx`
- `packages/dispatch-workstation/test/unit/frame-mode-state/probe-01-read-write.spec.ts`
- `packages/dispatch-workstation/test/unit/frame-shell-header/probe-01-tab-strip.spec.tsx`

**Modified files:**
- `packages/dispatch-workstation/src/main/main.ts`
- `packages/dispatch-workstation/src/main/preload.mts`
- `packages/dispatch-workstation/src/main/workstation-shell.html`
- `packages/dispatch-workstation/src/tile-grid/color-helpers.ts`
- `packages/dispatch-workstation/src/tile-grid/mount.ts`
- `packages/dispatch-workstation/tsconfig.json`

---

## I — What Shipped

### Frame-mode state persistence (WB1+WB2)
`frame-mode-state.ts` mirrors `splitter-state.ts` exactly: `readFrameMode() → 'A' | 'C'`, `writeFrameMode(mode)`, `MB_FRAME_MODE_STATE_DIR` env-override for test isolation, `'C'` default (Frame C primary per §A.1.R). 8/8 probes.

### FrameShellHeader component (WB3+WB4)
A/C tab strip + `MixIndicatorContainer` + `PlanUsageRing` wrapper (`frame-shell-plan-ring`). `initialMode` prop; `aria-pressed` active state; `onModeChange` callback wired at WB5 to `applyFrameMode` + `frameModeBridge.setFrameMode`. 10/10 probes. Reuses existing `MixIndicatorContainer` from `src/chat-shell/mix-indicator.tsx` and `PlanUsageRing` from `src/chat-shell/plan-usage-ring.tsx` — no new ring component needed.

### Frame-mode IPC wiring (WB5)
Four-file change:
- **main.ts**: `§C.1′ frame-mode imports` sentinel + `§C.1′ frame-mode IPC` sentinel; handlers registered before `createWindow()` (same early-registration pattern as dispatch-mode to eliminate mount-time race on `getFrameMode()` invocation).
- **preload.mts**: `§C.1′ frame-mode bridge` sentinel; `frameModeBridge.getFrameMode()` + `frameModeBridge.setFrameMode(mode)` expose the IPC channels.
- **workstation-shell.html**: `§C.1′ frame-mode visibility` CSS zone; `#header-indicators-root` div; `#frame-c-root` stub div. Frame dispatch via `data-frame-mode` attribute on `#shell` (CSS selector approach — no React unmounting).
- **mount.ts**: `tryAutoMountFrameShellHeader()` reads initial mode from `frameModeBridge.getFrameMode()` (fallback `'C'`), mounts `FrameShellHeader` into `#header-indicators-root`, wires `onModeChange` to `applyFrameMode()` + `bridge.setFrameMode()` persist.

### MB-F-T15 hex palette (WB6)
`color-helpers.ts modelChipColor` updated with canonical values from `Conductor Wireframes.html:186-189`:

| Chip | Old placeholder | Canonical |
|---|---|---|
| S4.6 (Sonnet) | `#4a9eff` blue/cyan | `#5b9d6e` green |
| O4.6 (Opus 4.6) | `#a36cff` light purple | `#c97a3a` orange |
| O4.7·1M (Opus 4.7) | `#7c3eed` deeper purple | `#b13a8e` purple |
| H (Haiku) | `#facc15` amber/yellow | `#6a7891` gray-blue |

26/26 color-helpers probes remain green (assertions check hex format + distinctness, not specific values).

---

## II — Key Findings

### Finding 1: PlanUsageRing already exists — no new SVG component needed

[KNOWN] `src/chat-shell/plan-usage-ring.tsx` (MB-T25) already renders an SVG ring with `onRateLimitUpdate` subscription. Q-C1R-2=(a) anticipated authoring a new component; in practice `PlanUsageRing` covers the contract exactly. `FrameShellHeader` wraps it in a `frame-shell-plan-ring` div for testability; the ring renders at its natural 40px SVG size (close enough to wireframe's 36px for v3.5 ship).

### Finding 2: tsconfig.json JSX exclude pattern for tile-grid tsx files

[KNOWN] `packages/dispatch-workstation/tsconfig.json` excludes all `.tsx` files in `src/tile-grid/` individually (they use JSX but the root tsconfig has no `--jsx` flag; esbuild handles them separately). New `.tsx` files in `src/tile-grid/` MUST be added to the `exclude` list or tsc will error `TS6142: '--jsx' is not set`. This is an established convention (tile-grid-app.tsx, tile.tsx, tile-header.tsx, etc. all excluded); easy to miss on first new file. No followup filed — the exclude pattern is self-documenting in the tsconfig and the tsc error is immediate.

### Finding 3: display:contents for #header-indicators-root

[KNOWN] `#header-indicators-root` is styled with `display: contents` so its children (FrameShellHeader's internal elements) become direct flex children of `#header-bar`. This avoids a double-wrapping flex layout issue where the div would create an independent flex context. The React tree roots at `#header-indicators-root` but the rendered HTML elements participate in `#header-bar`'s flex layout directly.

### Finding 4: Frame dispatch via CSS data attribute — no React unmounting

Frame A↔C switching works via `document.getElementById('shell').setAttribute('data-frame-mode', mode)` in `applyFrameMode()`. CSS selectors hide/show `#console-tile-region` and `#frame-c-root` accordingly. `TileGridApp` stays mounted in the React tree when Frame C is active — it just becomes CSS-invisible. This avoids the complexity of unmounting/remounting React trees on frame switch, and preserves TileGridApp state across frame toggles.

---

## III — Followup Status

**MB-F-T15-MODEL-CHIP-HEX-COLORS-PLACEHOLDER** — CLOSED by §C.1′ ticket #1 (`44764fd`). Canonical hex values applied. Note: STATUS_DOT_HEX + TOKEN_TINT_HEX in tile-header.tsx were not part of the MB-T15 followup closure scope (the followup body listed them but the operator's closure path specified `modelChipColor` switch only; the other tables use CSS var references, not hex literals).

**MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN** — open; deferred to §C.1′ ticket #2 per Q-C1R-1=(b). MixIndicator in toolbar renders all chips at 0 until model field is plumbed.

**MB-F-T27-KILL-EVENT-PROPAGATION** — open; deferred to §C.1′ ticket #2 per Q-C1R-1=(b).

**No new followups filed.** tsconfig JSX exclude pattern (Finding 2) is self-documenting; not worth a followup row.

---

## IV — Outcome Classification

**§C.1′ ticket #1: Capability enabled with known limitations.**

- Frame A/C routing: KNOWN working (tab strip renders, aria-pressed updates, CSS dispatch wires correctly).
- MixIndicator in toolbar: renders zero-state chips (known — MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN open; chips ARE accurate against model field as populated).
- PlanRing in toolbar: renders placeholder until first `coarchitect:rate-limit-update` event.
- Runtime smoke: pending operator visual verification.
