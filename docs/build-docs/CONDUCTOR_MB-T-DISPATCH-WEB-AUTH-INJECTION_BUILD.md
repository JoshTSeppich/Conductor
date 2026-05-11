# MB-T-DISPATCH-WEB-AUTH-INJECTION — dispatch-web auth-token injection (Sub-Q-B=Y parallel ticket)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-11
**Authored under:** §3.4 operator-supervised mechanical translation discipline
**Authoring delegate:** T2 sub-session (Opus 4.7), bounded by GATE 2 arbitrations 2026-05-11 + Sub-Q-B=(Y) operator-frozen 2026-05-11
**Authoring anchor commit (HEAD at authoring time):** `a02ddae`
**Cairn ladder anchor:** parallel-track to MB-T-HSO-WIRE per Sub-Q-B=(Y) split; carves WB15 scope from MB-T-HSO-WIRE into this dedicated ticket
**Closes:** `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` (Tier 1, FOLLOWUPS.md:124) — v3.5-alpha ship-gate blocker per `docs/coordination/v35-operational-readiness-2026-05-10.md` §5.3
**Depends on (all merged):**
- MB-T08 (`packages/dispatch-workstation/src/onboarding/`) — onboarding-shipped API-key path; reference pattern for token-storage discipline
- Fix-92 (cairn finding #92, `packages/dispatch-workstation/src/main/card-bridge-preload.mts` + main.ts:108-110, 367-387) — webview token bootstrap; pattern precedent + likely shared mechanism
- existing dispatch-web mount surface: `<webview id="kanban-webview" preload="./card-bridge.cjs">` at `packages/dispatch-workstation/src/main/workstation-shell.html:250`, `WEB_UI_URL` at `webview-loader.ts:9`
- dispatch-web auth surface: `packages/dispatch-web/src/auth/token-storage.ts` (KEY = `'x-conductor-token'`), `useAuthBootstrap.ts`, `TokenPrompt.tsx`, `AuthBootstrap.tsx`
**Downstream gates:** Dogfood Phase B re-execution (currently blocked behind TokenPrompt screen per dogfood findings §2 Gate 5) → v3.5-alpha measurement window
**Estimated WB count:** 7 (range 5-9 depending on Sub-Q-MBTDWAI-A spike outcome — see §3.1)

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchors) first to understand what is binding vs deferred.
2. Read §3 (GATE 3 sub-arbitrations) — three operator decisions are pre-execution prerequisites; **Sub-Q-MBTDWAI-A is load-bearing for WB1 spike design and must resolve before RED probes are authored.**
3. Read §4 (WB ladder) for execution order. Heavy emphasis on WB1 spike: this ticket's scope hinges on the actual failure-mode characterization. The §4 WB ladder is structured to remain valid across the most likely spike outcomes; some WBs may collapse to no-op-confirmations if Fix-92 already covers the case.
4. §5-§9 are operational supports — cross-references, self-check, definition-of-done, risk register, closing posture.

Confidence labels per CLAUDE.md §2.2 apply throughout. Arbitration outcomes from GATE 2 + Sub-Q-B=(Y) 2026-05-11 are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

**Important pre-read context** (`[KNOWN]` per T2 authoring session 2026-05-11):

- The Fix-92 cairn-finding-#92 zone in `main.ts:108-110` + `card-bridge-preload.mts` ALREADY implements the operator-chosen mechanism per Q-GATE-2-4 (token-injection from `~/.foxworks-dispatch/token` into webview `localStorage['x-conductor-token']`).
- `dispatch-web/src/auth/token-storage.ts:1` uses the EXACT same key `'x-conductor-token'`.
- Therefore this ticket's scope is **NOT** "design and implement a new mechanism" — it is **"characterize why the existing Fix-92 mechanism does not close `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE`, then harden / fill gaps."** See §3.1 + §9 for anomaly surface to operator.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per Sub-Q-B=(Y) split 2026-05-11 + Q-GATE-2-4 = token-injection:

1. **Characterize** the actual failure mode of `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` (Tier 1, open) against the EXISTING Fix-92 token-bootstrap pipeline. Spike in WB1; ADR at `docs/coordination/spike-mbtdwai-01-auth-failure-mode-<date>.md`. Binds Sub-Q-MBTDWAI-A.
2. **Verify** the token-source pipeline: `~/.foxworks-dispatch/token` file existence + content validity + daemon-acceptance on fresh workstation launch (no operator pre-setup assumed). Identify whether MB-T08 onboarding, daemon first-launch, or a missing third step authoritatively writes the file.
3. **Wire** any identified gap closure (scope contingent on WB1 spike outcome — see §4 WB2-WB5 conditional shape):
   - If gap = token file missing on fresh launch → wire token-generation/write step (probably onboarding-side per MB-T08 pattern, or daemon-first-launch hook).
   - If gap = timing race (TokenPrompt renders before Fix-92 preload finishes injection) → wire injection ordering fix; possibly URL-param-style token-handoff at webview src-set time.
   - If gap = origin/storage scoping (Fix-92 writes to kanban webview's localStorage but dispatch-web sees a different origin's storage) → wire mechanism alignment.
   - If gap = token rejected by daemon → wire token-validity check + regeneration path.
