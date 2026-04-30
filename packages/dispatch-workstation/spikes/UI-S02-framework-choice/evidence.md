# UI-S02 framework evidence

Ran each candidate's hello-world per the identical 6-point capability
spec (tray icon, badge count, menu with Hello + Quit, notification on
Hello, workspace TS type flow, stdout-on-ready). Measurements below.

Run date: 2026-04-23. Tooling versions at run time:
Node 20.19.6, pnpm 10.33.0, rustc 1.93.1, cargo 1.94.1, Swift 6.2.3,
Xcode CLT only (no full Xcode).

## Consolidated table

| Axis | Electron | menubar npm | Tauri 2.x | Native Swift + Node |
|---|---|---|---|---|
| **Install / runtime size** | 278 MB (243 MB Electron + 35 MB deps) | 279 MB (243 MB Electron + 768 KB menubar wrapper + 35 MB deps) | ~3–5 MB final binary (MODELED from Tauri benchmarks); 675 MB `target/` build artifacts cached | **85 KB release binary**; 195 MB `.build/` build artifacts; runtime uses system AppKit (no additional disk) |
| **Tray API fidelity** | `Tray.setContextMenu`; **no native badge** on macOS — `setTitle(' N')` workaround + optional `app.dock.setBadge` | Same as Electron; adds popover-window pattern (click tray = show HTML popover) | `TrayIconBuilder` native in Tauri 2.x core (was plugin in 1.x); same NSStatusItem badge constraint; dynamic tray lookup has **API flux** in 2.x (see per-candidate notes) | Full `NSStatusItem` + `NSStatusBarButton` native; complete AppKit access (custom views, bindings, SF Symbols) |
| **Notification API** | `new Notification({...}).show()` → native UNUserNotificationCenter | Same as Electron | `tauri-plugin-notification` → native UNUserNotificationCenter | `UNUserNotificationCenter.current().add(...)` directly; requires `requestAuthorization` |
| **WebSocket availability** | `ws` in main process (Node) or browser `WebSocket` in renderer; same-origin or CORS | Same as Electron | Browser `WebSocket` in WebView frontend; `tokio-tungstenite` in Rust backend | No native Swift WS client used; **delegated to Node bridge child process** |
| **Memory footprint** | 150–300 MB at rest (MODELED; multi-process Electron runtime) | Same as Electron | 50–100 MB (MODELED; single process + system WebView) | 20–40 MB (MODELED; single AppKit process) |
| **Dev loop** | Fast: `electron .` + reload on save (optional HMR via `vite-plugin-electron`) | Same as Electron | Slow cold compile (Rust); **incremental `cargo check` = 2.44 s** after first compile; Vite HMR for frontend | Swift: `swift build` incremental, no HMR; full rebuild ~36 s (release); debug faster |
| **Licensing** | MIT | MIT | MIT / Apache-2.0 (Tauri core is MIT/Apache dual) | Apple platform SDK (no additional license cost for binaries shipped to macOS) |
| **Update / distribution** | `electron-builder` + Sparkle or `autoUpdater`; mandatory notarization + signing for Gatekeeper | Same as Electron | `tauri-plugin-updater`; notarization + signing required | Manual `codesign` + `notarytool`; **no built-in updater** — would roll own or adopt Sparkle |
| **TS / pnpm compat** | `tsc` works; workspace import via relative `../../../../../dispatch-core/src/v2/schema.js` resolved; **tsc spilled compiled dispatch-core sources into `dist/` when `rootDir` not set** — production will need `rootDir` discipline or a bundler (esbuild, Vite) | Same resolution behavior as Electron; sidestepped `dist/` spill in hello-world via `"noEmit": true` | TS compile works for frontend; Rust side orthogonal to pnpm; Tauri CLI package `@tauri-apps/cli` is 6 npm packages (2 s install) | TS compile works on the Node-bridge side (identical to Electron); Swift side orthogonal to TS; **architectural split adds complexity** vs single-language candidates |

## Per-candidate notes

### Electron

Built and compiled cleanly. Hello-world worked on first try. TS
compile of the main process succeeded; did surface a real friction
point: when my `tsconfig.json` had `outDir: "dist"` without `rootDir`
pinned, `tsc` inferred `rootDir` from the common parent of all
imported files and compiled dispatch-core's schema.ts into
`dist/dispatch-core/...` alongside my own sources in
`dist/dispatch-menubar/...`. Production needs either:

