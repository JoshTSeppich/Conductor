# DAEMON Phase X.1 — Consolidated spike findings (pre-reg gate 2 surface)

**Status:** Surface for operator ack. Pre-reg gate 2 per the original Session A ticket §5.3.
**Scope:** Session A (daemon) side only. Session B publishes its own UI-side consolidated findings; operator consolidates before Phase X.2 unified ticket decomposition.
**Spike sequence:** 5 spikes shipped S05 → S01 → S02 → S03 → S04, plus one drift-remediation commit.

---

## Executive summary

- **5 spikes complete.** Per-spike outcome: S05 Improved, S01 Improved, S02 Improved, S03 *Capability enabled with known limitations*, S04 Improved (post-correction).
- **0 contract-impacting findings.** `CONDUCTOR_API_CONTRACT.md` v2.0.0 held as frozen input across every spike. No version bump required from Session A's side. Combined with Session B's parallel 0-findings result, the contract is stable for Phase X.2.
- **1 cross-session drift event, caught + remediated + discipline internalized.** Documented in `1aabe18` + `34062c0`. The post-drift commits (S03, S04, and the post-S02 work on Session B's side) all held the recovered discipline. Filed under TK-cairn-evidence-round1 as a validated recovery pattern.
- **4 residual MODELED items** tracked as DAEMON-F## with Phase Y ticket targets below.
- **4 cross-session coordination items** captured for unified Phase X.2 arbitration.
- **Daemon-side ticket decomposition readiness: yes.** Readiness checklist in §5 below; actual decomposition happens at a separate pre-reg gate 3 per §3.7 halt discipline.

---

## 1. MODELED → KNOWN conversions per spike

### DAEMON-S05 — Fastify HTTP server (`61ba0b0`)

| MODELED → KNOWN |
|---|
| Fastify 5.x integrates cleanly with ESM + NodeNext resolution |
| `onRequest` hook pattern cleanly bypasses `/v2/health` while enforcing `X-Conductor-Token` on all other paths |
| Path param routing via `request.params` works for `/v2/sessions/:name` shape |
| Native JSON body parsing + auto-415 on non-JSON content type |
| Error response shape `{"error": "<human message>"}` KNOWN verified via 401/404/409/422 probes |
| Killed-record 409 error body verbatim match per operator Blocker 3 arbitration |
| `app.close()` returns promptly — suitable for launchd SIGTERM lifecycle |

### DAEMON-S01 — `@fastify/websocket` (`ee8a47d`)

| MODELED → KNOWN |
|---|
| `@fastify/websocket` ^11 wrapping `ws` ^8 is the right choice — composes with Fastify's HTTP app, shares hook pipeline, shares auth flow |
| Upgrade-handshake token-query-string auth via the SAME `onRequest` hook used for HTTP header auth (consolidated daemon hook possible in Phase X.2) |
| Pre-101 rejection surfaces as HTTP 401 via `ws` client's `unexpected-response` event (Node clients get clean status; browsers do NOT — documented as cross-session item #4) |
| In-order event delivery for sequential `socket.send()` — KNOWN for single-emitter case |
| Server-side disconnect detection: 1ms observed, well under the 1s MODELED target |

### DAEMON-S02 — `fs.watch` / fsevents (`1aabe18`)

| MODELED → KNOWN |
|---|
| Native `node:fs.watch` handles every daemon file-watch need; no chokidar dep required |
| Event `eventType` on macOS is mostly `'rename'` even for direct writes — don't treat `'rename'` vs `'change'` as semantically meaningful |
| Atomic tmp+rename writes surface 2 events (tmp filename, then final) — filter by final filename |
| Rapid writes coalesce unpredictably (5 writes → observed 3 events) — 50ms debounce is KNOWN mitigation |
| `.git/refs/heads/` watch fires for both the ref file AND its `.lock` — filter `!filename.endsWith('.lock')` |
| **FSEvents is path-scoped** — 500-file concurrent sibling-dir load produced 0 spurious events in the watched dir. Operator's pnpm-install concern resolved as a non-issue. |
| Real edits under concurrent sibling load still fire — watcher is not starved |

### DAEMON-S03 — node-notifier (`6d803a9`) — **partial verification**

| MODELED → KNOWN | MODELED (still) |
|---|---|
| Library integrates cleanly; `notify()` does not throw | End-to-end delivery on production macOS (see DAEMON-F01) |
| Silent-failure semantics are undetectable programmatically — callback returns `err=null` even when OS suppresses delivery | Click handler behavior (unexercised — no delivery to click) |
| `notifications_available: boolean` on `/v2/health` is the correct mitigation (contract-additive per §2) | Sound semantics (unobservable without delivery) |
| UI in-banner fallback is the correct degraded-path design | |

### DAEMON-S04 — launchd (`5e03327`)

| MODELED → KNOWN |
|---|
| User-level LaunchAgent at `~/Library/LaunchAgents/com.foxworks.dispatch-daemon.plist` is the right deployment shape |
| `launchctl bootstrap gui/<uid> <plist>` / `bootout gui/<uid>/<label>` are the current commands (not legacy `load`/`unload`) |
| plist template verified working on current macOS (captured verbatim in S04 ADR with absolute-path requirement called out) |
| `RunAtLoad: true` + `KeepAlive: true` + `StandardOutPath`/`StandardErrorPath` behave as expected |
| `KeepAlive` restart is gated by `ThrottleInterval` (default 10s) for exits-too-quickly — non-issue for production daemons that run minutes-to-hours before crashes |
| Re-bootout error pattern `/Boot-out failed: 3: No such process/` is idempotent-safe for installer scripts |

---

## 2. Contract-impacting findings

**None.**

Across all 5 daemon spikes (6 commits counting drift remediation), `CONDUCTOR_API_CONTRACT.md` v2.0.0 held as frozen input without modification. Every MODELED assumption either converted to KNOWN via spike evidence, or stays MODELED with a tracked Phase Y ticket target (§3 below). No §10.2 "contract is wrong" surface was triggered. No §2 version bump from daemon-side is required.

This is load-bearing evidence for Phase Y stability: the contract's design absorbed the surfaces (auth, endpoints, events, state machine, backward compat, STATUS.json) across both daemon and UI sides without requiring revision. Combined with Session B's parallel 0-findings result (operator confirmed), v2.0.0 remains frozen for Phase X.2.

---

## 3. Residual MODELED items with Phase Y ticket targets

### DAEMON-F01 — End-to-end notification delivery on production macOS
- **Source:** S03 ADR
- **Status:** MODELED — library integrates, delivery unverified on dev target despite granted permissions. Root cause unresolved (macOS version / terminal host sandboxing / node-notifier interaction candidates).
- **Resolution path:** Ship the `notifications_available: boolean` health flag + UI in-banner fallback as designed. Monitor post-install on real operator machines. If delivery works elsewhere, downgrade F01 to "dev-target specific"; if systemically flaky, pivot to the deferred Option C (osascript-based) per S03 ADR.
- **Phase Y targets:** DAEMON-T16 (notification engine — implements `notifications_available` probe + degraded path), plus post-ship operator feedback loop.

### DAEMON-F02 — Full login-cycle `RunAtLoad` behavior
- **Source:** S04 ADR
- **Status:** MODELED — spike verified RunAtLoad via bootstrap in an already-logged-in session. Not tested: logout/login round producing auto-start at login.
- **Resolution path:** After DAEMON-T13 (installer) ships, operator manually verifies by logout + login + check `launchctl list | grep foxworks` shows the daemon running. Low risk — RunAtLoad is a settled launchd behavior; spike's bootstrap path exercises the same code path as login-time loading.
- **Phase Y target:** DAEMON-T13 (installer) includes a post-install verification step instructing operator to confirm via logout/login.

### DAEMON-F03 — WebSocket event ordering under concurrent emitters
- **Source:** S01 ADR
- **Status:** MODELED — S01 verified sequential in-order delivery from one emitter. Not tested: multiple daemon subsystems (handoff watcher, git watcher, STATUS.json watcher, state machine) racing to emit on one client connection simultaneously.
- **Resolution path:** Daemon implementation serializes all WS emits through a single async queue per client connection. The shape `{type, timestamp, session, data}` provides a causal-order hint via `timestamp`, but the queue preserves actual emit order regardless. Trivial to enforce at the emit-helper level.
- **Phase Y target:** DAEMON-T09 (WS stream implementation) wraps emit through a per-connection queue. Typed event emit helper (also a followup from S01 ADR) includes the queue semantics.

### DAEMON-F04 — fs.watch debounce threshold in practice
- **Source:** S02 ADR
- **Status:** MODELED — 50ms debounce chosen from observed coalescing patterns in probe data. Real-world HANDOFF.md editor behavior (VS Code save bursts, `cat > file` shells, `tee`, pipes) may surface different coalescing.
- **Resolution path:** Ship 50ms as default. Make the debounce window configurable via daemon env or `~/.foxworks-dispatch/config.json` for operator-tunable response. Monitor post-ship; tune default if real workloads show consistent over- or under-debounce.
- **Phase Y target:** DAEMON-T10 (handoff watcher) uses 50ms default; exposes config hook for tuning.

---

## 4. Cross-session coordination items

These items surfaced in daemon-side spikes and affect Session B's UI implementation. Ready for unified Phase X.2 arbitration.

### CS-01 — CORS policy for Session B's web UI origin
- **Sources:** S05 ADR (HTTP server), S01 ADR (WS preflight)
- **Issue:** Session B's web UI serves from a different origin than `localhost:7878` (likely Vite `localhost:5173` for dev, unknown for production). Daemon HTTP responses need CORS headers; the WS preflight pattern (see CS-04) depends on the HTTP side having CORS.
- **Action required:** Session B provides its production origin + dev origin(s); daemon adds `@fastify/cors` with an explicit allowlist.
- **Target consolidation:** DAEMON-T01 or T02 (HTTP scaffold ticket) includes CORS setup as part of scope, informed by Session B's answer.

### CS-02 — `notifications_available: boolean` on `/v2/health`
- **Source:** S03 ADR
- **Issue:** Contract-additive field (per §2, no version bump) published on `GET /v2/health`. Session B's UI consumes it to decide whether to render in-banner fallback for `handoff_written` and `cairn_violation_detected` events.
- **Action required:** Session B's UI consumes the field with a default-false treatment when absent; renders in-UI banner for attention-worthy events when `false`.
- **Target consolidation:** DAEMON-T02 (health endpoint ticket) populates the field. Session B's corresponding ticket implements the fallback.

### CS-03 — launchd-parent-process alters notification permission scope
- **Sources:** S03 ADR ↔ S04 ADR interaction
- **Issue:** macOS notification permission is per-parent-app. Daemon running under launchd has a DIFFERENT parent than daemon launched from a terminal. Permission granted to Terminal.app / iTerm2 / etc. does NOT transfer to launchd-launched daemon.
- **Action required:** DAEMON-T13 (installer) prints post-install instructions guiding operator to System Settings → Notifications → grant permission to the daemon-as-launchd-process. Documentation must be explicit.
- **Target consolidation:** DAEMON-T13 installer ticket owns the post-install instruction; Session B UI's onboarding flow references the same.

### CS-04 — Browser WebSocket-upgrade 401 opacity
- **Source:** S01 ADR
- **Issue:** When daemon rejects a WS upgrade with HTTP 401, Node `ws` clients see the full response via `unexpected-response` event, but browsers only fire a generic `error` — 401 status is not exposed to page JS.
- **Action required:** Session B's UI performs a preflight HTTP fetch (e.g., `GET /v2/health` + one auth-gated endpoint) before opening the WS, so auth failures surface via HTTP with visible status. Session B's UI-S01 already incorporated this as scope — cross-verification that implementation matches.
- **Target consolidation:** Session B's UI-T## (WS client ticket) implements preflight; daemon's DAEMON-T09 documents the expectation in its ADR/ticket body.

---

## 5. Readiness checklist for Phase X.2 daemon ticket decomposition (pre-reg gate 3 surface target)

**Ready:** yes, with caveats noted below.

Pre-reg gate 3 will decompose daemon tickets across five clusters, roughly matching the original Session A ticket §5.4 MODELED shape. The readiness items below are what I would surface in that decomposition gate; NOT decomposing here (that's a separate work cycle per §3.7).

### Cluster 1 — Foundation (HTTP scaffold + auth + health + session CRUD)
- **DAEMON-T01:** Fastify scaffold + `onRequest` auth hook (consolidated HTTP header + WS query string per S01/S05 findings) + CORS (pending CS-01 input from Session B)
- **DAEMON-T02:** `GET /v2/health` returning contract §4.1 shape + `notifications_available` per CS-02
- **DAEMON-T03:** `GET /v2/sessions` + `GET /v2/sessions/:name` reading `sessions.json` via dispatch-core's `readRegistry`
- **DAEMON-T04:** `POST /v2/sessions` — new sessions start in `armed` per Blocker 1 arbitration; 409 on any existing name (killed or live) per Blocker 3 arbitration
- **DAEMON-T05:** `PATCH /v2/sessions/:name/state` with transition-validity enforcement per contract §6.1

### Cluster 2 — Operations
- **DAEMON-T06:** `POST /v2/sessions/:name/prompts` — uses dispatch-core's `assemble`, `writeRegistry`, tmux `sendKeys`
- **DAEMON-T07:** `GET /v2/sessions/:name/handoff` — uses dispatch-core's `copyToClipboard`, archive dir logic
- **DAEMON-T08:** `GET /v2/events?since=<ts>&limit=<n>` — paginated event history from an in-memory ring buffer (persistence is post-v2 per contract §9 "out of scope")

### Cluster 3 — Real-time
- **DAEMON-T09:** `WS /v2/events/stream` — query-string token auth + per-client serialized emit queue per DAEMON-F03
- **DAEMON-T10:** Handoff watcher (per-session `fs.watch` on HANDOFF.md's dir, 50ms debounce per DAEMON-F04, emit `handoff_written`)
- **DAEMON-T11:** Git log watcher (`.git/refs/heads/` watch, ignore `.lock` filenames, read new commit SHA via `git log -1`, emit `commit_landed`) — with graceful skip for non-git session cwds per S02 ADR followup
- **DAEMON-T12:** Notification engine — `notifier.notify` probe on startup populates `notifications_available`, emits native notifications for `handoff_written` + `cairn_violation_detected` when available, NOP when `false`

### Cluster 4 — Lifecycle + backward compat
- **DAEMON-T13:** launchd installer script + post-install permission-grant instructions per CS-03 + RunAtLoad verification instructions per DAEMON-F02
- **DAEMON-T14:** fd v1 CLI commands (`init`, `list`, `send`, `pull`, `status`) route through daemon HTTP per contract §7.1
- **DAEMON-T15:** Daemon-dead fallback in CLI commands — `GET /v2/health` fails → fall back to direct fd v1 behavior per contract §7.2

### Cluster 5 — STATUS.json
- **DAEMON-T16:** STATUS.json parsing — read `<cwd>/STATUS.json` when present per contract §8.2, fallback to daemon-inferred `{last_commit_sha, last_commit_at, phase}` per §8.1
- **DAEMON-T17:** Emit `test_status_updated` events when STATUS.json changes (reuses S02 fs.watch pattern)

### Caveats on this readiness

- **Ticket numbering is provisional** — the actual decomposition gate refines based on your ack + Session B's co-evolving ticket numbers
- **Cross-session tickets (CS-01 through CS-04)** need unified arbitration BEFORE cluster 1–5 decomposition is final. You asked for "unified Phase X.2 arbitration across both sessions' ticket decomposition" — the four CS items are the anchors for that unification
- **v2 sessions.json schema migration** (per Blocker 2 arbitration) lands in the first daemon commit that writes sessions.json. Probably DAEMON-T04 (first POST that writes) or earlier (startup migration). Ticket-time decision — flagged here so pre-reg gate 3 doesn't miss it
- **Shared Zod schema consumption** (`packages/dispatch-core/src/v2/schema.ts` at `551c469`) — daemon tickets import from there for request/response validation. Spike scripts kept inline types (disposable); ticket code MUST use the shared module

---

## Self-check

- Q1 API spike: n/a — this is a findings surface, not a spike
- Q2 behavior/mocks: n/a — docs only
- Q3 impl delete: n/a — docs only
- Q4 outside contract: no — findings stay within contract §10 structure
- Q5 contract modification: no — surfaces the *absence* of required modifications
- Q6 unlabeled claims: no — MODELED/KNOWN labels held throughout §1–§3
- Q7 Session B territory: no — this doc is in `docs/adr/` (shared docs territory for cross-session coordination docs is acceptable, but this document is explicitly daemon-side; no edits to `packages/dispatch-web/`, `packages/dispatch-menubar/`)
- Q8 registry bypass: n/a
- Q9 halt discipline: held — no pre-work on Phase X.2 ticket decomposition, no design speculation, no Session B-side content

---

## Halt

Surface ends here. Per §3.7 / §10.7, halting for operator ack on these findings. Pre-reg gate 3 (daemon ticket decomposition) is a separate work cycle and does not start until:
1. Operator acks Session A's consolidated findings (this document)
2. Operator acks Session B's consolidated findings (already landed per coordination note)
3. Operator routes unified Phase X.2 arbitration signal to both sessions

No ticket decomposition, no Phase X.2 prep, no cross-session coordination outreach until all three conditions land.
