# Round 2 Parallel Cairn — Export Signatures Contract

**Status:** DRAFT — pending operator review and commit. Frozen at operator's `contract:` commit. Do NOT edit post-launch without operator arbitration and a subsequent `contract:` commit.

**Date:** 2026-04-30

**Authority:** Operator-arbitrated per WORKSTATION_CONTRACT.md §2 + cairn §3.4. This is a frozen pre-launch coordination artifact. Sessions B, C, and D implement to the export signatures defined here exactly. Additive amendments only post-launch; no session may modify export signatures unilaterally.

**Scope reduction from task-brief:** Session E (MB-T05 sub-tasks 2-7) dropped from Round 2 per CRITICAL-2 operator resolution (2026-04-30). Round 2 is 3 build sessions (B, C, D) + 2 zipper sessions + 1 final integration (3+2+1 structure). Session E is reserved in §6 pending V3_TICKETS.md amendment.

---

## §1 — Authority and frozen status

This contract is operator-arbitrated per WORKSTATION_CONTRACT.md §2 (schema and surface authority) and cairn §3.4 (operator-as-author discipline). It is the load-bearing coordination artifact for Round 2 parallel cairn execution.

**Frozen at operator commit.** The `contract:` commit SHA that lands this file is the freeze anchor. Sessions B, C, and D receive this contract before launch and implement to its export signatures exactly. After launch:

- Sessions may NOT amend export signatures unilaterally.
- Sessions may NOT add optional parameters to frozen exports without a `contract:` commit.
- Sessions may NOT rename exported symbols.
- Operator may make additive amendments via `contract:` commit; sessions adopt at their next pre-registration gate.

The zipper sessions (Zipper-1 and Zipper-2) wire the exported symbols from §3–§5 into `main.ts`. If any build session's exported shape diverges from what is specified here, the zipper fails at import time — the export surfaces are the only coordination interface between build sessions and the zipper.

**What this contract governs:**
- TypeScript export surface for each session's new files (§3–§5).
- Test territory per session (§2 territory matrix).
- Zipper phase integration contract (§7).
- Cross-session coordination rules (§8).
- Anticipated failure modes with mitigations (§9).
- Open questions requiring operator resolution before or during session execution (§10).

**What this contract does NOT govern:**
- Internal implementation details — sessions choose within ticket scope.
- `main.ts`: no build session touches it; zipper sessions own all main.ts writes.
- Existing files outside each session's declared territory.

---

## §2 — Session territory matrix

All paths relative to `packages/dispatch-workstation/`. `main.ts touches` is the invariant that the zipper phase depends on; any violation must be surfaced immediately per §9.1.

| Session | Ticket | V3_TICKETS scope ref | Primary new files | Test territory | Frozen exports | main.ts touches |
|---------|--------|---------------------|-------------------|----------------|----------------|-----------------|
| B | MB-T02 | V3_TICKETS.md L111–L115 | `src/main/webview-loader.ts` | `test/integration/mb-t02/` | §3 | NONE |
| C | MB-T03 | V3_TICKETS.md L116–L124 | `src/main/menu.ts`<br>`src/main/window-lifecycle.ts` | `test/integration/mb-t03/` | §4 | NONE |
| D | COARCH-T02 | V3_TICKETS.md L163–L170 + CRITICAL-1 operator resolution 2026-04-30 | `src/coarchitect/daemon-client.ts`<br>`src/coarchitect/chat-panel.tsx`<br>`src/coarchitect/mount.ts`<br>`src/coarchitect/chat-panel.html` | `test/integration/coarch-t02/` | §5 | NONE (React deps added by operator `chore:` commit pre-launch — see §5.5) |
| E | MB-T05 sub-tasks 2-7 | RESERVED — see §6 | — | — | §6 (reserved) | — |

**Territory invariants (all sessions must hold):**

1. Sessions B and C write no file under `src/coarchitect/`.
2. Session D writes no file under `src/main/`.
3. No build session touches `src/main/main.ts` or `src/main/preload.ts`.
4. No session touches `coarchitect/system-prompt.md` (operator-territory, frozen contract per WORKSTATION_CONTRACT.md §3.1 + P-0.4 Q6).
5. No session touches `packages/dispatch-core/` or any other sibling package.
6. Test territory is exclusive: session B writes only within `test/integration/mb-t02/`, session C within `test/integration/mb-t03/`, session D within `test/integration/coarch-t02/`. No session writes test files in another session's territory or in the parent `test/integration/` directory.

**Test file naming convention:** `.test.ts` extension, consistent with the established repo convention at `test/integration/app-launches-clean.test.ts` (MB-T01 green at `151897f`). Note: V3_TICKETS.md names red criteria with `.spec.ts` extension; sessions use `.test.ts` in actual file creation.

---

## §3 — Session B: MB-T02 webview loader

**Ticket:** MB-T02 (V3_TICKETS.md L111–L115)
**Scope:** Load dispatch-web SPA into the Electron BrowserWindow that `main.ts` creates. Daemon connection works via existing HTTP/SSE/WS (CONDUCTOR_API_CONTRACT.md surface — no new dispatch-web code).

### §3.1 Module path

```
packages/dispatch-workstation/src/main/webview-loader.ts
```

### §3.2 Frozen exports (TypeScript signatures)

```typescript
import type { BrowserWindow } from 'electron';

/**
 * Dev-server URL for dispatch-web per UI-S03 ADR §1 click-handler pattern.
 * Value: 'http://localhost:7878'
 * Production-mode loading is NOT in scope for MB-T02 — deferred to MB-T08
 * per IMPORTANT-5 operator resolution 2026-04-30.
 */
export const WEB_UI_URL: string;

/**
 * Loads the dispatch-web SPA dev-server into an existing BrowserWindow.
 * Resolves when BrowserWindow.loadURL() resolves (mirrors its Promise contract).
 * Dev-mode only. No production-mode fallback in this module.
 */
export function loadDispatchWeb(win: BrowserWindow): Promise<void>;
```

### §3.3 What `loadDispatchWeb` MUST do (per ticket spec)