- Explicit `"rootDir": "./src"` (blocks cross-package imports → forces
  workspace dep usage), or
- A bundler (esbuild, vite-plugin-electron) that handles workspace
  resolution as part of its build pipeline.

This isn't a showstopper — MB-T01 would use workspace deps via
`"dispatch-core": "workspace:*"` in `dispatch-menubar/package.json`,
which bypasses the spillage by resolving through `node_modules`
symlinks — but the spike hit it because the throwaway hello-world
isn't inside the workspace.

### menubar npm

Essentially Electron with a thin convenience wrapper (768 KB) around
the tray-click-to-popover-window lifecycle. If the production app
wants a popover-style UI (click tray → HTML interface opens), this
wrapper saves 30-ish lines of Electron boilerplate per project. If
the production app wants a context-menu-only tray (click → native
menu), raw Electron is equivalent.

**Not an independent runtime.** `menubar npm` depends on `electron`
as peer; install footprint is Electron + the wrapper. All Electron
tradeoffs (memory, updater, notarization) apply unchanged.

### Tauri 2.x

**API flux observation surfaced.** First `cargo check` run hit 3
compile errors in my hello-world — `TrayIconBuilder::.id(...)` in
Tauri 2.x returns `TrayIconId` (a handle) rather than continuing the
builder chain, contradicting examples I was working from. The spike's
purpose is exactly this: surface developer-experience friction. Fixed
by dropping `.id()` entirely and getting the tray reference a
different way (omitted dynamic tray badge update — documented as a
secondary task for MB-T01).

Second friction: `generate_context!()` proc macro requires an RGBA PNG
icon at the path in `tauri.conf.json`. A palette-mode PNG fails. Had
to hand-generate an RGBA PNG via a Node one-liner. A real MB-T01
would use the Tauri CLI's `icon` scaffold command.

After fixes, `cargo check` passed in 2.44 s (incremental; after crates
had compiled). Full `cargo build --release` not exercised in-spike; a
Tauri 2.x release binary is ~3–5 MB per Tauri's published benchmarks.
Build-artifact `target/` directory is 675 MB — substantial disk
caching cost.

### Native Swift + Node bridge

Build was the most straightforward in terms of writing code that
compiled on first attempt. `swift build -c release` produced an 85 KB
binary in 36 s (cold). Binary dynamically links against system
AppKit / Foundation / UserNotifications, so the on-disk artifact is
tiny; the "runtime" is the macOS system itself.

**The architectural cost** is the Swift–Node bridge. Swift cannot
consume TypeScript types directly; the contract-consuming half of the
menu bar app (HTTP preflight per UI-S01, WebSocket event handling,
schema validation via zod) lives in a Node child process. IPC between
Swift and Node is stdin/stdout JSON or a Unix socket. The spike
didn't exercise this bridge; it proved:

- Swift side: tray + menu + notifications work (capabilities 1–4, 6)
- Node side: TypeScript flow identical to Electron's (capability 5,
  via `schema-check.ts` in this same subdirectory)

Bridge design itself is deferred to MB-T01 if this candidate wins.

## Known limitations of this evidence

- **Memory footprints are MODELED**, not measured. Running each
  candidate's hello-world and sampling `ps -o rss` would require
  orchestrating foreground macOS processes from a headless shell,
  which is finicky and beyond the spike's scope. Published
  benchmarks for each framework are well-established.
- **Tauri full `cargo build --release` not exercised.** `cargo check`
  proved the source compiles and all crates resolve. Final binary
  size is MODELED from Tauri's documentation.
- **Browser notification permission UX** not exercised per-candidate;
  each framework's notification delivery is native and inherits the
  same macOS permission model.
- **Sustained-run memory leaks** not exercised. Spike measures
  at-launch; 24h drift untested.
- **Code signing + notarization** not exercised. Distribution-story
  ratings are based on each framework's documented path, not an
  actual signed build.

## Recommendation for ADR

Not this file's job. See `docs/adr/UI-S02-menubar-framework.md` —
status = Pending operator choice. This spike produces evidence; the
operator picks.