4. **Runtime-launch smoke** per CLAUDE.md §4.6: workstation launches; kanban webview mounts; no TokenPrompt screen visible; daemon-authenticated calls from dispatch-web succeed.
5. **Dogfood Phase B re-execution** — kanban + chat-shell + console panel render without auth interruption. Phase B unblock is the v3.5-alpha gating condition per plan §5.3 + §7.3.
6. **Close** `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` Tier 1 → CLOSED in `docs/FOLLOWUPS.md` at WB7 closure commit.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify dispatch-web auth surface: `packages/dispatch-web/src/auth/token-storage.ts`, `useAuthBootstrap.ts`, `AuthBootstrap.tsx`, `TokenPrompt.tsx`. If WB1 spike surfaces a dispatch-web-side change as load-bearing, halt-and-surface — that becomes a separate `dispatch-web` ticket per cross-package discipline (cf. Q-MBT21-7=a no-cross-package-imports-from-dispatch-web boundary, mirrored for changes).
- Does NOT modify frozen surfaces: `REGISTRY.md` §2, `docs/build-docs/CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts` §1-§13, `docs/build-docs/WORKSTATION_CONTRACT.md` §6. If a new IPC channel is needed (extends WORKSTATION_CONTRACT §6), escalate per CLAUDE.md §2.4 separate `contract:` commit BEFORE GREEN.
- Does NOT change auth model (token-based remains; session-cookie alternative explicitly out-of-scope per Q-GATE-2-4).
- Does NOT touch daemon-side `/v3/sessions/:name/approval-policy` or `/v2/auth` route handlers — workstation-side injection only.
- Does NOT re-arbitrate Sub-Q-B (Y vs X) — operator-frozen 2026-05-11.
- Does NOT modify `docs/coordination/v35-operational-readiness-2026-05-10.md` mid-ticket. Plan-doc edits queue for D-2 operator-edit window.
- Does NOT modify `docs/FOLLOWUPS.md` mid-ticket. Followup CLOSED state lands at WB7 as a single docs commit (mirrors MB-T-HSO-WIRE WB17 discipline).
- Does NOT touch MB-T-HSO-WIRE WB15 — that WB is SKIPPED in MB-T-HSO-WIRE per Sub-Q-B=(Y); this ticket is the carve-out.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-11)

### §2.1 — Sub-Q-B = (Y) parallel ticket

`[KNOWN-OPERATOR-ARBITRATED]` per orchestrator dispatch 2026-05-11.

dispatch-web auth-injection wiring is carved out of MB-T-HSO-WIRE into this dedicated parallel ticket. Rationale: scope independence — auth-injection mechanism is path-disjoint from HSO autonomy-loop wiring; concurrent execution is cleaner than serialized inside HSO-WIRE. MB-T-HSO-WIRE WB15 is SKIPPED; HSO-WIRE renumbers (or leaves a gap; operator discretion).

### §2.2 — Q-GATE-2-4: token-injection mechanism

`[KNOWN-OPERATOR-ARBITRATED]` per orchestrator GATE 2 2026-05-11.

Workstation injects auth token into dispatch-web on launch. Implementation site: dispatch-web mount in workstation renderer — KNOWN today as `<webview id="kanban-webview" preload="./card-bridge.cjs">` at `workstation-shell.html:250`. Auth injection happens at mount-time via webview `preload` script writing `localStorage['x-conductor-token']` (Fix-92 pattern at `card-bridge-preload.mts:56`). dispatch-web reads the same key on bootstrap via `auth/token-storage.ts:1` + `useAuthBootstrap.ts`.

Tier 1 ship-gate blocker → CLOSED once gap-closure wiring lands. Closes `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE`.

### §2.3 — Plan §5.3 anchor

`[KNOWN-OPERATOR-ARBITRATED]` per `docs/coordination/v35-operational-readiness-2026-05-10.md` §5.3.

Per FOLLOWUPS.md:124 + dogfood findings §2 Gate 5: three architectural options surfaced (token-injection / auth-bypass / accept-as-onboarding-step). Operator chose (a) IPC token-injection per Q-GATE-2-4 above.

Affects dogfood Phase B execution reliability (currently Phase B blocked behind auth screen).

---

## §3 — GATE 3 sub-arbitrations REQUIRED before specific WBs

Three operator decisions surface as pre-execution gates. WB1 spike output binds the first two; the third gates WB6 closure-path framing.

### §3.1 — Sub-Q-MBTDWAI-A: actual failure mode (LOAD-BEARING for WB1 spike design + WB2 RED probe authoring)