- Call `win.loadURL(WEB_UI_URL)` (or functional equivalent) and return its Promise.
- Not mutate `BrowserWindow.webPreferences` — those are set by `main.ts` at window-creation time.
- Not register any IPC handlers — IPC handler registration is Session D / Zipper-2 territory.
- Not call `app.on(...)` or any app-lifecycle API — lifecycle is Session C / window-lifecycle.ts territory.

### §3.4 What `loadDispatchWeb` MUST NOT do

- Implement a production-mode static fallback (deferred to MB-T08 per IMPORTANT-5 operator resolution 2026-04-30). Session B files `MB-F-MB-T02-PROD-LOADING` in `docs/FOLLOWUPS.md` at green-commit time.
- Open new BrowserWindows — exactly one window is created by `main.ts`.
- Touch `main.ts`, `preload.ts`, `menu.ts`, `window-lifecycle.ts`, or any file in `src/coarchitect/`.

### §3.5 Red criterion test

File: `packages/dispatch-workstation/test/integration/mb-t02/dispatch-web-renders-in-shell.test.ts`

Maps to V3_TICKETS.md L114: *"`test_dispatch_web_renders_in_shell.spec.ts` — launch app with daemon running, assert kanban columns render (AWAITING REVIEW / STALE / RUNNING / IDLE), assert session card appears when daemon has registered sessions."*

Uses MB-S04 ADR spawn-and-observe primitives (WINDOW_READY sentinel via stdout, stdin QUIT for deterministic exit). DOM content assertion requires a mechanism for reading renderer-process DOM from the parent vitest process.

**OPEN-Q-B-1:** DOM assertion mechanism for the red criterion. Options: (a) Playwright Electron driver (`@playwright/test` + Electron launch config), (b) Chrome DevTools Protocol via `--remote-debugging-port` flag, (c) other. Session B surfaces its chosen mechanism in the pre-registration gate. Operator acks before red commit. Low-stakes for Round 2; operator may revisit at MB-T07.

### §3.6 Zipper-1 integration point

Zipper-1 adds to `main.ts` createWindow():

```typescript
import { loadDispatchWeb } from './webview-loader.js';
// After BrowserWindow construction, before returning:
await loadDispatchWeb(mainWindow);
```

Zipper-1 does not modify `webview-loader.ts`.

---

## §4 — Session C: MB-T03 menu + window lifecycle

**Ticket:** MB-T03 (V3_TICKETS.md L116–L124)
**Scope:** Standard macOS application menu with keyboard shortcuts + window-size/position persistence across launches.

### §4.1 Module paths

```
packages/dispatch-workstation/src/main/menu.ts
packages/dispatch-workstation/src/main/window-lifecycle.ts
```

### §4.2 Frozen exports — `menu.ts`

```typescript
import type { MenuItemConstructorOptions } from 'electron';

/**
 * Returns the full macOS application menu template.
 * Required sections per MB-T03 spec (V3_TICKETS.md L119):
 *   App / File / Edit / View / Window / Help
 * Required keyboard shortcuts (minimum per V3_TICKETS.md L119):
 *   Cmd+W (close window), Cmd+Q (quit),
 *   Cmd+Z (undo), Cmd+X/C/V (cut/copy/paste),
 *   Cmd+M (minimize), Cmd+H (hide), Cmd+Option+H (hide others).
 * Exported separately from registerApplicationMenu() so tests can
 * assert menu structure without side effects.
 */
export function buildMenuTemplate(): MenuItemConstructorOptions[];

/**
 * Builds the full menu from buildMenuTemplate() and registers it as
 * the application menu via Electron's Menu.setApplicationMenu().
 * Called once by Zipper-1 inside app.whenReady().
 * No-op if called more than once (idempotent guard recommended).
 */
export function registerApplicationMenu(): void;
```

### §4.3 Frozen exports — `window-lifecycle.ts`

```typescript
import type { App, BrowserWindow, BrowserWindowConstructorOptions } from 'electron';

/**
 * Default window dimensions used when no saved state exists.
 * Also used to clamp restored dimensions to sane minimums.
 */
export interface WindowSizeDefaults {
  readonly width: number;
  readonly height: number;
}

/**
 * Creates a BrowserWindow with cross-launch size/position persistence applied.
 * Reads saved geometry from the persistence store (OPEN-Q-C-1);
 * falls back to opts.width / opts.height when no saved state exists.
 * Registers save-on-close internally — caller does not need to manage lifecycle.
 *
 * Zipper-1 replaces main.ts's `new BrowserWindow(opts)` call with this function.
 * All BrowserWindowConstructorOptions (webPreferences, show, etc.) pass through
 * from opts; only width/height/x/y are overridden by persistent state.
 *
 * OPEN-Q-C-1: Underlying persistence library — electron-window-state vs.
 * electron-store-manual vs. custom. Session C chooses and documents at
 * pre-registration gate.
 */
export function createManagedWindow(
  opts: WindowSizeDefaults & BrowserWindowConstructorOptions,
): BrowserWindow;

/**
 * Registers macOS app lifecycle hooks on the Electron App object:
 *   - 'window-all-closed': calls app.quit()
 *     (supersedes the inline handler currently in main.ts scaffold;
 *      Zipper-1 removes the inline handler and calls this instead)
 *   - 'activate': calls reopenWindow() when getWindow() returns null
 *     (dock-icon click with no open window — macOS convention)
 *
 * Called once by Zipper-1 inside app.whenReady() after createManagedWindow().
 *
 * @param app          The Electron App singleton
 * @param getWindow    Returns the current main BrowserWindow or null
 * @param reopenWindow Callback that creates a new main window (used by activate)
 */
export function registerLifecycleHooks(
  app: App,
  getWindow: () => BrowserWindow | null,
  reopenWindow: () => void,
): void;
```

### §4.4 What Session C MUST do

- Implement all six menu sections with standard macOS HIG keyboard shortcuts at minimum (V3_TICKETS.md L119).
- Implement `createManagedWindow` so that launch → resize → quit → relaunch restores the saved window size and position (red criterion).
- Implement `registerLifecycleHooks` so its `window-all-closed` handler supplants the inline `app.on('window-all-closed', () => app.quit())` currently in `main.ts` at `151897f`.

### §4.5 What Session C MUST NOT do

- Touch `main.ts`, `preload.ts`, `webview-loader.ts`, or any file under `src/coarchitect/`.
- Register the application menu or lifecycle hooks at module-initialization time (side-effect-free exports; Zipper-1 wires them explicitly).

