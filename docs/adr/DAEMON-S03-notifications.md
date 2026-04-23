# DAEMON-S03 — macOS native notifications (node-notifier)

**Status:** Capability enabled with known limitations (spike ran 2026-04-23)
**Scope:** Phase 2 daemon attention-grabbing notifications for §5.3 event types — specifically `handoff_written` and `cairn_violation_detected`
**Spike script:** `packages/dispatch-daemon/spikes/DAEMON-S03-notifications.ts`

## Decision

**Use `node-notifier` ^10 as the daemon's optional native-notification surface**, gated behind a runtime availability check. Daemon emits all §5.3 events via WebSocket regardless; native notifications are a secondary attention channel that gracefully degrades when the OS suppresses delivery.

Daemon surfaces `notifications_available: boolean` on `GET /v2/health` so Session B's UI knows whether native delivery is reachable. When `false`, UI falls back to in-banner display for attention-worthy events. Contract §4.1 health response shape gains this optional field; the addition is contract-additive per §2 and does not require a version bump.

## Rationale

`node-notifier` integrates cleanly — installs without friction, exposes a simple `notify()` API, uses bundled `terminal-notifier` under the hood on macOS. No library-level friction observed.

**However,** end-to-end delivery to the screen was NOT verified on the development target. With a terminal host that had notification permission already granted and DND state verified by the operator, `notify()` returned without throwing but no visible pop-up appeared, and the `notify()` callback never fired for either click-wait or no-wait flows. Root cause is not definitively established by this spike, but candidates are:

- macOS Sequoia / Tahoe permission-model change affecting `terminal-notifier` (the binary `node-notifier` shells out to)
- Sandboxing of the specific terminal host used by the operator (the spike's parent process)
- Interaction between `terminal-notifier`'s bundle identifier and macOS's per-app notification registry

Option C (pivot to `osascript`-based notifications) was considered and explicitly deferred: only worth the investigation if production usage surfaces enough notification-delivery friction to justify the work. Most operators have working notifications on their machines; the dev-target failure is a data point, not a universal statement.

Daemon design accepts this uncertainty: native notifications are opt-in and best-effort; UI fallback covers the suppressed-delivery case.

## Probes and results

Four automated probes on node 20 / darwin arm64. Automated probes pass in the sense of "the library integrates without throwing or hanging." End-to-end delivery to the operator's screen is the parallel manual-eye verification, which did NOT land green.

| ID | Probe | Automated result | Manual-eye result |
|---|---|---|---|
| P1 | `notifier.notify()` invoked and settled (no thrown error) | ✓ `errorReceived=none` | N/A |
| P2 | Click callback OR timeout fires within 8s (`wait:true`) | ✓ timer fired; `response=undefined metadata=null` — callback never invoked | ✗ operator saw no pop-up and no permission prompt |
| P3 | Silent `wait:false` notification fires without error | ✓ `errorReceived=none` | ✗ operator saw no pop-up |
| P4 | Failure-mode contract documented | ✓ (see mitigation below) | N/A |

### Interpretation

- **Library integration: KNOWN working.** `notify()` does not throw; dependency installs cleanly; callback signature matches docs.
- **End-to-end delivery: MODELED at best.** On the operator's dev target with notification permission already granted and DND state verified, native notifications did not surface. Whether this is a terminal-host / sandboxing / OS-version issue or a node-notifier-specific regression is unresolved.
- **Click handler: MODELED, unverified.** Click callback was never exercised because no pop-up appeared for operator to click.
- **Sound semantics: MODELED, unverified.** `sound: false` was accepted by the API; whether delivery respected the option is unobservable without delivery.

## Patterns locked in for daemon implementation

### Startup notification-availability check

```ts
import notifier from 'node-notifier';

async function checkNotificationsAvailable(): Promise<boolean> {
  // Fire a probe notification with a short wait; if the callback fires
  // with response !== undefined OR the process round-trips cleanly
  // within expected window, treat as available. Otherwise mark
  // unavailable. This is best-effort — true availability is only
  // provable when the operator actually sees a notification.
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 2000);
    notifier.notify(
      {
        title: 'Foxworks Dispatch',
        message: 'Daemon starting — probing notification delivery.',
        sound: false,
        wait: false,
      },
      (err, response) => {
        clearTimeout(timer);
        resolve(err === null && response !== undefined);
      },
    );
  });
}
```

This check runs once at daemon startup. Its result populates the `notifications_available` field on subsequent `GET /v2/health` responses. Best-effort: false-negative risk (we say unavailable when it would have worked on click) is acceptable — the fallback path (UI in-banner) is always correct.

### /v2/health response shape (contract-additive)

```ts
// Per contract §4.1, unchanged fields:
//   status, version, uptime_seconds
// Added per this ADR (additive, v2 additive rule applies):
interface HealthResponse {
  status: 'ok';
  version: string;
  uptime_seconds: number;
  notifications_available: boolean;  // new
}
```

### Event-to-notification mapping

Per §5.3, only two event types warrant native notifications (in the operator-attention sense):

- `handoff_written` — brief, silent (per spike P3 modeling)
- `cairn_violation_detected` — louder, sticky (wait-for-click semantics to ensure operator sees it)

Other §5.3 events (`commit_landed`, `state_changed`, `prompt_sent`, `test_status_updated`, `gate_trip`) go via WebSocket only. `gate_trip` is borderline attention-worthy; defer the native-notification choice to ticket time based on operator UX preference.

### Graceful degradation

When `notifications_available === false`:
- Daemon still emits all §5.3 events to the WebSocket stream (unaffected)
- Daemon does NOT call `notifier.notify()` for attention-worthy events (avoids wasted cycles on a suppressed channel)
- Session B's UI displays in-banner equivalents for events that would have been native notifications

When `notifications_available === true`:
- Daemon calls `notifier.notify()` for `handoff_written` and `cairn_violation_detected`
- If a specific call fails silently (we can't observe), the in-banner UI path is still populated via the WebSocket stream — duplicate attention is benign

## Tradeoffs and gotchas

- **Silent failure is macOS's default mode.** `terminal-notifier` doesn't surface a "was-displayed" signal to the calling process. Even on a working system, we can detect "the call didn't throw" but not "the operator actually saw it." Accept this.
- **Bundled `terminal-notifier` binary.** `node-notifier` ships a compiled binary. Apple's notarization / code-signing requirements on recent macOS may reject un-signed binaries silently. Not investigated in this spike.
- **Terminal host variance.** Notification permission is per-parent-app on macOS. A daemon launched via launchd (DAEMON-S04) has a different parent than a daemon launched from a terminal host. Notification permission granted to Terminal.app does NOT transfer to the daemon when launchd owns it. **This is a significant deployment consideration** — daemon must either:
  - Request permission itself on first run under launchd, OR
  - Rely on the launchd ExecutableBundle / LaunchAgent bundle identifier for permission scope
- **DND / Focus mode suppresses even granted permissions.** Operator's DND state was verified during investigation; delivery failed regardless. Possible alternate cause, but at minimum DND is a known silent-suppressor for any notification library on macOS.

## Followups (filed per operator arbitration)

1. **Installer documents how to grant notification permission.** Installer (DAEMON-T13 or similar) surfaces a README section: "After install, check System Settings → Notifications → find 'Foxworks Dispatch Daemon' (or `terminal-notifier`), grant permission. Restart daemon if permission was granted post-first-run."
2. **Daemon graceful degradation.** The `notifications_available` flag + fallback-aware WS events (documented above) are the minimum. Plus: startup log line explicitly stating "notifications: enabled/disabled/probe-failed" so operators see the state without querying the API.
3. **Session B UI in-banner fallback path.** UI (Session B territory) must consume `notifications_available` from `/v2/health` and render an in-UI banner for `handoff_written` / `cairn_violation_detected` events when `false`. Cross-session-coordination ticket flag.
4. **Defer Option C (osascript pivot) until production usage justifies.** Only pursue if real users surface systemic notification failure post-install. Meanwhile the fallback path makes native notifications non-load-bearing.

## Cross-session impacts

- **Session B UI must consume `notifications_available`** from `GET /v2/health` to decide whether to render in-banner fallback (followup #3). Flag at ticket decomposition.
- **Health response shape additive change.** Adding `notifications_available: boolean` is contract-additive per §2. Session B's UI can treat it as optional (default-false) when consuming; no contract version bump required.

## Provenance

- Contract §4.1 — `/v2/health` response shape (extended additively per §2)
- Contract §5.3 — `handoff_written` and `cairn_violation_detected` event types that warrant attention
- Contract §10.3 — anti-fabrication: notification delivery needed a spike (this ADR; capability enabled with known limitations per §10.4)
- Operator arbitration 2026-04-23 — Option A selected after Option B confirmed terminal notification permission was already granted and DND verified
- DAEMON-S04 ADR (pending) — will surface launchd-parent-process implications for notification permission scope