`[OPEN — OPERATOR-PENDING]` Spike WB1 produces evidence + ADR; operator binds Sub-Q-MBTDWAI-A based on observed failure mode. Candidate options (Spike WB1 may reveal a sub-option not yet enumerated; halt-and-surface):

- **(a) Token file missing on fresh launch.** `~/.foxworks-dispatch/token` does not exist until some post-onboarding step writes it. Fix-92 reads-and-injects when file exists; when missing, dispatch-web sees no token → TokenPrompt fallback. Closure: identify the missing write step (daemon first-launch? onboarding extension?) and wire it.

- **(b) Token file exists but rejected by daemon.** Daemon `/v3/sessions/...` returns 401 → dispatch-web treats as auth_failed → TokenPrompt fallback (per `AuthBootstrap.tsx:20`). Closure: identify why token is rejected (stale token? mismatched secret? key rotation?) and wire generation/refresh.

- **(c) Timing race.** Fix-92 preload runs in webview process AFTER dispatch-web's `useAuthBootstrap.ts` has already executed → token injection is too late → TokenPrompt renders briefly before Fix-92 finishes. Closure: wire token injection BEFORE webview navigation begins (URL param? main-process pre-mount handoff?) OR add dispatch-web-side polling of localStorage on TokenPrompt mount (dispatch-web change, out-of-scope per §1.2 — escalate as separate ticket if surfaced).

- **(d) Origin/storage scoping mismatch.** Fix-92 writes localStorage in the webview's preload context; if dispatch-web's renderer process is differently-scoped (e.g., session isolation, different origin), the localStorage write is invisible. Closure: align scoping; possibly switch from webview-preload to URL-param injection.

- **(e) Fix-92 disabled in production builds.** `[SPECULATIVE]` Fix-92 zone has `MB_TEST_HOOKS=1` references in adjacent zones (Probe-92 obs-infra is test-gated); verify Fix-92 itself is production-active by reading main.ts:367-387 zone + `card-bridge-preload.mts` for any env-var gating.

### §3.2 — Sub-Q-MBTDWAI-B: token-source authority (LOAD-BEARING for WB2 RED + WB3 GREEN if Sub-Q-MBTDWAI-A=(a))

`[OPEN — OPERATOR-PENDING]` Where does `~/.foxworks-dispatch/token` get written on a fresh workstation install? Candidate options:

- **(α) Daemon first-launch generates it.** Daemon process writes the file when it first starts under a user account; MB-T08 onboarding spawns the daemon → file appears as side-effect. Verify: daemon source under `packages/dispatch-daemon/`.
- **(β) Operator manually places it.** Pre-v3.5 dev workflow assumed operator-side `cp` from another machine or daemon-launch on another shell. Not viable for v3.5-alpha ship.
- **(γ) New: workstation MB-T08 onboarding step writes it.** Extend onboarding flow (`packages/dispatch-workstation/src/onboarding/`) to generate-or-import daemon token at first launch, mirroring API-key handling. Likely correct closure if Sub-Q-MBTDWAI-A=(a).

### §3.3 — Sub-Q-MBTDWAI-C: closure-state framing for `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` (LOAD-BEARING for WB7 docs commit)

`[OPEN — OPERATOR-PENDING]` After WB6 smoke passes, how is the followup row closed?

- **(α) CLOSED entirely.** Tier 1 ship-blocker fully resolved.
- **(β) CLOSED with Tier 3 successor row.** Tier 1 closed; new Tier 3 row filed for any UX paper-cut surfaced (e.g., brief TokenPrompt flash before Fix-92 completes — observable but not a blocker).
- **(γ) Downgraded to Tier 2 with conditional closure.** If smoke passes BUT spike WB1 reveals failure-mode (c) timing-race and dispatch-web-side hardening is needed (out of scope), file Tier 2 follow-up tracking the cross-package work.

---

## §4 — WB ladder

7 WBs estimated (5-9 range depending on Sub-Q-MBTDWAI-A spike outcome). Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5; per-path `git add` per §2.7; push after each cairn-grammar commit per §2.6.

### WB1 — `spike(MB-T-DISPATCH-WEB-AUTH-INJECTION): auth failure-mode characterization against existing Fix-92 pipeline`

**Type:** spike
**Scope:** Reproduce `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` on a fresh-state workstation launch. Capture:
- (i) `~/.foxworks-dispatch/token` file existence + content + permissions before workstation launch.
- (ii) Workstation launch logs — does Fix-92 `BOOTSTRAP_TOKEN_WRITTEN <N>` sentinel fire (per `card-bridge-preload.mts:66`)? At what timestamp relative to TokenPrompt render?
- (iii) Renderer-side localStorage state at the moment TokenPrompt renders — is `'x-conductor-token'` present? what value?
- (iv) Daemon HTTP `/v3` response codes for any auth-validation call from dispatch-web during the failure window.
- (v) Compare against an OPERATOR-pre-populated token state (manually `cp ~/.foxworks-dispatch/token` from a known-good source) — does TokenPrompt disappear?

