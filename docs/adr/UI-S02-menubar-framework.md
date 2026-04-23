# ADR UI-S02: Menu bar framework selection

- **Status:** **PENDING OPERATOR CHOICE**
- **Date:** 2026-04-23
- **Session:** B (UI)
- **Ticket:** UI-S02
- **Informs:** MB-T01 (framework scaffold) — scaffold contents
  determined by the operator's framework pick.

## Context

`packages/dispatch-menubar/` needs a desktop-app framework to deliver:

- macOS tray icon with dynamic badge (awaiting_review session count)
- Click-to-open menu listing all sessions with state controls
- Local notification delivery + click handler (UI-S03 extends this)
- Daemon HTTP + WS consumption per `CONDUCTOR_API_CONTRACT.md` §3/§4/§5
- TypeScript code that imports `packages/dispatch-core/src/v2/schema.ts`
  (operator-published Zod schemas) cleanly

Four candidates were pre-nominated by operator:

| # | Framework | Language split |
|---|---|---|
| A | Tauri 2.x | Rust core + TypeScript/WebView frontend |
| B | Electron 33+ | Node main + Chromium renderer (both JS) |
| C | `menubar` npm | Same as Electron + thin wrapper |
| D | Native Swift + Node bridge | Swift tray/notifications + Node child for TS |

## Evidence

Built one identical 6-capability hello-world per candidate. Full
measurements, per-candidate notes, and known limitations are in
`packages/dispatch-menubar/spikes/UI-S02-framework-choice/evidence.md`.

Headline numbers:

| Axis | Electron | menubar npm | Tauri 2.x | Native Swift+Node |
|---|---|---|---|---|
| Install/runtime disk | 278 MB | 279 MB | ~3–5 MB binary (MODELED) | **85 KB binary** |
| Memory at rest | 150–300 MB (MODELED) | Same | 50–100 MB (MODELED) | 20–40 MB (MODELED) |
| Hello-world first-try? | Yes | Yes | **No** — 3 API-flux errors + icon-format issue | Yes |
| Dev loop | Fast (HMR available) | Fast (HMR available) | Slow cold Rust; fast incremental | Medium (no HMR; 36 s cold) |
| Ecosystem maturity | Very large | Large (ridesit Electron) | Growing; 2.x API still stabilizing | N/A (system framework) |
| Language surface | TS + TS | TS + TS | Rust + TS (two-language) | Swift + TS (two-language) |
| Workspace TS compat | Works; needs `rootDir` or bundler | Works (same) | Works on frontend | Works on Node side |
| Updater | electron-builder + Sparkle/autoUpdater | Same | tauri-plugin-updater | Manual |

## Framework-choice tradeoff shape (for operator review)

The four candidates fall along two axes:

**Runtime weight axis (small → large):** Native Swift → Tauri →
{Electron ≈ menubar npm}

**Developer-complexity axis (single-language → split-language):**
Electron ≈ menubar npm (TS/TS) → Tauri (Rust/TS) → Native Swift+Node
(Swift/TS)

The single-language candidates (Electron, menubar npm) are fastest
to implement, heaviest to ship. The split-language candidates
(Tauri, Native Swift) are lighter to ship, costlier to implement and
maintain (second toolchain, second language, bridge plumbing).

**Menu-bar-specific observation:** menubar npm's wrapper adds value
for popover-style UIs (tray click → HTML popover window). If the
production app uses a context-menu tray (tray click → native menu
items, as the v1 TUI's rhythm implies), menubar npm reduces to
"Electron + a few skipped LOC." Worth surfacing per your earlier
note — the comparison *does* effectively collapse to 3 candidates
if we commit to context-menu interaction.

## Decision

**Pending operator choice.**

Per operator direction: this spike produces evidence, operator
arbitrates. ADR status remains `PENDING OPERATOR CHOICE` until the
operator names the winner in MB-T01's first commit or in a direct
reply to this ADR. On choice, this ADR's Status field is updated to
`Accepted` naming the winner, and MB-T01 implements the framework
scaffold.

### What the ADR will NOT prescribe

- No ranking between the four. Each has a legitimate use case.
- No preferred candidate — the per-axis tradeoffs are real and
  depend on operator priorities (runtime disk vs dev speed, single
  vs split language stack, update/distribution plan).

### What the operator decision should consider

1. **Runtime disk / memory footprint priority.** If operator runs
   many simultaneous CC sessions and cares about total system RAM:
   Native Swift > Tauri > Electron.
2. **Dev-loop priority.** If MB-T01+ wants fast iteration and
   existing JS team velocity: Electron > menubar npm > Tauri >
   Native Swift.
3. **Update/distribution path.** If operator wants an auto-updater
   out of the box: Electron (electron-builder + Sparkle) or Tauri
   (tauri-plugin-updater). Swift requires rolling or adopting
   Sparkle independently.
4. **Two-language tolerance.** Tauri and Native Swift both require
   maintaining a second toolchain. Electron and menubar npm stay in
   TS/JS end-to-end.
5. **UI interaction style.** Context-menu tray (Electron, Tauri,
   Swift all do this natively) vs popover-window tray (menubar npm
   is idiomatic). If popover, menubar npm is the idiomatic pick.

## Followups (per-candidate, filed this ADR)

- **UI-F06** — MB-T01 scaffold based on chosen framework; ADR status
  updated there.
- **UI-F07** — UI-S03 (notification click → focus web UI) is
  framework-scoped; its spike starts *after* this ADR resolves.
- **UI-F08** (Tauri-specific, activate only if Tauri chosen) — Tauri
  2.x tray API stability watch; document current version pin and
  next review cadence.
- **UI-F09** (Swift-specific, activate only if Swift chosen) — design
  Swift↔Node IPC protocol (stdio JSON vs Unix socket) and Node
  bridge's daemon-client integration.

## References

- `packages/dispatch-menubar/spikes/UI-S02-framework-choice/evidence.md`
  — full measurements + per-candidate notes
- `packages/dispatch-menubar/spikes/UI-S02-framework-choice/{electron,menubar-npm,tauri,native-swift}/`
  — hello-world sources (operator can reproduce)
- `CONDUCTOR_API_CONTRACT.md` §4.1 (`/v2/health`), §4.5 (events),
  §5 (WS) — what the chosen framework must consume
- Session B prompt §5 (UI-S02 listed as operator-arbitrated framework
  decision)
- Self-check per contract §10.5: 1 yes · 2 behavior · 3 no · 4 no ·
  5 no · 6 yes · 7 no · 8 n/a · 9 no
- Session B prompt item 8: n/a — UI-S02 is framework evaluation, not
  a daemon-endpoint exercise