### §4.6 Red criterion test

File: `packages/dispatch-workstation/test/integration/mb-t03/window-state-persists.test.ts`

Maps to V3_TICKETS.md L121: *"`test_window_state_persists.spec.ts` — launch, resize, quit, relaunch, assert size/position restored."*

Uses MB-S04 ADR spawn-and-observe primitives (WINDOW_READY sentinel, stdin QUIT, ~1.3 s dev-mode cycle per K8). Two spawn cycles required: first to set state, second to verify restoration.

**OPEN-Q-C-1:** Window-state persistence library. Options: (a) `electron-window-state` (npm package, established), (b) `electron-store` with manual save/restore logic, (c) custom implementation using `app.getPath('userData')` + JSON file. Session C surfaces choice at pre-registration gate. Operator acks.

**Dock badge: out of scope for MB-T03** (RESOLUTION-2, operator 2026-04-30). The permissive "if relevant" language in V3_TICKETS.md L120 is stripped from Session C's frozen surface. Session C files `MB-F-MB-T03-DOCK-BADGE` in `docs/FOLLOWUPS.md` at its docs sub-task. A future ticket handles the dock-badge implementation.

### §4.7 Zipper-1 integration points in `main.ts`

Zipper-1 modifies `main.ts` to wire both session C modules:

1. Add imports: `{ buildMenuTemplate, registerApplicationMenu }` from `'./menu.js'`.
2. Add imports: `{ createManagedWindow, registerLifecycleHooks }` from `'./window-lifecycle.js'`.
3. Replace `new BrowserWindow({ width: 1024, height: 768, ... })` with `createManagedWindow({ width: 1024, height: 768, ... })`.
4. Remove inline `app.on('window-all-closed', () => app.quit())`.
5. In `app.whenReady()` callback, add: `registerApplicationMenu()` and `registerLifecycleHooks(app, () => mainWindow, createWindow)`.

Zipper-1 does not modify `menu.ts` or `window-lifecycle.ts`.

---

## §5 — Session D: COARCH-T02 chat panel UI scaffold

**Ticket:** COARCH-T02 (V3_TICKETS.md L163–L170)

**Scope (per CRITICAL-1 operator resolution 2026-04-30):** UI scaffold only. React component renders conversation history, accepts input, displays thinking state. Daemon calls are mocked via a stub implementation; no real `/v3/*` HTTP wiring. The `DaemonClient` interface is frozen here so the real implementation (COARCH-T01 / COARCH-T02b) can swap in without changing any call site.

This is a deliberate scope narrowing from V3_TICKETS.md's COARCH-T02 Green criterion ("wire to daemon endpoints from COARCH-T01, render history on mount") because COARCH-T01 is not in Round 2. The daemon-endpoint wiring defers to a follow-on ticket (COARCH-T02b or absorbed into COARCH-T03 per operator sequencing at that time). V3_TICKETS.md acceptance criterion ("persists to daemon, survives app restart with history intact") is NOT met by Session D's scope; it is met when the real DaemonClient swaps in.

### §5.1 Module paths

```
packages/dispatch-workstation/src/coarchitect/daemon-client.ts
packages/dispatch-workstation/src/coarchitect/chat-panel.tsx
packages/dispatch-workstation/src/coarchitect/mount.ts
packages/dispatch-workstation/src/coarchitect/chat-panel.html   (not a TS module — renderer entry point)
```

**Zipper-2 territory (NOT Session D):**
```
packages/dispatch-workstation/src/main/coarchitect-ipc.ts       (main-process IPC handlers — created by Zipper-2, not Session D)
```

Note: `coarchitect/system-prompt.md` exists at repo root `packages/dispatch-workstation/coarchitect/` and is operator-territory. Session D's new files land in `src/coarchitect/` (the TypeScript source tree), not in the root `coarchitect/` directory. These are distinct paths. The generator script at `scripts/generate-section-10-5.ts` and its output (`src/coarchitect/section-10-5.generated.ts`) are pre-existing operator-managed artifacts; Session D does NOT touch the generator or its output.

### §5.2 Frozen exports — `daemon-client.ts`

```typescript
/**
 * Persisted message shape. Fields are structurally compatible with
 * OrchestratorMessageRow from dispatch-core/src/v3/schema.ts (field names,
 * types, and nullability match). Defined as a local type here to avoid
 * a reach-in import during scaffold; Zipper-2 may replace with the
 * v3-schema import once dispatch-core's public export surface is confirmed
 * (OPEN-Q-D-2).
 */
export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly created_at: string;           // ISO-8601 datetime string
  readonly build_doc_id: string | null;
  readonly build_doc_commit_sha: string | null;
}

/**
 * Write-side shape for posting a new message. Structurally compatible with
 * OrchestratorMessage from dispatch-core/src/v3/schema.ts.
 */
export interface ChatMessageInput {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly build_doc_id?: string | null;
  readonly build_doc_commit_sha?: string | null;
}

/**
 * The frozen interface that both the stub (Session D) and the real daemon
 * client (COARCH-T01 / COARCH-T02b) must implement. Zipper-2 swaps the
 * stub for the real implementation without changing any call site that
 * receives a DaemonClient.
 */
export interface DaemonClient {
  /** Returns all persisted messages ordered oldest-first. */
  fetchHistory(): Promise<ChatMessage[]>;
  /**
   * Appends a message to the store. Returns the persisted row with
   * server-assigned id and created_at.
   */
  postMessage(msg: ChatMessageInput): Promise<ChatMessage>;
}

/**
 * Returns a stub DaemonClient for use in tests and the Round 2 dev harness.
 * fetchHistory() returns a fixed static list of 2-3 synthetic messages.
 * postMessage() echoes the input back with a generated id and current timestamp.
 * No HTTP calls. No side effects.
 */
export function createStubDaemonClient(): DaemonClient;
```

### §5.3 Frozen exports — `chat-panel.tsx`

