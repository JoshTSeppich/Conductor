# dispatch-workstation spikes

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

Framework choice **locked in** to Electron (2026-04-23). See
`docs/adr/UI-S02-menubar-framework.md` Status section for operator
rationale. UI-F08 (Tauri watch) and UI-F09 (Swift IPC) deprecated on
that commit.

## UI-S03 — Notification click → focus web UI (Electron menu bar)

Ran `spikes/UI-S03-notification-click/run.ts` to verify the Node →
`child_process` → osascript / `open` pipeline that the Electron menu
bar's `Notification.on('click')` handler uses for cross-app focus. 3/3
runnable scenarios passed.

**KNOWN (observed in spike):**

1. Node's `child_process.execFile('osascript', ['-e', <script>])`
   returns stdout + stderr correctly, exits 0 on success.
2. osascript surfaces syntax errors on stderr with diagnostic messages
   and non-zero exit — production click handler can `try/catch` and
   fall back.
3. macOS `open` command resolvable at `/usr/bin/open` and callable
   from `execFile` the same way.
4. **Recommended production path is `open <URL>`**, zero
   default-browser detection. `open` handles: launch-if-not-running,
   focus-existing-tab-on-URL-match, open-new-tab-on-no-match — all in
   one call that respects the operator's default-browser preference.

**MODELED (documented in ADR; not exercised in-spike because they'd
launch browsers on the operator's desktop):**

- Per-browser AppleScript incantations for Chrome / Safari / Firefox
  (cited; NOT recommended for MB-T07 — `open` subsumes them).
- Default-browser detection mechanisms (cited; NOT needed for MB-T07
  since `open` is default-browser-agnostic).
- Electron `Notification.on('click')` firing when Electron
  backgrounded (cited from Electron docs).
- `open <URL>` behavior with URL fragments (`#session=X`) — MB-T07
  integration test confirms once WEB-T routing decides the URL
  convention.

**Failure-mode taxonomy** (five modes, full detail in ADR):

- FM-S03-1: Automation permission denied (only relevant if MB-T07
  ever uses per-browser AppleScript; not relevant for `open` path).
- FM-S03-2: Target browser not running (handled by `open` launching
  default).
- FM-S03-3: Browser running, no matching tab (handled by `open`
  opening new tab).
- FM-S03-4: Multiple browsers, ambiguous default (non-issue; OS
  tracks a single default).
- FM-S03-5: Electron backgrounded, notification still fires (MODELED
  KNOWN via Electron docs).

**Followups filed in ADR:**

- UI-F10 — MB-T07 integration test: `open` + URL-fragment focusing.
- UI-F11 — Revisit AppleScript path only if tab-state readback ever
  needed (not v2 MVP).

See `docs/adr/UI-S03-notification-click.md` for decision rationale,
code snippet for MB-T07, and full failure-mode taxonomy with UX
recommendations.

**MODELED / Out of spike scope:**

- Production code-signing + notarization (each candidate has its own
  distribution story; captured in the ADR but not exercised in the
  spike)
- Auto-update mechanisms (Sparkle / app-store / manual) — same
- Cross-platform beyond macOS (Linux/Windows tracked separately if
  they enter v2 scope)
- Long-running memory leak behavior (spike measures RSS at rest, not
  over 24h sessions)
