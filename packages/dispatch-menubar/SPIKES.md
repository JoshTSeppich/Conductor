# dispatch-menubar spikes

Consolidated KNOWN facts the production menu bar app will rely on.

## UI-S02 — Menu bar framework selection (evidence for operator choice)

**Status as of this file:** Pending operator choice.

Ran four minimum-viable hello-worlds (one per candidate framework)
and measured against 9 comparison axes. Per operator direction,
this spike produces evidence only; the framework-choice arbitration
is a separate operator decision. See
`docs/adr/UI-S02-menubar-framework.md` for the full decision record
and `spikes/UI-S02-framework-choice/evidence.md` for the consolidated
comparison table.

Per-candidate hello-world subdirectories:

- `spikes/UI-S02-framework-choice/electron/` — Electron 33.x
- `spikes/UI-S02-framework-choice/menubar-npm/` — `menubar` npm wrapper
  over Electron
- `spikes/UI-S02-framework-choice/tauri/` — Tauri 2.x (Rust + WebView)
- `spikes/UI-S02-framework-choice/native-swift/` — Swift/AppKit CLI
  binary with `NSStatusItem`

Each hello-world demonstrates the same 6 capabilities:

1. Tray icon in macOS menu bar
2. Badge count (settable programmatically)
3. Click-to-open menu with "Hello" + "Quit" items
4. Local notification on "Hello" click
5. TypeScript compilation importing `StateEnum` from
   `packages/dispatch-core/src/v2/schema.ts` (workspace type flow; for
   Swift this is verified via a parallel Node build step, see
   `native-swift/README.md`)
6. One-line stdout on startup

**KNOWN** after spike (run date 2026-04-23):

- All four candidates can deliver the 6-capability hello-world,
  though with different levels of initial friction (Tauri 2.x tray
  API flux + RGBA icon requirement caused 2 iteration cycles).
- Runtime disk: Native Swift (85 KB binary) << Tauri (~3-5 MB
  MODELED) << Electron ≈ menubar npm (~278 MB).
- `menubar` npm is Electron + 768 KB wrapper; idiomatic for popover
  tray UIs, ~equivalent to raw Electron for context-menu tray UIs.
- TS workspace type flow works for all four via relative path into
  `packages/dispatch-core/src/v2/schema.ts`. Electron-family hits a
  `dist/` spillage issue when `rootDir` not pinned — production
  sidesteps by using `workspace:*` dep resolution.
- No framework is eliminated on licensing, WebSocket availability, or
  notification API grounds.

See `spikes/UI-S02-framework-choice/evidence.md` for the full table
and per-candidate notes.

**MODELED / Out of spike scope:**

- Production code-signing + notarization (each candidate has its own
  distribution story; captured in the ADR but not exercised in the
  spike)
- Auto-update mechanisms (Sparkle / app-store / manual) — same
- Cross-platform beyond macOS (Linux/Windows tracked separately if
  they enter v2 scope)
- Long-running memory leak behavior (spike measures RSS at rest, not
  over 24h sessions)