**Acceptance:** evidence ADR at `docs/coordination/spike-mbtdwai-01-auth-failure-mode-<date>.md` with `[KNOWN]`/`[MODELED]` labels per observation. Binds Sub-Q-MBTDWAI-A by surfacing the failure mode that matches one of (a)-(e). Spike does NOT modify production code; observation-only.
**Frozen contracts touched:** none — spike is observational.
**Risk:** `[MODELED]` if failure mode is (c) timing-race or (d) origin-mismatch, WB3+WB5 GREEN scope expands to include preload-ordering or URL-param injection redesign.

### WB2 — `red(MB-T-DISPATCH-WEB-AUTH-INJECTION): probe asserting fresh-launch dispatch-web does NOT show TokenPrompt`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/integration/dispatch-web-auth/probe-mbtdwai-02-no-token-prompt-on-launch.test.ts` (NEW file). Launches workstation under Electron (similar pattern to existing runtime-smoke harness `smoke-harness.ts`); waits for `WINDOW_READY` sentinel; queries kanban webview's renderer state via `executeJavaScript`; asserts that `localStorage['x-conductor-token']` is set AND that the `TokenPrompt` component is NOT mounted (DOM assertion via `document.querySelector('[data-testid="token-prompt"]')` returning null — verify `TokenPrompt` exposes a stable test-id; if absent, add via dispatch-web-side change tracked as separate followup).
**Acceptance:** probe fails RED because the gap surfaced by WB1 spike has not been closed. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.
**Sub-Q-MBTDWAI-A blocker:** WB2 RED authoring depends on WB1 spike outcome; probe assertion exact-shape is bound by failure-mode finding.

### WB3 — `green(MB-T-DISPATCH-WEB-AUTH-INJECTION): close gap surfaced by WB1 spike per Sub-Q-MBTDWAI-A binding`

**Type:** green
**Scope:** GREEN implementation; exact site contingent on Sub-Q-MBTDWAI-A:
- If (a) token-file-missing → new wiring at `packages/dispatch-workstation/src/onboarding/` OR `packages/dispatch-daemon/` (cross-package; halt-and-surface) to generate `~/.foxworks-dispatch/token` at first launch.
- If (b) token-rejected-by-daemon → wire token-validity-check before Fix-92 injection; on invalid, regenerate via daemon.
- If (c) timing-race → wire pre-navigation token-handoff (URL param or new IPC channel) so token is in scope when dispatch-web's `useAuthBootstrap` runs.
- If (d) origin-scoping → align Fix-92 scoping (likely add a same-origin preload hop or switch to URL-param injection).
- If (e) Fix-92-disabled → enable Fix-92 in production builds (config / env-var change).

**Acceptance:** WB2 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on closure path. If new IPC channel needed → may touch `WORKSTATION_CONTRACT.md` §6 → escalate to separate `contract:` commit per CLAUDE.md §2.4 BEFORE WB3 GREEN.

### WB4 — `red(MB-T-DISPATCH-WEB-AUTH-INJECTION): probe asserting daemon-authenticated calls from dispatch-web succeed under workstation context`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/integration/dispatch-web-auth/probe-mbtdwai-04-daemon-auth-roundtrip.test.ts`. Under workstation-launched dispatch-web (post-WB3 GREEN state), execute a representative authenticated daemon call (e.g., kanban session-list fetch via the webview's query layer per `dispatch-web/src/query/internal.ts:2`). Assert 200 response (not 401).
**Acceptance:** probe RED if WB3 closure was incomplete (token present but daemon-rejects). Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.
**Conditional skip:** if WB1 spike outcome was (a) and WB3 GREEN cleanly closes, WB4 may be merged into WB6 smoke as a no-op-confirmation. Operator-arbitrated at HALT-WB4-PRE-COMMIT.

### WB5 — `green(MB-T-DISPATCH-WEB-AUTH-INJECTION): close residual daemon-acceptance gap if surfaced by WB4`

**Type:** green
**Scope:** GREEN if WB4 surfaces a residual gap (token present client-side but daemon rejects). Likely cause: stale token / wrong scope / missing X-Conductor-Token header on a specific endpoint. Implementation site TBD per WB4 RED evidence.
**Acceptance:** WB4 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional; halt-and-surface if scope crosses dispatch-web side.
**Conditional skip:** parallel to WB4 — if not needed, WB5 collapses to no-op.

### WB6 — `green(MB-T-DISPATCH-WEB-AUTH-INJECTION): runtime-launch smoke + dogfood Phase B re-execution`