```typescript
import type { DaemonClient } from './daemon-client.js';

export interface ChatPanelProps {
  /** DaemonClient injected at mount time. Stub in Round 2; real in follow-on. */
  readonly daemonClient: DaemonClient;
}

/**
 * Chat panel React component per COARCH-T02 spec (V3_TICKETS.md L164–L166).
 * Renders:
 *   - Conversation history (fetched from daemonClient on mount via fetchHistory())
 *   - Text input field + send button
 *   - Thinking indicator (displayed during postMessage round-trip)
 * No Anthropic SDK wiring. Thinking state is simulated during postMessage latency.
 * Placeholder responses: after postMessage resolves, history refreshes from stub.
 */
export function ChatPanel(props: ChatPanelProps): JSX.Element;
```

### §5.4 Frozen exports — `mount.ts`

```typescript
import type { DaemonClient } from './daemon-client.js';

export interface ChatPanelMountOptions {
  /** ID of the DOM element into which the React root is mounted. */
  readonly rootElementId: string;
  readonly daemonClient: DaemonClient;
}

/**
 * Mounts the ChatPanel React component into the DOM element identified
 * by rootElementId using React 18's createRoot API.
 * Returns an unmount function. Caller invokes it on cleanup.
 *
 * Called from chat-panel.html's bundled renderer script (Session D's
 * build output). Zipper-2 loads chat-panel.html into a BrowserWindow
 * or bottom-drawer panel.
 *
 * DaemonClient reaches the renderer via contextBridge IPC (Pattern B,
 * RESOLUTION-3 operator 2026-04-30). The renderer calls
 * window.coarchitectBridge.fetchHistory() / postMessage(), exposed by
 * preload.ts. The main-process relay lives in coarchitect-ipc.ts
 * (Zipper-2 territory). Session D's DaemonClient interface is the
 * contract both sides implement against.
 */
export function mountChatPanel(opts: ChatPanelMountOptions): () => void;
```

### §5.5 Package.json scope for Session D

**RESOLVED — Path A (RESOLUTION-1, operator 2026-04-30):** Operator commits a `chore:` dep-addition commit before any build session launches, adding `react`, `react-dom`, `@types/react`, `@types/react-dom`, and the renderer build tooling to `packages/dispatch-workstation/package.json`. All three sessions (B, C, D) start from the same lockfile state. No lockfile conflict risk.

**Session D does NOT modify `package.json` or `pnpm-lock.yaml`.** If Session D discovers a missing dependency during implementation, it halts and surfaces to operator; operator amends the pre-launch `chore:` commit or issues a follow-on `chore:` commit, then acks Session D to resume. Session D does not run `pnpm install` unilaterally.

**Sessions B and C do NOT run `pnpm install`** at any point during Round 2. The lockfile is the operator's sole responsibility during the build phase. If a workspace sync issue surfaces in B or C, they halt and surface rather than running install. See §8.8 for conflict protocol if needed.

### §5.6 Renderer entry point

