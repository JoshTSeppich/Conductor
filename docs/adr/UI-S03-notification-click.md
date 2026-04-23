# ADR UI-S03: Notification click → focus web UI (Electron menu bar)

- **Status:** Accepted (osascript pipeline spike-verified; production
  focus incantations documented, not executed)
- **Date:** 2026-04-23
- **Session:** B (UI)
- **Ticket:** UI-S03
- **Depends on:** UI-S02 (Electron chosen, 2026-04-23)
- **Informs:** MB-T07 (notification click handler) and any daemon-side
  notification click callback (informational for Session A since same
  osascript pattern applies)

## Context

When the daemon fires a native notification on `handoff_written`,
`cairn_violation_detected`, or `gate_trip` (per
`CONDUCTOR_API_CONTRACT.md` §5.3 + Session A `DAEMON-S03` coordination
note), the operator's click should focus the web UI so the relevant
session's focused-detail is immediately visible. macOS cross-app focus
is non-trivial: Electron's `Notification.on('click', ...)` fires in the
main process, but switching focus to a browser tab is not
first-class — it requires invoking `osascript` (AppleScript) or
`open <URL>` via `child_process`.

UI-S02 picked Electron. UI-S03 verifies the Electron → child_process →
osascript pipeline, documents per-browser production incantations, and
fixes the recommended production path as **zero-detection `open
<URL>`**.

## Decision

**Production path: `open <URL>` via `child_process.execFile`.** No
default-browser detection required; macOS `open` respects the
operator's default-browser preference at the OS level, focuses
existing tabs whose URL matches, and launches the default browser if
none is running.

### Click-handler registration pattern (Electron main process)

```ts
import { Notification } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

const WEB_UI_URL = 'http://localhost:7878';

async function focusWebUI(url: string): Promise<void> {
  try {
    await exec('open', [url]);
  } catch (e) {
    console.error('[menubar] focusWebUI failed', e);
    // Future: surface via a menu bar alert (MB-T07+). For v2 MVP,
    // silent failure is acceptable — operator can click the tray
    // icon manually.
  }
}

export function fireSessionNotification(
  session: string,
  title: string,
  body: string,
): void {
  const n = new Notification({ title, body });
  n.on('click', () => { void focusWebUI(`${WEB_UI_URL}#session=${session}`); });
  n.show();
}
```

**Call site:** the Electron main process subscribes to daemon WS
events per UI-S01's preflight-then-WS pattern. When it receives a
`handoff_written` / `cairn_violation_detected` / `gate_trip` event
AND `notifications_available === true` per `/v2/health`, it fires via
this helper. When `notifications_available === false`, the menu bar
renders an in-banner fallback per DAEMON-S03 coordination (design
captured for pre-reg gate 3 WEB-T decomposition).

### Fragment targeting

URL fragment `#session=<name>` is a **proposed convention**, not
contract-frozen. WEB-T6 routing is the ticket that implements it.
Could alternatively use a query string `?focus=<name>` or a path
`/sessions/<name>` — exact form decided when WEB-T routing lands. The
menu bar call site uses whatever WEB-T routing publishes.

### Alternative (documented, not recommended)

Per-browser AppleScript via `osascript`. These work but require:
- Automation permission (Privacy & Security → Automation)
- Per-browser code paths (Chrome, Safari, Firefox each differ)
- Handling "browser not running" cases differently than `open`