**Type:** green (smoke harness; verifies WB1-5 integration)
**Scope:** Per CLAUDE.md §4.6 + `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE`: `pnpm --filter dispatch-workstation exec electron dist/main/main.js` from fresh `pnpm --filter dispatch-workstation build`. Observe:
- `WINDOW_READY` sentinel within ~10s.
- `BOOTSTRAP_TOKEN_WRITTEN <N>` sentinel before kanban webview's `did-finish-load`.
- No `TokenPrompt` render in kanban webview console (no `"Conductor authentication"` substring in renderer console output).
- Dogfood Phase B step-1 (kanban session list renders with sessions populated, not auth-blocked).

**Acceptance:** all 4 sentinels observed + Phase B step-1 unblock. Commit body Q1-Q9.
**Frozen contracts touched:** none.
**Pre-existing-failure baseline (CLAUDE.md §4.5):** `MB-F-COARCHITECT-IPC-LINE-485-...` Tier 2 + `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` Tier 3 — NOT re-diagnosed per §4.5 discipline.

### WB7 — `docs(MB-T-DISPATCH-WEB-AUTH-INJECTION): findings doc + MB-F-DISPATCH-WEB-AUTH-PERSISTENCE closure + ticket closure`

**Type:** docs
**Scope:** Author `docs/coordination/mb-t-dispatch-web-auth-injection-findings-<date>.md` per `mb-t40-findings-2026-05-09.md` format anchor:
- I What Shipped
- II Sub-Q-MBTDWAI-A/B/C Dispositions (with operator-resolution citation)
- III Ambiguity Ratifications (any HALT-and-surface items raised mid-WB)
- IV Probe Distribution (probe-mbtdwai-02 + -04 GREEN evidence)
- V Architecture Notes (Fix-92 relationship; token-source authority chain)
- VI Documentation Drift Acknowledgments (MB-F-DISPATCH-WEB-AUTH-PERSISTENCE row body update; FOLLOWUPS.md:124 framing-vs-implementation gap surfaced at HALT-MBTDWAI-AUTHORED)
- VII Consumer Non-Regression (any consumer probes per CLAUDE.md memory feedback)
- VIII WB Skip Rationale (e.g., if WB4/WB5 collapsed to no-op)
- IX New Followups Filed

Followup file/close update at `docs/FOLLOWUPS.md`:
- CLOSE `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` (Tier 1) per Sub-Q-MBTDWAI-C disposition.
- File any NEW followups surfaced (e.g., dispatch-web-side polling-on-TokenPrompt-mount tracked as Tier 2/3 cross-package work; or token-rotation tracking as Tier 3).

**Acceptance:** findings doc + FOLLOWUPS.md commit lands; HEAD at MB-T-DISPATCH-WEB-AUTH-INJECTION closure cited in plan §5.3 update (D-2 operator-edit window).
**Frozen contracts touched:** none — docs only.

---

## §5 — Cross-references

### §5.1 — Followups closed by this ticket

| Followup | Tier | Source | Closure path |
|---|---|---|---|
| `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` | 1 (open) | `FOLLOWUPS.md:124` | WB7 closure commit; final state per Sub-Q-MBTDWAI-C |

### §5.2 — Followups likely to surface

| Candidate | Tier (est.) | Trigger |
|---|---|---|
| `MB-F-DISPATCH-WEB-TOKEN-PROMPT-TESTID` | 3 | If WB2 probe needs a stable test-id on `TokenPrompt` for DOM-assertion (cross-package; dispatch-web side) |
| `MB-F-DISPATCH-WEB-AUTH-POLL-LOCALSTORAGE` | 2-3 | If Sub-Q-MBTDWAI-A=(c) timing-race and the operator-arbitrated closure is dispatch-web-side polling |
| `MB-F-DAEMON-TOKEN-FIRST-LAUNCH-AUTHORITY` | 2 | If Sub-Q-MBTDWAI-B reveals no clear authoritative token-write path (daemon-first-launch vs onboarding-extension undetermined) |
| `MB-F-DISPATCH-WEB-AUTH-PROD-PACKAGED-MODE` | 3 | If Fix-92 + this ticket cover dev-mode (loadURL via dev server at :7878) but not production-packaged Electron load mode (MB-F-MB-T02-PRODUCTION-LOADING territory) |

### §5.3 — Related shipped tickets