Session D creates `src/coarchitect/chat-panel.html` — the renderer-process entry point that Zipper-2 loads into a BrowserWindow (or drawer panel). This HTML file references the compiled output of `mount.ts` (bundled by Session D's chosen build tool). It is not an exported TypeScript module but is a primary deliverable for Zipper-2's integration.

### §5.7 What Session D MUST NOT do

- Touch `src/main/main.ts`, `src/main/preload.ts`, `src/main/webview-loader.ts`, `src/main/menu.ts`, or `src/main/window-lifecycle.ts`.
- Touch `coarchitect/system-prompt.md` or `scripts/generate-section-10-5.ts`.
- Wire real `/v3/*` daemon HTTP calls — stub only in Round 2.
- Wire Anthropic SDK — that is COARCH-T03.
- Modify `packages/dispatch-core/` or any sibling package.

### §5.8 Red criterion tests

Files:
- `packages/dispatch-workstation/test/integration/coarch-t02/chat-panel-renders.test.ts`
  Maps to V3_TICKETS.md L165: *"`test_chat_panel_renders.spec.ts`"*
- `packages/dispatch-workstation/test/integration/coarch-t02/chat-input-emits-event.test.ts`
  Maps to V3_TICKETS.md L165: *"`test_chat_input_emits_event.spec.ts`"*

Tests use `createStubDaemonClient()` from `daemon-client.ts`. The stub returns static data and does not exercise the contextBridge IPC path (Pattern B, RESOLUTION-3); tests remain valid because `mountChatPanel` receives the `DaemonClient` interface directly, decoupled from the bridge wiring that Zipper-2 owns.

**Renderer testing mechanism:** Session D surfaces its chosen approach at pre-registration gate. Options: (a) Vitest + jsdom (unit-level, mocks `window.coarchitectBridge` directly — recommended given Pattern B resolution), (b) Electron-spawned renderer via MB-S04 primitives (integration-level, ~1.3 s), (c) Playwright Electron driver. Operator acks at pre-registration gate.

### §5.9 Zipper-2 integration points

Zipper-2 modifies `main.ts` and `src/main/preload.ts`, and creates `src/main/coarchitect-ipc.ts`:

1. `main.ts`: adds a second BrowserWindow (or drawer panel, per OPEN-Q-ZIPPER-1 resolution) that loads `src/coarchitect/chat-panel.html` from Session D's build output.
2. `src/main/preload.ts`: adds `contextBridge.exposeInMainWorld('coarchitectBridge', { fetchHistory, postMessage })` — the IPC surface the renderer calls (Pattern B, RESOLUTION-3, operator 2026-04-30).
3. `src/main/coarchitect-ipc.ts` (NEW file — Zipper-2 territory, not Session D): implements the main-process handlers that relay `fetchHistory()` / `postMessage()` IPC calls to the daemon endpoints or stub.
4. Zipper-2 does NOT modify `daemon-client.ts`, `chat-panel.tsx`, or `mount.ts`.

---

## §6 — Session E: RESERVED — MB-T05 sub-tasks 2-7

**Status:** RESERVED. Session E is dropped from Round 2 per CRITICAL-2 operator resolution (2026-04-30).

**Reason:** MB-T05 sub-tasks 2-7 require an explicit V3_TICKETS.md amendment enumerating each sub-task before a session can be scoped. The MB-T05 env allowlist amendment (at commit `01054a0`, `docs/adr/MB-T05-env-allowlist-amendment.md`) explicitly states: "sub-tasks 2–7 explicitly deferred until MB-T01–MB-T04 land + a V3_TICKETS.md spec is committed." No such amendment has been committed. Anti-fabrication discipline (cairn finding #54 — consumer-survey discipline; cairn anti-fabrication) forbids inventing sub-tasks from the MB-T05 ticket prose alone.

**Next step:** Operator amends V3_TICKETS.md to enumerate MB-T05 sub-tasks 1-7 explicitly after MB-T01–MB-T04 are complete. Session E launches in a future round (Round 3 or separate parallel cairn run) after that amendment commits and operator acks a new export signatures contract for the spawn handler module (`packages/dispatch-workstation/src/main/spawn-handler.ts` or similar). The env allowlist from `docs/adr/MB-T05-env-allowlist-amendment.md` §3 remains authoritative for the spawn handler's env construction once Session E begins.

**Frozen exports for Round 2:** None. §6 is reserved.

**Round 2 final session count:** 3 (B + C + D). E reserved for future round.

---

## §7 — Zipper phase contract (3+2+1 structure)

Per IMPORTANT-4 operator resolution (2026-04-30): Round 2 has 3 build sessions, making the structure 3+2+1. The two-zipper split is preserved because Sessions B and C share main-process territory (Zipper-1) and Session D has renderer-process territory (Zipper-2) — they parallelize cleanly.

### §7.1 Phase structure

```
BUILD PHASE — parallel, all three start together after operator chore: dep commit:
  Session B → MB-T02: src/main/webview-loader.ts
  Session C → MB-T03: src/main/menu.ts + src/main/window-lifecycle.ts
  Session D → COARCH-T02: src/coarchitect/* (chat panel UI scaffold)

ZIPPER PHASE — parallel, after all three build sessions have pushed final commits:
  Zipper-1 → wires B + C into main.ts (main-process integration only)
  Zipper-2 → wires D into main.ts + renderer-process bridge

FINAL INTEGRATION — serial, after both zippers complete and merge:
  Final → full test suite, typecheck, manual launch verification,
          cross-cutting findings, cairn ledger update
```

### §7.2 Zipper-1 contract

**Territory:** `packages/dispatch-workstation/src/main/main.ts` (main-process wiring only).

**Pre-conditions before Zipper-1 begins:**
- Session B has pushed `src/main/webview-loader.ts` with frozen exports per §3.2. Green commit merged.
- Session C has pushed `src/main/menu.ts` and `src/main/window-lifecycle.ts` with frozen exports per §4.2–§4.3. Green commit merged.
- Both sessions' test suites pass: `pnpm --filter dispatch-workstation test` exits 0.
- Neither session has touched `main.ts`: `git log --oneline packages/dispatch-workstation/src/main/main.ts` shows `green(MB-T01)` at `151897f` as the last touching commit. Any other commit in that log is a §9.1 violation; Zipper-1 halts.

**Zipper-1 writes to `main.ts` (per §3.6 + §4.7 integration points):**
1. Add imports for `loadDispatchWeb` and `WEB_UI_URL` from `'./webview-loader.js'`.
2. Add imports for `registerApplicationMenu` from `'./menu.js'`.
3. Add imports for `createManagedWindow`, `registerLifecycleHooks` from `'./window-lifecycle.js'`.
4. Replace `new BrowserWindow({ width: 1024, height: 768, ... })` with `createManagedWindow({ width: 1024, height: 768, ... })`.
5. Add `await loadDispatchWeb(mainWindow)` after window construction in `createWindow()`.
6. Remove the inline `app.on('window-all-closed', () => app.quit())`.
7. In `app.whenReady()`: add `registerApplicationMenu()`.
8. In `app.whenReady()`: add `registerLifecycleHooks(app, () => mainWindow, createWindow)`.

**Zipper-1 exit gate:** `pnpm --filter dispatch-workstation test` passes. Manual launch shows dispatch-web kanban in BrowserWindow. macOS menu bar renders correctly. Window size/position persists across relaunch.

### §7.3 Zipper-2 contract

**Territory:** `packages/dispatch-workstation/src/main/main.ts` (renderer BrowserWindow wiring), `src/main/preload.ts` (contextBridge exposure — Pattern B resolved), and `src/main/coarchitect-ipc.ts` (new file — main-process IPC handlers).

**Pre-conditions before Zipper-2 begins:**
- Session D has pushed all files in §5.1 with frozen exports per §5.2–§5.4. Green commit merged.
- Session D's test suite passes.
- Session D has NOT touched `main.ts` or `preload.ts`.
- Pattern B (contextBridge/IPC) is the resolved renderer pattern (RESOLUTION-3, operator 2026-04-30); no further pre-condition on renderer calling pattern.
- OPEN-Q-ZIPPER-1 has been resolved (operator decided: bottom drawer vs. separate BrowserWindow for Round 2).

**Zipper-2 runs parallel to Zipper-1.** Territory does not overlap: Zipper-1 wires main-process imports for `webview-loader.ts` / `menu.ts` / `window-lifecycle.ts`; Zipper-2 wires the renderer bridge for `coarchitect/`. If both zippers edit `main.ts` concurrently, they must coordinate via separate tracked branches and merge carefully. The Final integration phase handles the reconciliation commit.

**Zipper-2 writes (per §5.9):**
1. `main.ts`: adds BrowserWindow or drawer panel loading `chat-panel.html` (per OPEN-Q-ZIPPER-1 resolution).
2. `src/main/preload.ts`: adds `contextBridge.exposeInMainWorld('coarchitectBridge', ...)` (Pattern B, RESOLUTION-3).
3. `src/main/coarchitect-ipc.ts` (NEW): main-process IPC handlers relaying renderer calls to daemon or stub.
4. Zipper-2 does NOT modify `daemon-client.ts`, `chat-panel.tsx`, or `mount.ts`.

**Zipper-2 exit gate:** `pnpm --filter dispatch-workstation test` passes. Manual launch shows chat panel with stub data rendered. Kanban (MB-T02) and chat panel (COARCH-T02) coexist without crash.

### §7.4 Final integration

**Pre-conditions:** Both Zipper-1 and Zipper-2 have pushed their commits and branches are merged (or merge is performed as the first Final action).

**Final does:**
1. Merge Zipper-1 and Zipper-2 if not already done. Resolve any `main.ts` conflicts (expected merge point is the renderer-bridge import additions from Zipper-2 layered on top of Zipper-1's main-process wiring).
2. Run `pnpm --filter dispatch-workstation test` — full suite must pass.
3. Run `pnpm --filter dispatch-workstation typecheck`.
4. Run existing daemon tests: `pnpm --filter dispatch-daemon test` — no regressions.
5. Manual launch verification: kanban renders, chat panel renders with stub data, macOS menu bar correct, window state persists across quit/relaunch.
6. Write findings to `docs/cairn-findings.md` (continuing from #55) and to the Final subsection of `docs/parallel-cairn-round-2/notes.md`.
7. File any cross-cutting `MB-F-*` followups in `docs/FOLLOWUPS.md` (including the MB-T02 production-loading followup per §3.4, `MB-F-MB-T03-DOCK-BADGE` per §4.6/OPEN-Q-C-2, and any OPEN-Q-ZIPPER-1 deferred items).

### §7.5 Main.ts integrity check (mandatory pre-zipper)

Before either zipper session begins, the following command must be run and its output verified:

```bash
git log --oneline packages/dispatch-workstation/src/main/main.ts
```

Expected: `151897f` (`green(MB-T01)`) is the most recent commit touching this file. Any commit from Session B, C, or D appearing after `151897f` is a territory violation per §9.1. Zipper must halt and surface to operator before proceeding.

---

## §8 — Cross-session coordination

### §8.1 Coordination notes file

File: `docs/parallel-cairn-round-2/notes.md`

Does not exist at contract-commit time. Operator or the first-committing session creates it. Structure:

```markdown
# Round 2 parallel cairn — coordination notes

## Session B (MB-T02)
<!-- B appends findings, primitive remediations, pre-reg gate acks -->

## Session C (MB-T03)
<!-- C appends below -->

## Session D (COARCH-T02)
<!-- D appends below -->

## Zipper-1
<!-- Zipper-1 appends below -->

## Zipper-2
<!-- Zipper-2 appends below -->

## Final integration
<!-- Final appends below -->
```

Sessions do NOT edit other sessions' subsections. Cross-session findings go in the noting session's own subsection with an explicit cross-reference (e.g., "Propagating B's primitive remediation: ...").

### §8.2 Per-path `git add` discipline

`git add -A` and `git add .` are forbidden in all of B, C, D, Zipper-1, Zipper-2, and Final. Every stage uses explicit paths:

```bash
# Session B example
git add packages/dispatch-workstation/src/main/webview-loader.ts
git add packages/dispatch-workstation/test/integration/mb-t02/dispatch-web-renders-in-shell.test.ts
```

Rationale: prevents accidental staging of `dist/` artifacts, lockfile drift from unauthorized `pnpm install`, or files belonging to another session.

### §8.3 Per-commit-push discipline

Every commit is immediately pushed. No accumulating unpushed commits. Sessions pull before every new commit cycle to detect territory violations early (a push from another session appearing in `git log` for a file in your territory is an immediate halt signal).

### §8.4 9-question self-check in every commit body

Per CONDUCTOR_API_CONTRACT.md §10.5 — all 9 questions answered in every commit body for B, C, D, both zippers, and Final:

1. Is the API I called verified by a spike in this repo? [yes / n/a]
2. Does my test exercise behavior, or my mocks? [behavior / MIXED / MOCKS]
3. If implementation deleted, would test still pass? [yes / no]
4. Did I add anything outside this contract's specification? [yes / no]
5. Did I modify this contract without operator approval? [yes / no — if yes, REVERT]
6. Is any claim in my commit body unlabeled? [yes / no]
7. Did this commit touch any file the other parallel session might also modify? [yes / no — if yes, surface to operator]
8. Does this commit change session state via direct registry write, bypassing PATCH /v2/sessions/:name/state? [yes / no — if yes, wrong path, fix]
9. Did I do work during a halt state that wasn't explicitly authorized? [yes / no — if yes, surface]

### §8.5 Halt-and-surface on any ambiguity

Cairn §3.7: any ambiguity surfaces to operator immediately. Sessions do not infer-around contract gaps. Protocol: halt → surface → await operator ack → resume. This applies even when the uncertainty feels minor.

### §8.6 Within-session self-correction disclosure

When a session catches its own primitive failure and remediates, the remediation is explicitly disclosed in the commit body:

```
Self-correction: [what was wrong] → [what was fixed]
Confidence: [revised label]
```

### §8.7 Cross-session methodology propagation

If Session B catches a primitive failure and remediates it, B writes the finding to its `docs/parallel-cairn-round-2/notes.md` subsection. Sessions C and D read B's notes at their next pre-registration gate and adopt the remediation for remaining work. The methodology improvement propagates forward; sessions do not re-discover it independently.

### §8.8 Lockfile conflict protocol

**RESOLUTION-1 (operator 2026-04-30):** React deps are pre-installed via operator's `chore:` commit before any session launches. No build session owns `package.json` or the lockfile. Session D does NOT touch `package.json` (see §5.5).

Consequently, no session-triggered lockfile conflicts are anticipated. If a lockfile conflict surfaces anyway (e.g., from an incidental `pnpm install` run):
1. Operator resolves via `pnpm install` regeneration on a clean checkout.
2. Operator commits the reconciled lockfile.
3. Sessions B, C, and D do NOT run `pnpm install` at any point during Round 2 unless operator explicitly authorizes it in writing.
4. Any unauthorized `pnpm install` run by B, C, or D is a territory violation — commit the resulting lockfile change and surface immediately; do not let it ride silently.

---

## §9 — Failure modes anticipated

Drawn from Round 1 evidence and Round 2 architecture.

### §9.1 Sessions touching main.ts despite the contract

**Pattern (Round 1 incident):** A build session edits `main.ts` to wire its own exports, reasoning that it's necessary for the test to pass or that the zipper will "just fix it later."

**Detection:** `git log --oneline packages/dispatch-workstation/src/main/main.ts` shows a build-session commit after `151897f`. `§7.5` mandatory check. Q7 in self-check ("did this commit touch any file the other parallel session might also modify?") should have caught it.

**Mitigation:** Tests for Session B and C must pass without any `main.ts` edits — the webview-loader, menu, and window-lifecycle functions are independently testable. If a session believes a `main.ts` touch is unavoidable, it halts and surfaces before making the touch. Zipper sessions, not build sessions, own `main.ts` integration.

### §9.2 Export signature drift

**Pattern:** A session adds an optional parameter or a new overload to a frozen export (e.g., `loadDispatchWeb(win: BrowserWindow, opts?: { timeout?: number })`), reasoning that "it's just optional and doesn't break callers."

**Detection:** Zipper sessions compare import shapes against this contract at integration time. TypeScript strict mode will surface shape mismatches.

**Mitigation:** Any export shape change — including optional additions — requires a `contract:` commit amending §3–§5 before the change lands. No unilateral export surface changes. Sessions surface to operator and await ack.

### §9.3 Test territory overlap

**Pattern:** Session C accidentally writes a test to `test/integration/mb-t02/`, or two sessions produce a file with the same name in adjacent directories.

**Detection:** Q7 in self-check. `git pull` before push reveals collision. Per-path `git add` prevents accidental cross-territory staging.

**Mitigation:** Explicit test territory in §2 territory matrix. Sessions verify their test file paths before every `git add`. If a name collision is discovered post-push, operator decides which session's file takes precedence; the other session renames and amends.

### §9.4 Lockfile thrashing

**Pattern:** A build session runs `pnpm install` (to add a dependency or resolve a workspace sync issue), producing a divergent lockfile state that conflicts at merge.

**Mitigation:** No build session is authorized to touch the lockfile (React deps pre-installed by operator `chore:` commit, RESOLUTION-1). Sessions B, C, and D must not run `pnpm install`. If a workspace sync is needed, halt and surface to operator rather than running install unilaterally.

### §9.5 `DaemonClient` stub / real-implementation shape divergence

**Pattern:** Session D's `ChatMessage` interface drifts from `OrchestratorMessageRow` in `dispatch-core/src/v3/schema.ts`. When the real daemon client swaps in for COARCH-T02b, TypeScript errors surface at the call sites.

**Mitigation:** §5.2 specifies `ChatMessage` with fields that must match `OrchestratorMessageRow` (field names, types, nullability documented in the interface). Session D's green commit body must include a field-by-field structural compatibility check against the v3 schema. OPEN-Q-D-2 defers the import decision to Zipper-2 but does not defer the structural compatibility check.

### §9.6 Renderer architecture ambiguity causing Zipper-2 rework

**Pattern:** Session D implements direct-fetch renderer (Pattern A), but Zipper-2 was briefed expecting contextBridge/IPC (Pattern B). Zipper-2 arrives and redesigns the bridge, adding delay and introducing `preload.ts` changes Session D's tests weren't written against.

**Mitigation:** RESOLVED by RESOLUTION-3 (operator 2026-04-30). Pattern B (contextBridge/IPC) is locked: renderer calls `window.coarchitectBridge.*`, `preload.ts` exposes it, `src/main/coarchitect-ipc.ts` implements main-process handlers (Zipper-2 territory). Session D implements the renderer side against the frozen `window.coarchitectBridge.*` surface; Zipper-2 wires the bridge. This failure mode is eliminated — no pattern ambiguity remains for Session D or Zipper-2.

### §9.7 Zipper-1 and Zipper-2 `main.ts` conflict

**Pattern:** Both zippers edit `main.ts` concurrently (they run in parallel per §7.1). Zipper-1 adds main-process imports; Zipper-2 adds renderer-bridge imports. Standard 3-way merge conflict at Final integration.

**Mitigation:** Expected and manageable — the changes are in non-overlapping regions of `main.ts` (Zipper-1 touches the `createWindow` body and `app.whenReady` callback; Zipper-2 adds a second BrowserWindow section). Final integration resolves the merge as its first action per §7.4 step 1. Both zippers work on separate tracked branches to make the merge clean.

---

## §10 — Open questions for operator at draft review

Consolidated list of all OPEN-Q-* markers from §3–§9 plus cross-cutting items. Sessions surface these at pre-registration gates; operator acks before green commit proceeds.

### OPEN-Q-B-1 — DOM assertion mechanism for MB-T02 red criterion (§3.5)

Session B must assert kanban DOM content (column headers, session cards) from the spawned Electron process. Options: (a) Playwright Electron driver (`@playwright/test` + Electron launch), (b) Chrome DevTools Protocol via `--remote-debugging-port`, (c) other. Session B proposes at pre-registration gate. Operator acks. Decision is informational to Zipper-1 (no zipper-phase dependency).

### OPEN-Q-C-1 — Window-state persistence library for MB-T03 (§4.3, §4.6)

V3_TICKETS.md L120: "electron-window-state or equivalent." Session C proposes at pre-registration gate. Options: (a) `electron-window-state` npm package, (b) `electron-store` with manual save/restore, (c) custom `app.getPath('userData')` + JSON. Operator acks. Decision affects `createManagedWindow` internals but not its frozen signature.

### OPEN-Q-C-2 — Dock badge in MB-T03 scope (§4.6) — RESOLVED

**RESOLVED — out of scope for Round 2 (RESOLUTION-2, operator 2026-04-30).** Session C files `MB-F-MB-T03-DOCK-BADGE` in `docs/FOLLOWUPS.md` at green commit. No additional frozen export required; `window-lifecycle.ts` signature in §4.3 is unchanged. See §4.6.

### OPEN-Q-D-1 — React dependency pre-installation strategy (§5.5) — RESOLVED

**RESOLVED — Path A (RESOLUTION-1, operator 2026-04-30).** Operator commits `chore:` dep-addition before sessions launch. Session D does NOT touch `package.json` or the lockfile. See §5.5 and §8.8.

### OPEN-Q-D-2 — dispatch-core v3 public export surface for Zipper-2 (§5.2)

`dispatch-core/src/v3/schema.ts` exports `OrchestratorMessage`, `OrchestratorMessageRow`, etc. Does `dispatch-core/package.json` expose these via a proper `exports` map? Or is a reach-in import required (finding #52 anti-pattern, forbidden)? Zipper-2 must verify before replacing Session D's local `ChatMessage` with the schema-typed import. Not a Session D blocking question, but Zipper-2 must surface and resolve it before swapping.

### OPEN-Q-D-3 — Renderer process calling pattern for COARCH-T02 (§5.4, §5.8, §9.6) — RESOLVED

**RESOLVED — Pattern B: contextBridge/IPC (RESOLUTION-3, operator 2026-04-30).** Renderer calls `window.coarchitectBridge.*`; `preload.ts` exposes it; main-process handlers live in `src/main/coarchitect-ipc.ts` (new file, Zipper-2 territory). Session D implements the renderer side against this surface. Zipper-2 wires the bridge. See §5.4, §5.9, §7.3.

### OPEN-Q-ZIPPER-1 — Chat panel spatial placement for Round 2 (§7.3)

WORKSTATION_CONTRACT.md §5.1: "horizontal bottom drawer below the kanban, expands upward." For Round 2: (a) implement full bottom-drawer layout (Zipper-2 adds drawer-resize UI alongside the kanban BrowserWindow), or (b) implement chat panel as a separate BrowserWindow (simpler for Round 2; full drawer deferred to MB-T07). Operator decides before Zipper-2 begins. If (b), file `MB-F-COARCH-T02-DRAWER-LAYOUT` in `docs/FOLLOWUPS.md`.

---

*End of contract. Three operator resolutions applied 2026-04-30 (RESOLUTION-1/2/3). Operator commits; sessions do not. This file has not been `git add`-ed or committed.*

---

## Amendment 2026-04-30 — §4.7 step 3 + §7.2 step 4 field naming

**Authority:** Operator (post-hoc reconciliation of contract example with shipped frozen file).

**Change:** Field names in `createManagedWindow({ ... })` example call sites changed from `defaultWidth: 1024, defaultHeight: 768` to `width: 1024, height: 768`.

**Reason:** Session C `865b80f` shipped `WindowSizeDefaults` interface with `width: number; height: number;` fields rather than the `defaultWidth`/`defaultHeight` names the contract example specified. Zipper-1 `68e6528` correctly followed the frozen file as authority per anti-fabrication discipline (project instructions §3.1). Semantics identical (both refer to the size to use when no persisted geometry exists; persisted state overrides via `saved?.width ?? opts.width`).

**Future note:** This event surfaces a §3.4 gap — frozen contracts are protected against CC modification of the contract document itself but are not currently protected against CC implementation diverging from the contract document. Session C should have halted and surfaced the divergence at green-commit time. Filed as cairn-findings candidate for Round 3 prompt-level forward primitive.

---

## Amendment 2026-04-30 (b) — OPEN-Q-ZIPPER-1 resolution + loadDispatchWeb interaction

**Authority:** Operator.

**Resolution of OPEN-Q-ZIPPER-1:** Option (a) — full bottom-drawer layout with resize UI. Zipper-2 builds a single BrowserWindow that hosts both dispatch-web (top region, kanban) and chat-panel.html (bottom region, COARCH-T02 stub) as sibling regions with a draggable splitter between them. Splitter position persists across launches per the same pattern as window-state persistence (JSON in `app.getPath('userData')`).

Option (b) (separate BrowserWindow) is not chosen. `MB-F-COARCH-T02-DRAWER-LAYOUT` is not filed (was conditional on choosing b).

**loadDispatchWeb interaction guidance:** B's frozen export `loadDispatchWeb(win: BrowserWindow): Promise<void>` (committed at `7ef8e44`) loads `WEB_UI_URL` into the passed BrowserWindow's webContents directly. Under option (a), the BrowserWindow's webContents loads a wrapper page (e.g., a local HTML file containing two `<webview>` or BrowserView regions plus splitter UI), not dispatch-web directly. Therefore Zipper-2 is **not** the correct caller for B's `loadDispatchWeb(win)` — calling it would replace the wrapper with dispatch-web alone.

Zipper-2 is authorized to load dispatch-web into the kanban region by other means (webview tag with `src={WEB_UI_URL}`, or BrowserView with `loadURL(WEB_UI_URL)`, or equivalent). B's `loadDispatchWeb` export remains valid and unmodified — preserved for future call sites that load dispatch-web as the BrowserWindow's primary content (none in Round 2 production after Zipper-2; the export's presence in main.ts via Zipper-1's wiring is removed by Zipper-2 as part of the wrapper-layout refactor).

**Zipper-1 wiring impact:** Zipper-2 will need to remove or refactor Zipper-1's direct `await loadDispatchWeb(mainWindow)` call (currently in `createWindow()` at `68e6528`) since `mainWindow` will load the wrapper page, not dispatch-web. This is a Zipper-2 territory modification of main.ts — within Zipper-2's declared territory per §7.3 (Zipper-2 modifies main.ts). Zipper-1's exit gate (kanban renders in BrowserWindow) was met against the pre-wrapper layout; Zipper-2 transitions to the wrapper layout and the kanban renders inside the wrapper's top region.

**v4 forward note:** This wrapping-the-web architecture is intentional v3 MVP. Operator pre-commitment 2026-04-30: V4 absorbs complete Electron containment — no localhost HTTP for user-facing surface, native renderer for kanban + chat panel, IPC-only daemon access from renderer. V3 ships the Electron shell with web content; V4 ships the Electron-native rewrite. The loadDispatchWeb integration question and the wrapper-layout shape are both v3-tactical and resolved here for Round 2; v4 contract authoring will redesign from native-first principles.

**Zipper-2 scope expansion (informational):** Option (a) is a meaningfully larger Zipper-2 than option (b) would have been. Zipper-2 deliverables now include:
1. Wrapper HTML file (new, location at Zipper-2 discretion — likely `src/main/workstation-shell.html` or similar)
2. Splitter UI implementation (CSS + JS in the wrapper file or a separate bundle)
3. Splitter-position persistence (JSON file in userData, read/write helpers)
4. main.ts refactor: remove direct `loadDispatchWeb` call, load wrapper instead
5. Original Zipper-2 scope: preload.ts contextBridge expose, coarchitect-ipc.ts new file
6. Tests verifying both regions render and splitter persists position

If any of items 1-4 force a frozen contract change (especially the dispatch-web loading mechanism if BrowserView is needed and that requires main.ts to handle webContents lifecycle differently), Zipper-2 must halt and surface for operator amendment.
