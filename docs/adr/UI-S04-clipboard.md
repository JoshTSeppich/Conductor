# ADR UI-S04: Clipboard coordination (daemon pbcopy + web UI clipboard)

- **Status:** Accepted (spike-verified for pbcopy semantics; browser
  paths cited, not executed)
- **Date:** 2026-04-23
- **Session:** B (UI)
- **Ticket:** UI-S04
- **Informs:** WEB-T16 (pull button UX), daemon pbcopy invariants
  (informational for Session A)

## Context

Two writers share the macOS system pasteboard with no coordination
primitive:

1. **Daemon.** On `handoff_written` event (contract §5.3), daemon auto-
   copies the handoff to the clipboard via `pbcopy` execFile (contract
   §4.4: "Daemon: reads handoff file, archives, copies to clipboard via
   `pbcopy` execFile.").
2. **Web UI.** The re-pull button (WEB-T16) calls
   `navigator.clipboard.writeText(handoff)` in a user-gesture context.

Per operator direction: **characterize the behavior, don't synchronize
the writers.** The fix is UX-level — the operator should be aware that
the clipboard can change under them, not that the system prevents it.

## Decision

No coordination primitive between writers. Both paths write to the
same pasteboard; last-writer-wins semantics apply. The web UI's re-pull
button emits a visible toast (`"Copied handoff for <session>"`) so the
operator always sees when the web UI touches the clipboard. The
daemon's auto-copy remains silent — documented in operator docs so the
operator knows that receiving a handoff implies clipboard was
overwritten.

## Observations

Ran `packages/dispatch-web/spikes/UI-S04-clipboard/run.ts`.
4/4 scenarios passed.

### S1 — round-trip baseline (KNOWN)

`pbcopy` fed `"foo"` via stdin, `pbpaste` returned `"foo"`. Baseline
confirms the child-process + stdin pipe pattern works.

### S2 — overwrite / last-writer-wins (KNOWN)

Sequence: `pbcopy "daemon-handoff-v1"` → 50ms sleep → `pbcopy
"webui-handoff-v1"` → `pbpaste` returned `"webui-handoff-v1"`. After
the first write, pasteboard read back `"daemon-handoff-v1"` as
expected. No atomicity across two sequential writes — second write
fully replaces.

### S3 — concurrent writers (KNOWN, nondeterministic)

Two `pbcopy` child processes spawned without sequencing, one writing
`"concurrent-A"` and one `"concurrent-B"`. Both completed without
error. `pbpaste` returned one of the two (`"concurrent-B"` this run).
The winner is not predictable across runs — OS scheduler decides which
process's write lands last. No corruption / partial writes observed;
the pasteboard is atomic at the per-write granularity even if
inter-write ordering is racy.

### S4 — hazard-character round-trip (KNOWN)

Content of 152 bytes including triple-backticks, `${vars}`, `$HOME`,
nested `"quotes"` / `'quotes'` / `` `backticks` ``, unicode (café,
résumé, 你好, 🔬), and embedded newlines. `pbpaste` returned byte-
identical content. pbcopy/pbpaste preserves the same hazard classes
that fd v1's Spike 02 established for tmux's `load-buffer`/`paste-
buffer`.

## Failure-mode taxonomy

### FM1 — benign same-content overlap

- **Path:** daemon pbcopies handoff A on `handoff_written` → operator
  clicks re-pull → web UI writes handoff A (same content).
- **Observed effect:** `pbpaste` returns handoff A either way. User
  pastes and sees A. Zero user-visible difference.
- **Mitigation required:** none. Documented as expected behavior.

### FM2 — surprise overwrite (load-bearing)

- **Path:** daemon pbcopies handoff A on session `sherpa`'s
  `handoff_written`. Operator notices, intends to paste into CC, but
  first switches tabs to web UI and clicks re-pull on session
  `scribe`'s card. Web UI writes handoff B. Operator pastes into CC
  pane for sherpa — **gets B**.
- **Observed effect:** confirmed by S2 (overwrite is silent from the
  clipboard's perspective). Operator has no OS-level signal that
  clipboard changed.
- **Mitigation (required, lands in WEB-T16):** web UI surfaces a toast
  `"Copied handoff for <session-name>"` whenever the re-pull button
  writes. Toast is user-visible; operator sees "oh, clipboard just
  changed to scribe's handoff" and paste expectations update. Daemon's
  auto-copy stays silent (documented in operator docs that new handoffs
  update the clipboard).

### FM3 — browser permission / gesture failure (MODELED)

`navigator.clipboard.writeText` requirements, current-gen browsers
(Chrome 120+, Firefox 121+, Safari 16.4+):

- Requires **secure context** — `https://` or `http://localhost`. The
  daemon serves on `http://localhost:7878` per GAP-4 decision, which is
  a secure context. OK.
- Requires **user gesture** — the call must be within the synchronous
  handler of a recent user interaction (click, keypress). The re-pull
  button is a click handler; this is met.
- **Permissions API** — `navigator.permissions.query({name: 'clipboard-
  write'})` returns `"granted"` by default on localhost; no prompt on
  first use in Chrome/Safari. Firefox prompts on first `writeText` if
  user has not previously granted.

If the web UI ever writes outside a user gesture (e.g., auto-copy on a
WebSocket event — **NOT** the current WEB-T16 design), behavior per
browser:

- Chrome: `writeText()` promise rejects with DOMException NotAllowedError.
  Silent from user perspective.
- Firefox: same, with permission prompt in some flows.
- Safari: rejects; no automatic prompt.

**Mitigation (documented, not exercised):** WEB-T16 wraps `writeText`
in `try/catch`. On rejection, open a modal containing the handoff
text pre-selected with a "Copy" button (click = fresh gesture = works).
The modal is the gesture-establishment fallback.

## Consequences

### For WEB-T16 (pull button)

Required:
- Toast `"Copied handoff for <session>"` after successful `writeText`.
- `try/catch` around `writeText` with modal fallback for gesture
  failures.
- No auto-copy on WebSocket events — re-pull is always operator-
  initiated.

Not required:
- Coordination with daemon. Last-writer-wins is acceptable given
  FM1/FM2 mitigations.
- Pre-write read to check current pasteboard. Would create a TOCTTOU
  race and not prevent FM2 anyway.

### For operator docs

- README note: "When `fd pull` (or the daemon auto-copy on
  `handoff_written`) runs, it overwrites the system clipboard. The web
  UI's re-pull button does the same and emits a toast so you see it
  happening."

### For daemon (informational for Session A)

- `pbcopy` via `execFile` is fine as contract §4.4 specifies. No race
  avoidance needed.
- If daemon ever wants to confirm "did my write actually land?" the
  answer is no — by the time daemon reads back via `pbpaste`, a web
  UI write could have overwritten it. Don't build round-trip
  confirmation.

## MODELED (not verified by this spike)

- **Browser-side Permissions API actual behavior.** Citations above
  are MDN-current as of this ADR date; not executed in-spike. WEB-T16
  integration test will upgrade to KNOWN.
- **Rich content clobbering.** Spike save/restore uses `pbpaste` which
  reads text only. If the operator had an image or HTML on the
  clipboard when running the spike, only the plain-text projection was
  preserved. Mitigated by spike's file-header warning; not a production
  concern since daemon + web UI only write text.
- **Non-macOS.** Everything here is macOS-specific. Linux support is
  v2 scope per session prompt; a parallel ADR (UI-S04-linux?) would
  need `xclip`/`wl-copy` coverage. Out of scope for this spike.

## Alternatives considered

- **Coordination primitive (file lock, daemon-served "who last wrote"
  endpoint).** Rejected per operator direction — fix is UX-level.
- **Web UI does not write clipboard; relies solely on daemon pbcopy.**
  Rejected — re-pull button needs to work even when daemon auto-copy
  fired for an older handoff. The explicit user-initiated copy is
  load-bearing for operator ergonomics.
- **Daemon serializes writes via a lock file.** Rejected — doesn't
  prevent FM2 (operator still gets last write, just from a single
  ordered queue). Also adds failure modes (lock staleness).

## References

- `CONDUCTOR_API_CONTRACT.md` §4.4 (handoff endpoint; daemon pbcopy
  behavior)
- `CONDUCTOR_API_CONTRACT.md` §5.3 (`handoff_written` event — daemon's
  auto-copy trigger)
- fd v1 `src/lib/clipboard.ts` — existing pbcopy wrapper pattern
- W3C Async Clipboard API (MDN current-gen browser behavior,
  cited MODELED)
- Self-check per contract §10.5: 1 yes · 2 behavior · 3 no · 4 no ·
  5 no · 6 yes · 7 no · 8 n/a · 9 no
- Session B prompt item 8: n/a — UI-S04 is OS-level clipboard
  characterization, not a daemon-endpoint exercise