| Ticket | Anchor SHA | Relevance |
|---|---|---|
| MB-T08 | (verify pre-WB1) | Onboarding API-key path — reference pattern for token-write discipline; potential extension site for daemon-token write per Sub-Q-MBTDWAI-B=(γ) |
| Fix-92 (cairn finding #92) | (verify pre-WB1; comment at main.ts:108-110 cites it as authored) | Webview token-bootstrap mechanism — likely shared or extended pipeline |
| MB-T-HSO-WIRE | parallel-track | Sibling ticket; this ticket carves the WB15 dispatch-web-auth-injection scope per Sub-Q-B=(Y) |
| MB-T40 / MB-T22 | shipped | Chat-shell + commits-tab patterns — for any chat-shell-side auth dependencies surfaced during smoke |

### §5.4 — Files this ticket READS but DOES NOT MODIFY

- `packages/dispatch-workstation/src/main/main.ts` (Fix-92 zone lines 108-110 imports + 367-387 IPC handler)
- `packages/dispatch-workstation/src/main/card-bridge-preload.mts` (full file)
- `packages/dispatch-workstation/src/main/workstation-shell.html` (webview tag at line 250)
- `packages/dispatch-workstation/src/main/webview-loader.ts` (WEB_UI_URL constant)
- `packages/dispatch-web/src/auth/token-storage.ts` + `useAuthBootstrap.ts` + `TokenPrompt.tsx` + `AuthBootstrap.tsx` (dispatch-web auth surface)
- `packages/dispatch-daemon/` daemon-token write path (verify Sub-Q-MBTDWAI-B authority)

Modifications to dispatch-web files require separate ticket per §1.2.

### §5.5 — Anchor commit at ticket-authoring time

`a02ddae` (HEAD at 2026-05-11 ticket-authoring time). WB1 spike should begin by verifying current state against this anchor + fetching origin/main per CLAUDE.md anti-stale-dispatch discipline (`MB-F-CHAT-CLAUDE-STALE-DISPATCH-2026-05-10` closure-path template).

---

## §6 — Self-check protocol per WB commit (CLAUDE.md §10.5)

Every cairn-grammar commit (red / green / spike / refactor) carries a Q1-Q9 self-check block in the commit body. Standard answers for this ticket below; per-WB deviations flagged in WB scope.

| Q | Standard answer for MB-T-DISPATCH-WEB-AUTH-INJECTION WBs |
|---|---|
| Q1 — API verified by spike? | WB1 spike binds Sub-Q-MBTDWAI-A failure-mode finding. Subsequent WBs cite WB1 spike ADR + Fix-92 pattern (`card-bridge-preload.mts:56`) + dispatch-web auth surface (`auth/token-storage.ts:1`) as API anchors. |
| Q2 — Test exercises behavior or MOCKS? | RED + GREEN pairs use real Electron launch + real webview + real localStorage + real daemon (or fixture daemon). No mocks for the auth pipeline. Probe-04 uses real daemon HTTP roundtrip. |
| Q3 — If implementation deleted, test passes? | NO (RED probes fail; GREEN implementations make them pass). |
| Q4 — Anything outside contract spec? | Each WB's "Frozen contracts touched" section lists explicit boundaries. WB3 + WB5 may need new IPC channel → halt-and-surface for separate `contract:` commit. |
| Q5 — Modified contract without approval? | NO. New IPC channels (if WB1 spike binds the closure that way) require separate operator-arbitrated frozen-contract amendment per CLAUDE.md §2.4 BEFORE GREEN. |
| Q6 — Any unlabeled claim in commit body? | All claims labeled `[KNOWN]` / `[MODELED]` / `[SPECULATIVE]` per CLAUDE.md §2.2. WB1 spike ADR ratchets `[MODELED]` claims to `[KNOWN]` via evidence. |
| Q7 — Touched files another parallel session might modify? | Answer against actual `git status` per CLAUDE.md §2.7. T2 + T3 + T4 parallel-CC tracks may share `main.ts`; this ticket should aim at `card-bridge-preload.mts` / onboarding / Fix-92-zone-only modifications to minimize collision. Coordinate at HALT-PRE-COMMIT per session. |
| Q8 — Bypass PATCH /v2/sessions/:name/state? | NO. No session-state mutation in this ticket; auth pipeline is GET-only on `/v3/sessions/...`. |
| Q9 — Work during unauthorized halt? | NO. HALT-WB1-PRE-COMMIT (spike ADR ack) + HALT-WB3-PRE-COMMIT (Sub-Q-MBTDWAI-A binding confirmation) + HALT-WB7-PRE-COMMIT (Sub-Q-MBTDWAI-C closure-state ack) gate operator-review. |

### §6.1 — Per-WB HALT-PRE-COMMIT inventory

- **WB1**: spike ADR review + Sub-Q-MBTDWAI-A operator-binding before any RED/GREEN work begins. Strongest gate in this ticket.
- **WB3**: closure-path mechanism review (likely involves cross-package or new-IPC concerns surfaced by WB1 spike).
- **WB5**: only if WB4 surfaces a residual gap; otherwise WB5 is a no-op-skip.
- **WB7**: Sub-Q-MBTDWAI-C closure-state framing + FOLLOWUPS.md row body update review.

---

## §7 — Definition-of-done

MB-T-DISPATCH-WEB-AUTH-INJECTION is COMPLETE when ALL of the following are KNOWN-evidence-captured:

1. All 7 WBs (5-9 range) commit + push per CLAUDE.md §2.6. `git log --oneline origin/main..HEAD` returns empty after each WB push.
2. WB1 spike ADR shipped + Sub-Q-MBTDWAI-A operator-bound.
3. WB6 runtime-launch smoke shows: `WINDOW_READY` within ~10s + `BOOTSTRAP_TOKEN_WRITTEN <N>` before webview `did-finish-load` + no `TokenPrompt` render + dogfood Phase B step-1 unblock.
4. WB7 findings doc shipped at `docs/coordination/mb-t-dispatch-web-auth-injection-findings-<date>.md`.
5. `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` CLOSED (or Tier-downgraded per Sub-Q-MBTDWAI-C) in `docs/FOLLOWUPS.md`.
6. No frozen-contract amendment without separate operator-arbitrated `contract:` commit per CLAUDE.md §2.4.
7. All 5 workstation packages typecheck cleanly per CLAUDE.md §4.4 verification ordering.
8. Sub-Q-MBTDWAI-A/B/C decisions captured in commit bodies + findings doc.

### §7.1 — What MB-T-DISPATCH-WEB-AUTH-INJECTION completion does NOT achieve

- Does NOT execute full dogfood Phase B/C/D. Phase B step-1 unblock is acceptance scope; the rest of Phase B is downstream.
- Does NOT close v3.5-alpha ship-gate by itself — only removes one of several blockers per plan §7.3 + §8.3.
- Does NOT modify dispatch-web auth surface even if a dispatch-web-side change is identified as load-bearing — escalates as separate ticket per §1.2.
- Does NOT handle production-packaged-mode webview loading (URL ≠ dev server) — that is `MB-F-MB-T02-PRODUCTION-LOADING` territory; possibly file Tier 3 followup if smoke reveals production-mode regressions.

---

## §8 — Risk register

### §8.1 — Known risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WB1 spike fails to reproduce `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` on T2's workstation (works-on-my-machine artifact) | Medium | High — entire ticket scope predicates on reproducible failure | Spike must include operator-confirmed reproduction step before binding Sub-Q-MBTDWAI-A. If no reproduction, escalate at HALT-WB1-POST-SPIKE — the followup row may be stale. |
| WB1 spike reveals dispatch-web-side change as load-bearing (failure-mode (c) timing-race or origin-mismatch (d)) | Medium | Medium — out-of-scope per §1.2; escalates to separate dispatch-web ticket | Halt-and-surface; escalate as new `MB-T-...` ticket; this ticket may close partially with Tier-2 follow-up tracking the cross-package work per Sub-Q-MBTDWAI-C=(γ). |
| Token-source authority undocumented (Sub-Q-MBTDWAI-B opens daemon-vs-onboarding territory) | High | Medium | Spike + Sub-Q-MBTDWAI-B operator-binding before WB3 GREEN. Risk of scope-creep into MB-T08 onboarding ticket or daemon-side work. |
| Cross-session collision with MB-T-HSO-WIRE WBs touching `main.ts` | Medium | Medium — Fix-92 zone is adjacent to MB-T-HSO-WIRE imports zone | Path-disjoint strategy: aim modifications at `card-bridge-preload.mts` + onboarding only; coordinate via HALT-PRE-COMMIT staging verification per parallel-cairn discipline. |
| Production-packaged Electron behaves differently from dev (`loadURL` to `localhost:7878`) | Low (no v3.5 packaging in scope) | Low at v3.5; High post-packaging | Note in findings doc; file followup if smoke reveals packaging-mode gap (`MB-F-DISPATCH-WEB-AUTH-PROD-PACKAGED-MODE` candidate). |
| Daemon token rotation (long-running daemon writes new token; webview's localStorage stale) | Low | Medium | Out of scope; file Tier 3 followup if surfaced during smoke. |
| dispatch-web's `TokenPrompt` lacks stable test-id for WB2 DOM-assertion | Medium | Low — workaround: assert via console-output absence of "Conductor authentication" string | If test-id needed, file cross-package followup; do NOT modify dispatch-web in this ticket. |

### §8.2 — Escalation triggers (HALT all work + surface)

Per CLAUDE.md §2.10:

- Frozen contract amendment required mid-WB (other than separately-handled IPC channel additions to WORKSTATION_CONTRACT §6)
- dispatch-web-side change identified as load-bearing
- Daemon-side change identified as load-bearing (escalates to daemon ticket)
- Cross-session conflict (T2/T3/T4 simultaneous writes to Fix-92 zone or onboarding)
- WB1 spike fails to reproduce the failure mode (followup-row staleness — escalate to operator)
- `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` framing in FOLLOWUPS.md:124 contradicts WB1 evidence (D-2 plan-doc edit candidate)

### §8.3 — Anti-patterns to avoid

- ❌ Mocking the daemon HTTP layer in WB4 — must use real daemon (or fixture daemon spawned per test) to verify roundtrip auth
- ❌ Modifying `card-bridge-preload.mts` outside the Fix-92 sentinel zone (per CLAUDE.md §3.3)
- ❌ Modifying dispatch-web auth surface (`token-storage.ts` / `TokenPrompt.tsx` / `AuthBootstrap.tsx`) in this ticket — escalate as separate ticket
- ❌ Force-push to origin/main
- ❌ `git add -A` or `git add .`
- ❌ Chained operator-arbitrated actions behind verification commands
- ❌ Re-diagnosing pre-existing test failures per CLAUDE.md §4.5
- ❌ "Useful prep" during HALT states (CLAUDE.md §2.5)
- ❌ Skipping WB1 spike — the entire WB ladder shape depends on spike outcome
- ❌ Closing `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` Tier 1 without dogfood Phase B step-1 evidence

---

## §9 — Closing posture

`[KNOWN-AUTHORED-UNDER-§3.4-OPERATOR-SUPERVISED-MECHANICAL-TRANSLATION]`

This ticket body translates Sub-Q-B=(Y) + Q-GATE-2-4 operator-frozen arbitration outcomes into a WB ladder. The arbitrations are binding; scope decisions per WB are bounded by them.

### §9.1 — Anomalies surfaced at HALT-MBTDWAI-AUTHORED (for operator awareness)

Three anomalies surfaced during authoring; **none re-arbitrate Sub-Q-B or Q-GATE-2-4**; all flag potential staleness in the source `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` followup row (FOLLOWUPS.md:124) for D-2 plan-doc edit consideration:

1. **Fix-92 already implements the chosen mechanism.** The FOLLOWUPS.md:124 row from "Round 2 Zipper-2 manual gate" presents three architectural options (token-injection / auth-bypass / accept-as-onboarding-step) as if undecided. Cairn finding #92 (Fix-92) — landed before the followup was filed — already implements option (a) token-injection via `card-bridge-preload.mts:56` writing `localStorage.setItem('x-conductor-token', token)` from `~/.foxworks-dispatch/token`. The genuine open question is NOT "which option" but "why does option-a-implementation not close the followup observable?" — which is exactly WB1 spike's scope.

2. **Token-source authority is undocumented.** `~/.foxworks-dispatch/token` is read by Fix-92 (`card-bridge-preload.mts` IPC roundtrip) but no shipped code clearly writes it. MB-T08 onboarding handles `ANTHROPIC_API_KEY` only. The most likely authority is daemon-first-launch as a side-effect, but this is `[MODELED]` not `[KNOWN]`. Sub-Q-MBTDWAI-B exists to bind this; spike WB1 must include token-source verification as part of failure-mode characterization.

3. **MB-T-HSO-WIRE §1.1 item 11 + WB15 framing.** The HSO-WIRE ticket (`docs/build-docs/CONDUCTOR_MB-T-HSO-WIRE_BUILD.md:43`) lists "Wires dispatch-web auth via token-injection per Q-GATE-2-4. ... Packaging (X absorb or Y parallel ticket) deferred to Sub-Q-B (§3.2)." With Sub-Q-B=(Y) now-resolved, HSO-WIRE WB15 is SKIPPED. HSO-WIRE ticket text may need a D-2 update noting WB15 is now resolved-as-skipped + this ticket carries the scope. T4 + operator may handle at D-2 edit window.

### §9.2 — Authoring-time stats (for HALT-MBTDWAI-AUTHORED surface)

- **File:** `docs/build-docs/CONDUCTOR_MB-T-DISPATCH-WEB-AUTH-INJECTION_BUILD.md` (NEW)
- **WB count:** 7 (range 5-9 depending on Sub-Q-MBTDWAI-A spike outcome)
- **Section count:** 9 (§0-§9 inclusive of subsections)
- **Sub-Q candidates:** 3 (Sub-Q-MBTDWAI-A, -B, -C) — all `[OPEN — OPERATOR-PENDING]`
- **Anomalies flagged:** 3 (§9.1 above)
- **Frozen-surface touches:** none direct; conditional escalation to `WORKSTATION_CONTRACT.md` §6 if WB3 surfaces new IPC channel need
- **Cross-package boundaries respected:** dispatch-web auth surface read-only per §1.2 + §5.4
- **Confidence-label distribution:** `[KNOWN-OPERATOR-ARBITRATED]` (Sub-Q-B=Y + Q-GATE-2-4), `[KNOWN]` (Fix-92 mechanism + dispatch-web key-match + mount-surface), `[MODELED]` (token-source authority + failure-mode candidates pending spike), `[SPECULATIVE]` (option (e) Fix-92-disabled-in-prod-builds pending verification)

The cairn methodology applies throughout: red→green→Q1-Q9→commit→push per WB; per-path `git add`; halt-and-surface for any new arbitration question; no frozen-contract amendment without explicit operator authorization.

Operator review at HALT-MBTDWAI-AUTHORED gates dispatch to WB1 spike execution.

**End MB-T-DISPATCH-WEB-AUTH-INJECTION build doc.**