Reference patterns for completeness (NOT executed in-spike — each
would activate/launch a browser on the operator's desktop):

Chrome — focus existing tab if URL matches, else open new tab:
```applescript
tell application "Google Chrome"
  activate
  set foundWindow to missing value
  repeat with w in windows
    repeat with t in tabs of w
      if URL of t contains "localhost:7878" then
        set active tab index of w to (get index of t)
        set index of w to 1
        return
      end if
    end repeat
  end repeat
  -- no match; open new tab
  open location "http://localhost:7878"
end tell
```

Safari — similar with `do JavaScript` gated behind the Develop menu
permission (requires Develop menu enabled + "Allow JavaScript from
Apple Events" in Preferences). Fragile; recommend `open` over this.

Firefox — AppleScript support is minimal. `open` via macOS is the
only reliable path.

**Recommendation:** use `open <URL>` uniformly. Skip per-browser
AppleScript unless a future requirement (e.g., reading tab state
programmatically) forces it.

## Observations (runnable scenarios)

Ran `packages/dispatch-menubar/spikes/UI-S03-notification-click/run.ts`.
3/3 passed.

### S1 — osascript round-trip (KNOWN)

`osascript -e 'return 42'` via `child_process.execFile` exited 0 and
emitted `"42"` on stdout. The Node → osascript pipeline is fully
functional; production click handlers that invoke osascript (or
`open`, which uses the same child_process pattern) work.

### S2 — osascript error surfacing (KNOWN)

Intentionally invalid AppleScript (`'this is not valid applescript
syntax'`) exited 1 with stderr:
```
12:29: syntax error: A property can't go after this identifier. (-2740)
```

Production click handler can `try/catch` the `execFile` promise, log
the failure, and fall back to `open <URL>` (the zero-detection path).
Alternatively, just use `open` directly and skip AppleScript entirely.

### S3 — `open` command availability (KNOWN)

`which open → /usr/bin/open`. The recommended production path is
callable from `child_process.execFile` the same way as `osascript`.

## Documented non-executed patterns

### Fallback: launch browser if none running

`open http://localhost:7878` on macOS:
- If the default browser is running AND has a tab with that URL: focuses the
  tab AND brings the browser to the foreground.
- If the default browser is running AND no tab has that URL: opens a new tab
  AND brings the browser to the foreground.
- If the default browser is NOT running: launches it and opens the URL as
  initial tab.

`open` is therefore a **single-command solution** for the full
decision tree. No branching logic required in the Electron main
process.

### Default-browser detection (for completeness, NOT needed for MB-T07)

Three mechanisms exist; all are unnecessary because `open <URL>` is
default-browser-agnostic:

1. **`defaults` read.** `defaults read com.apple.LaunchServices/com.apple.launchservices.secure` returns plist with registered URL handlers; parse for `http` scheme. Fragile — plist format has changed across macOS versions.

2. **`lsappinfo`** (undocumented). `lsappinfo info -only bundleID <LSHandler>` can query LaunchServices, but the API is not stable.

3. **Swift invocation:** a Swift one-liner invoking `LSCopyDefaultHandlerForURLScheme(kCFHTTPSchemeName)` returns the bundle identifier of the default browser. Stable but adds a Swift toolchain dependency to a TS/Electron project.

MB-T07 does NOT need any of these. Documented here so a future reader understands the tradeoff was deliberate: zero detection, zero branching, single `open` call.

## Failure-mode taxonomy

### FM-S03-1 — Automation permission denied

Relevant if MB-T07 uses per-browser AppleScript (NOT the recommended path). `osascript` returns exit 1 with error code `-1743` when the menu bar app hasn't been granted "Automation" permission for the target browser in System Settings → Privacy & Security → Automation.

**UX mitigation (if AppleScript path ever needed):** one-time modal: "Allow focus access? Open System Settings → Privacy & Security → Automation → grant [dispatch-menubar] access to [Browser]."

**With the recommended `open` path:** not applicable. `open` is a system utility that doesn't require Automation grants.

### FM-S03-2 — Target browser process missing

Relevant if MB-T07 uses `tell application "Chrome" to activate` on a browser that isn't running: the `tell` block launches the browser. This may surprise the operator (they didn't expect Chrome to launch from a notification click).

**With the recommended `open` path:** `open <URL>` launches the DEFAULT browser, not a specific one. If the operator's default is Safari, clicking a notification never unexpectedly launches Chrome. Operator's browser preferences are respected.

### FM-S03-3 — Browser running, no tab with web UI URL

`open <URL>` opens a new tab in the current default browser window. This is the expected, desired behavior. Not a failure mode, just a state.

### FM-S03-4 — Multiple browsers, ambiguous default

Not a failure; `open` uses the OS-level default-browser preference, which is unambiguous (macOS tracks a single default).

### FM-S03-5 — Electron backgrounded, notification still fires

Per Electron docs, `Notification.on('click')` fires regardless of Electron's focus state. The main process does not need to be in the foreground. MODELED from Electron docs; not exercised in-spike.

## MODELED (not verified by this spike)

- **Electron `Notification.on('click')` firing reliably when Electron
  backgrounded** (cited from Electron docs; MB-T07 integration test
  will upgrade to KNOWN if needed).
- **`open <URL>` behavior on URL-fragment matching** — `open` focuses
  existing tab if URL matches; unclear whether `#fragment` is part of
  the match. WEB-T routing decision will decide whether to use fragment
  (`#session=X`) or path (`/sessions/X`). Tested at MB-T07 integration
  time.
- **Notification click on macOS Sequoia with Focus/Do-Not-Disturb
  active** — notification may be delayed; click behavior unchanged per
  Apple docs but not tested.
- **Cross-process click-handler deduplication** — if both daemon
  (via node-notifier) and menu bar fire notifications for the same
  event, operator sees two notifications. Coordinated behavior per
  DAEMON-S03: daemon fires when `notifications_available === true`,
  menu bar suppresses its native path in that case (in-banner fallback
  when the flag is false). Coordination behavior not exercised here;
  verified in integration phase.

## Consequences

### For MB-T07 (notification click handler)

- Implement `focusWebUI(url)` using the snippet above.
- Register the handler via `Notification.on('click', ...)`.
- Do NOT implement per-browser AppleScript.
- Do NOT implement default-browser detection.
- Catch `execFile` rejections; log and continue (no user-visible
  fallback for v2 MVP).

### For WEB-T routing (TBD ticket)

- Decide URL convention for per-session focus: `#session=<name>` /
  `?focus=<name>` / `/sessions/<name>`. MB-T07 consumes whatever is
  decided.
- Verify `open <URL>` with fragment focuses the correct tab; if
  fragment is stripped by `open`, fall back to path or query string.

### For Session A (daemon, informational)

- Daemon's node-notifier click callback runs in daemon's Node process
  and can use the SAME pattern: `execFile('open', ['http://localhost:7878#session=X'])`.
- No `osascript` necessary.
- Shares the FM-S03 taxonomy above.

## Followups

- **UI-F10** — MB-T07 integration test verifies `open` URL-fragment
  focusing behavior with WEB-T routing's chosen URL convention.
- **UI-F11** — if v2 ever needs tab-state readback (e.g., "is session
  sherpa's panel currently focused?"), revisit the AppleScript path.
  Not needed for v2 MVP.

## References

- `CONDUCTOR_API_CONTRACT.md` §5.3 (WS event types; notifications fire
  from subsets of these)
- Session A `DAEMON-S03` cross-session note (notifications best-effort
  on macOS Sequoia; `/v2/health.notifications_available` flag)
- `docs/adr/UI-S02-menubar-framework.md` (Electron choice)
- `packages/dispatch-menubar/spikes/UI-S03-notification-click/run.ts`
  (runnable scenarios)
- `packages/dispatch-menubar/spikes/UI-S03-notification-click/scenarios.md`
  (observed outputs)
- Self-check per contract §10.5: 1 yes · 2 behavior (for runnable
  scenarios; documented patterns are MODELED from macOS docs) · 3 no ·
  4 no · 5 no · 6 yes · 7 no · 8 n/a · 9 no
- Session B prompt item 8: n/a — OS-level focus mechanism, not a
  daemon-endpoint exercise
