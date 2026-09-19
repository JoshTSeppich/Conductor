# v3.5 Operational Readiness — Three-Dimension Assessment

**Date:** 2026-05-10
**Anchor SHA:** `7dfa6f2` (`docs:(§C.1′) ticket #1 — findings doc + MB-F-T15 closure`)
**Authoring posture:** Read-only plan-mode session, Opus 4.7, 1M context. No code writes. No commits. Strategic analysis + operational verification recommendations only. Operator stages/commits this document separately if accepted.

**Confidence labels** per CLAUDE.md §2.2 + project-instructions §3:
- **`[KNOWN]`** — observed in this session via direct file read (cite file:line or commit SHA).
- **`[MODELED]`** — reasoned from observed source (often: "the doc says X" is KNOWN; "X reflects current operator intent" is MODELED).
- **`[SPECULATIVE]`** — forward-looking estimate or hypothesis without direct evidence.

**Audience:** future Conductor sessions (Claude + operator) reading at varying context-retention. Assumes CLAUDE.md + project instructions as priming context; does NOT assume today's audit/plan/spike are fresh in reader memory. Anchors citations to commit SHAs for archaeological recovery.

---

## §0 — Methodology + reading protocol used

### §0.1 Reading order (3 rounds)

**Round 1 — strategic docs (parallel reads, 7 files).**
1. `docs/coordination/v35-post-audit-plan-2026-05-10.md` (HEAD `18be117`/`c147037`) — anchor doc, §A 4 ratifications, §F.3 ticket sequencing
2. `docs/build-docs/CONDUCTOR_V3.5_BUILD.md` — HSO architecture, §5 ticket bodies, Q-V35-* arbitrations
3. `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` (HEAD `9e72e8f`) — 122 elements, 6 dimensions
4. `docs/coordination/spike-c5-pty-scrape-2026-05-10.md` (commit `ef2dd3d`) — cross-substrate regex stability + CC-spawns-CC capability
5. `docs/coordination/c1r-ticket1-findings-2026-05-10.md` — Frame Router shipped at `44764fd`
6. `docs/coordination/v35-dogfood-findings-2026-05-10.md` (commit `d05b6c0`) — Phase A complete, Phase B audit-superseded close
7. `docs/FOLLOWUPS.md` (276 lines; chunked read + targeted grep for HSO/MBT3X/A2C/A3/C5 IDs)

**Round 2 — code inventory (parallel `ls` + `git log -30`).**
- `packages/dispatch-workstation/src/main/` (66 files)
- `packages/dispatch-workstation/src/coarchitect/` (19 files including `hso-pool.ts`, `peer-summary-harvester.ts`, `swarm-state-writer.ts`, `pty-streaming-bridge.ts`)
- `packages/dispatch-workstation/src/chat-shell/` (9 files)
- `packages/dispatch-daemon/src/` + `routes/`, `state/`, `console/` subdirs
- `git --no-pager log --oneline -30` from `7dfa6f2` back to `f8c679d` (MB-T35-revised ship)

**Round 3 — targeted code reads (~16 files + chunked FOLLOWUPS + main.ts sentinel grep + symbol grep).**
- 3.A: `hso-system-prompts/` directory listing + `git log` MB-T41 search + FOLLOWUPS targeted grep
- 3.B (dimension A): `coarchitect/hso-pool.ts`, `main/orchestrator-fire-spawn.ts`
- 3.C (dimension B): `main/action-variant-ipc.ts`, `main/orchestrator-action-handler.ts`, `main/orchestrator-action-types.ts`, `coarchitect/peer-summary-harvester.ts`, `coarchitect/chat-panel.tsx`, `coarchitect/pty-streaming-bridge.ts`, `main/pty-stream-relay.ts`
- 3.D (dimension C): `coarchitect/swarm-state-writer.ts`, `main/main.ts` (lines 390-475 + sentinel grep all zones), `main/coarchitect-ipc.ts` (lines 1-120 + 240-489)
- 3.E (daemon): `daemon/src/routes/sessions.ts` head + `routes/v3/` + `state/` + `console/` inventories
- 3.F (token meter): `main/tile-token-scraper.ts` + main.ts §C.5 sentinel zone

### §0.2 KNOWN vs MODELED discipline applied

Three-source verification per CLAUDE.md §2.1 + memory note "Ladder-internal three-source verification":
- **KNOWN** = directly read this session. Examples: HSO Wave 1+2 ticket commit SHAs, MB-T41 file size + last-modified timestamp, main.ts sentinel zone inventory, `dispatchActionVariant` zero-production-callers grep result.
- **MODELED** = reasoned from observed source. Examples: §A.4.R ratifications ARE KNOWN (the plan text says so); "operator intent matches §A.4.R as of 2026-05-10" is MODELED (no in-session re-confirmation). HSO BUILD doc says MB-T37 ships pool; "the production pool actually runs at workstation startup" is MODELED-and-disconfirmed by main.ts read.
- **SPECULATIVE** = forward-looking. Examples: estimated WB count for MB-T-HSO-WIRE; predicted dogfood pass rate; risk likelihoods.

Per (a) operator instruction in HALT-PLAN-PRE-WRITE-3 confirmation: MODELED claims in source docs (post-audit plan, audit, BUILD doc) **stay MODELED in this doc** unless a direct code read confirmed them KNOWN. Example preservation: post-audit plan §G describes Q-V35-7(a) HSO uptime as MODELED-achievable; this doc preserves MODELED labeling for the same claim because the dogfood window did not execute.

---

## §1 — KNOWN state at HEAD `7dfa6f2`

Per (a) operator instruction in confirmation 3: state findings flatly. Lead with the wired-vs-unwired distinction.

### §1.1 Inventory delta vs post-audit plan anchor (`18be117`)

The post-audit plan was authored when HEAD was `5704dd2` (MB-T40 ship + 5 followups filed). It treats MB-T41 + MB-T35-revised + MB-T37 + MB-T38 + MB-T39 as pending. **Between `5704dd2` and `7dfa6f2`, all five named tickets shipped.** Plus §B.1, §B.2, §C.5 spike + WB1-4, §C.1′ ticket #1.

| Surface | Post-audit plan / BUILD doc claim | Actual state at `7dfa6f2` | Citation |
|---|---|---|---|
| MB-T41 (HSO system prompt) | "operator-only authoring; gates §5 ticket dispatch" | **SHIPPED** as artifact | commit `c88048c`; file `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md` 23,408 bytes, last-mod May 8 15:57 |
| MB-T35-revised (action variant emission) | "fires post-MB-T41 per §5" | **SHIPPED as code + unit-tested** | commit `f8c679d` (WB4 findings doc); file `src/main/action-variant-ipc.ts:246` `dispatchActionVariant` |
| MB-T36 (orchestrator-fired spawn) | "shipped at `a93ad74`" | **SHIPPED** | per plan §5.2 cross-ref + `src/main/orchestrator-fire-spawn.ts:47` `fireOrchestratorSpawn` |
| MB-T37 (OrchestratorPoolManager) | "fires post-MB-T41 per §5" | **SHIPPED as code + unit-tested** | commit `38b1a03`; file `src/coarchitect/hso-pool.ts:100` `class OrchestratorPoolManager` |
| MB-T38 (swarm-state-writer) | "fires post-MB-T41 per §5; D9 scope expansion" | **SHIPPED as code + unit-tested** | commit `70674e1`; file `src/coarchitect/swarm-state-writer.ts:125` `class SwarmStateWriter` |
| MB-T39 (peer-summary-harvester) | "fires post-MB-T41 per §5" | **SHIPPED as code + unit-tested** | commit `bb2698f` (WB2) + `bb4c47c` (MULTI-CHUNK fix); file `src/coarchitect/peer-summary-harvester.ts:117` `class PeerSummaryHarvester` |
| MB-T40 (chat-panel PTY refactor) | "shipped (pre-HEAD)" | **SHIPPED + WIRED** | commit `5704dd2` (WB4); main.ts line 459 `wirePtyRelay(consoleController)` activated at `5aca470` |
| §B.1 tile visual separation | "ships before v3.5 ship" | **SHIPPED** | commit `510071e` |
| §B.2 window title suffix | "ships before v3.5 ship" | **SHIPPED** | commit `02c4c4a` |
| §C.5 PTY token meter spike | "spike before ticket per §A.2.R" | **SHIPPED** | commit `ef2dd3d` (cross-substrate regex stable, 3/3 substrates) |
| §C.5 token meter ticket | "ticket post-spike + post-§C.1′ ticket #1" | **SHIPPED** | commits `63f9b03` (WB1+2) + `13b7607` (WB3+4) |
| §C.1′ ticket #1 (Frame router) | "load-bearing for tickets #2-4" | **SHIPPED + WIRED** | commit `44764fd`; sentinel `=== BEGIN: §C.1′ frame-mode IPC ===` at main.ts:413-421 |
| §C.1′ ticket #2 (Frame C surface) | v3.5 ship-gate row | **NOT SHIPPED** | not in `git log` |
| §C.1′ ticket #3 (Detail-pane footer actions) | v3.5 ship-gate row | **NOT SHIPPED** | not in `git log` |
| §C.1′ ticket #4 (Compact tile mode) | v3.5 ship-gate row | **NOT SHIPPED** | not in `git log` |
| §C.6 BUILD.md tab | v3.5.1 row, "post-HSO Wave 1" | **NOT SHIPPED** | not in `git log` |
| §A.3 (2) header-bar PlanRing+MixIndicator | "bundles into §C.1′ ticket #1 scope" | **SHIPPED** (folded into FrameShellHeader per c1r findings doc §I) | per `docs/coordination/c1r-ticket1-findings-2026-05-10.md` |

### §1.2 Two coexisting orchestration paths (KNOWN per main.ts + coarchitect-ipc.ts reads)

**v3.0 API-orchestrator path — WIRED, operational, token-billed.**

`coarchitect-ipc.ts:314-543` registers IPC handler `coarchitect:sendAndStream`:
1. Operator types in chat-panel → `streamingBridge.sendAndStream(content)` → IPC `coarchitect:sendAndStream` (or PTY path; see §1.3 ambiguity).
2. Handler reads BuildDocConfig, creates `AnthropicChatClient` via `createAnthropicClient(systemPrompt)` (line 332).
3. Builds Tier 4 payload via `buildTier4Payload` (line 360) — includes spawned-session list + autopilot pending intents.
4. `chatClient.streamMessages(...)` streams response chunks; each chunk forwarded via `event.sender.send('coarchitect:streamChunk', chunk)`.
5. On stream completion, `routeOrchestratorOutput(fullResponse, ...)` (line 420) parses the full response.
6. If `decision.kind === 'card-or-multi-choice'`: card envelopes emitted via `emitCardEnvelopes` to dispatch-web kanban.
7. If `decision.kind === 'action-fire-without-card'`: `dispatchAction(decision.action, defaultDispatchActionDeps({...}))` (line 533) — fires through:
   - `fireSendPrompt` → `SessionSendPromptIpcController` → tmux send-keys
   - `fireSpawn` → `fireOrchestratorSpawn(payload, {readDispatchMode, ...})` → SpawnIpcController → tmux + daemon registration
   - `fireKill` → tmux kill + PATCH /v2/sessions/:name/state
   - `firePullHandoff` → GET /v2/sessions/:name/handoff
   - `startIntent` → autopilot.startIntent (assign-task)

This path uses `ANTHROPIC_API_KEY` (loaded via `loadEncryptedApiKey` in `defaultSpawnHandlerDeps`). Token-billed per orchestrator turn. Approval gate: `resolveApprovalShim` consulted per action variant.

**v3.5 PTY-orchestrator path — WIRED for display, NOT WIRED for action dispatch.**

`main.ts:459` calls `wirePtyRelay(consoleController)` (export from `coarchitect-ipc.ts:250`). This calls `registerPtyRelay({broadcaster, getWebContents})` from `pty-stream-relay.ts:40`:
1. `broadcaster.addStdoutObserver` subscribes to all PTY chunks.
2. **Filter `if (sessionName !== '__orchestrator_active') return;`** at `pty-stream-relay.ts:48` — only the reserved orchestrator session is forwarded.
3. Each chunk: forward to all webContents via `wc.send('coarchitect:ptyChunk', chunk)`.
4. Chunk appended to `ptyBuffer`. `parseActionMarker(ptyBuffer)` checked for complete `[ACTION:type]...[/ACTION]` block (fast-path).
5. If marker complete: reformat as plain text + `wc.send('coarchitect:ptyTurnDone', formatted)`.
6. Else: outer-quiescence timer (default 3000ms); on timeout, send `ptyTurnDone` with full buffer text.

Renderer-side (`coarchitect/pty-streaming-bridge.ts:27` `class PtyStreamingBridgeImpl`) also implements the same logic for direct broadcaster subscription (test/non-IPC path). The chat-panel (`chat-panel.tsx:69-128` `useEffect`) subscribes via `streamingBridge.onStreamChunk` + `onStreamDone` and renders chunks as in-progress bubbles + completed text as history bubbles.

**Critical:** when `parseActionMarker` returns a non-null marker, the marker is **reformatted to plain text and rendered as a chat bubble**. It is NOT forwarded to `dispatchActionVariant` (action-variant-ipc.ts:246). Production grep:

```
grep -rE "dispatchActionVariant|action-variant:fired" packages/dispatch-workstation/src/
  | grep -v "test/" | grep -v "\.spec\." | grep -v "\.test\."
```

Returns: 1 hit (`swarm-state-writer.ts:207` subscribes to `'action-variant:fired'`) + the action-variant-ipc.ts internal definitions. **Zero production callers of `dispatchActionVariant`.** [KNOWN]

### §1.3 HSO Wave 1+2 production wiring status (KNOWN per main.ts grep)

`main.ts` symbol grep:

```
grep -nE "(OrchestratorPoolManager|PeerSummaryHarvester|SwarmStateWriter|dispatchActionVariant|registerPtyRelay|registerTileTokenScraper|hso-pool|wirePtyRelay|fireOrchestratorSpawn)" main.ts
```

Hits at: `wirePtyRelay` (line 459), `registerTileTokenScraper` (line 466), `getOrchestratorSpawnController` (line 60+), `fireOrchestratorSpawn` (line 45 import). **No matches for `OrchestratorPoolManager`, `PeerSummaryHarvester`, `new SwarmStateWriter`.**

Sentinel zone inventory (main.ts grep `=== `): zones for MB-T12, MB-T16, MB-T17, MB-T22, MB-T24, MB-T40, §C.1′, §C.5, plus pre-existing Fix-A/B/C/89/92, Probe-92, Session-3. **No sentinel for MB-T37, MB-T38, MB-T39, MB-T35-revised wiring.** [KNOWN]

Cross-package production-side instantiation grep:

```
grep -rE "(OrchestratorPoolManager|PeerSummaryHarvester|new SwarmStateWriter|registerPtyRelay)" packages/dispatch-workstation/src/
  | grep -v "test/" | grep -v "\.spec\." | grep -v "\.test\."
```

Only file-internal class definitions (`hso-pool.ts:100`, `peer-summary-harvester.ts:117`, `swarm-state-writer.ts:125`) and `coarchitect-ipc.ts:251` (the `registerPtyRelay({...})` call inside `wirePtyRelay` export — which IS wired via main.ts). [KNOWN]

**Conclusion (KNOWN):** the HSO Wave 1+2 mechanism (pool / writer / harvester / marker dispatch) is shipped as code + unit-tested, but **not instantiated in Electron main process startup**. The production workstation does not run an HSO autopilot loop.

### §1.4 §A ratifications still authoritative as of plan-mode session start

[KNOWN per `docs/coordination/v35-post-audit-plan-2026-05-10.md` §A.1.R / §A.2.R / §A.3.R / §A.4.R, ratified 2026-05-10 at plan HEAD `18be117`]:

- **§A.1.R = (2)** Frame-C-primary + A toggle. §C.1′ tickets #1-4 form the v3.5 chrome track. §C.1 (three-region-permanent) and §C.2 (full A/B/C/D) closed as not-selected.
- **§A.2.R = (c)** PTY scrape token source. §C.5 spike (`ef2dd3d`) ratified regex stability; §C.5 ticket (`63f9b03` + `13b7607`) shipped.
- **§A.3.R = (2)** Add second PlanRing + MixIndicator instance to `#header-bar` (in addition to chead). Per `c1r-ticket1-findings-2026-05-10.md` §I, this folded into §C.1′ ticket #1 FrameShellHeader scope and shipped at `44764fd`.
- **§A.4.R = Option-C-revised + 60-min v3.5-alpha + 120-min v3.5.1 + two-gate split.** v3.5-alpha = HSO infrastructure alone; v3.5 = HSO + audit-track chrome; v3.5.1 = 120-min sustained dogfood + §C.6 BUILD.md tab.

[MODELED]: §A ratifications reflect operator intent at 2026-05-10; this plan-mode session does not re-confirm them. They have not been visibly amended in the working tree since `c147037`.

### §1.5 Dogfood evidence status

[KNOWN per `docs/coordination/v35-dogfood-findings-2026-05-10.md` (commit `d05b6c0`)]:

- Dogfood session 2026-05-09 → 2026-05-10 closed under option (C): **Phase A complete (all 6 gates) + Phases B/C/D unexecuted** (audit-superseded close).
- Q-V35-7(a) v3.5-alpha ship-gate criteria: **NOT YET MEASURED**:
  - 60-min continuous HSO uptime — not measured
  - ≥2 successful handoffs — not measured
  - ≥80% action variant fire-correctness — not measured
- Phase A surfaced 2 new operator-arbitration items:
  - `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` (Tier 1, open) — Electron BrowserWindow auth blocker; Phase B never evaluated cookie state
  - `MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION` — closed (binary-resolver.ts ships absolute claude path)
- New finding filed: `MB-F-DOGFOOD-LONG-PAUSE-PROCESS-LIVENESS` (Tier 3) — methodology fix for resume-after-pause.

Per (ii) Q-Reshape-2 disposition: v3.5-alpha is **ship-blocked on (1) wiring + (2) evidence**. Mechanism shipped ≠ integration runs end-to-end.

---

## §2.A — Dimension A: Conductor spawning sessions

**Question:** end-to-end, can the workstation orchestrator (Conductor chat panel) spawn a peer CC CLI session that executes work and reports back?

### §2.A.1 — Verified end-to-end (KNOWN)

**A1. Operator-driven UI spawn modal → tmux peer session.**
- Path: `+ Spawn Session` button in `#header-bar` → `#spawn-modal` → `workstationBridge.requestSpawn` → IPC `workstation:spawn-requested` → `SpawnIpcController.handleSpawnRequest` (`spawn-handler.ts`) → tmux `new-session` with absolute claude binary path (`binary-resolver.ts:resolveClaudeBin`) → daemon `POST /v2/sessions` registration.
- Approval gate: ask-mode reads `dispatch-mode-store.readDispatchMode()`; if `'ask'`, surfaces `#spawn-confirm-modal` via `sharedSpawnConfirmGate` before firing.
- Closure of `MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION` Tier 1 (per FOLLOWUPS.md line 148): absolute path bypasses `ALLOWLIST_PATH` exclusion of `~/.local/bin` (Anthropic official-installer location).
- [KNOWN — `spawn-ipc.ts`, `spawn-handler.ts`, `binary-resolver.ts`, FOLLOWUPS.md grep]

**A2. Manual operator tmux spawn of `__orchestrator_active`.**
- Pattern from dogfood doc Phase C cmd line 102:
  ```
  tmux new-session -d -s __orchestrator_active -c <repoPath> \
    "/Users/joshuatseppich/.local/bin/claude --dangerously-skip-permissions \
    --model claude-sonnet-4-6 \
    --append-system-prompt \"$(cat packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md)\""
  ```
- Workstation observes the session via `wirePtyRelay` (main.ts:459) → chat-panel renders PTY output as bubbles.
- [KNOWN — `v35-dogfood-findings-2026-05-10.md` §2 Gate 6, dogfood line 99-104]

**A3. CC-spawns-CC capability across substrates (3/3).**
- Per `spike-c5-pty-scrape-2026-05-10.md` §5 + `c1b78c4` SPIKE-HSO-01 ratification: `--model` flag selects substrate (`claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001` all spawn correctly under `--dangerously-skip-permissions`).
- Max-plan keychain auth inherits across child sessions (verified across 3 substrates 2026-05-10).
- [KNOWN — `spike-c5-pty-scrape-2026-05-10.md` §5]

### §2.A.2 — Mechanism shipped, NOT auto-wired (KNOWN per main.ts grep)

**A4. HSO pool auto-spawn (active + standby).**
- Code: `coarchitect/hso-pool.ts:114-124` — `OrchestratorPoolManager.start()` spawns `RESERVED_ACTIVE = '__orchestrator_active'` then `RESERVED_STANDBY = '__orchestrator_standby'` via injected `spawnController.handleSpawnRequest({...permissionMode: 'auto'})`.
- Production wiring: **none.** No `new OrchestratorPoolManager(...)` outside test/. No call to `.start()` from main.ts. The pool does not run at workstation startup.
- Dependency: would need an `orchestratorSystemPromptPath` dep (the MB-T41 artifact at `src/main/hso-system-prompts/orchestrator.md`) wired via `--append-system-prompt` flag in spawn argv — current `spawn-handler.ts` does NOT pass `--append-system-prompt`; this would need additive scope on top of OrchestratorPoolManager wiring.
- [KNOWN — `hso-pool.ts:114-124`, main.ts symbol grep]

**A5. Orchestrator-fired peer-spawn via PTY ACTION marker.**
- Code: `action-variant-ipc.ts:275-296` — `case 'spawn-session'` validates marker fields, consults approval resolver, calls `deps.fireSpawn(sessionName, initialPrompt, rationale)`, emits `ACTION_VARIANT_FIRED_EVENT`.
- Production wiring: **none.** `dispatchActionVariant` has zero production callers. The `parseActionMarker` parser runs in `pty-stream-relay.ts:59` and `pty-streaming-bridge.ts:48` — both reformat-to-text and emit `ptyTurnDone`; neither calls `dispatchActionVariant`.
- [KNOWN — production grep for `dispatchActionVariant`]

### §2.A.3 — Operational via legacy v3.0 API path (KNOWN per coarchitect-ipc.ts read)

**A6. Orchestrator-fired peer-spawn via API-emitted JSON action.**
- Path: `coarchitect:sendAndStream` IPC → `chatClient.streamMessages(...)` (Anthropic API call, token-billed) → response parsed by `routeOrchestratorOutput` → `dispatchAction({output: {action: 'spawn-new-session', target, payload}, ...}, deps)` → `deps.fireSpawn(payload)` wired to `fireOrchestratorSpawn(payload, {readDispatchMode, getController, spawnConfirmGate, broadcast})` (coarchitect-ipc.ts:475-489).
- `fireOrchestratorSpawn` (orchestrator-fire-spawn.ts:47): if `mode === 'auto'`, fire `SpawnIpcController.handleSpawnRequest` directly; if `'ask'`, gate through `sharedSpawnConfirmGate.decide(...)`.
- Approval gate: `defaultDispatchActionDeps` wires `resolveApproval: resolveApprovalShim`. Per-session policy resolved via daemon HTTP fetch.
- This path produces real peer CC sessions, observable in tile-grid + PTY consoles.
- Behavior contingent on: `ANTHROPIC_API_KEY` set (loaded via `loadEncryptedApiKey`), `MB_MOCK_ANTHROPIC` not `'1'`, daemon reachable for approval-policy fetch.
- [KNOWN — `coarchitect-ipc.ts:438-543`, `orchestrator-fire-spawn.ts:47-100`]

### §2.A.4 — Operator-only blocking gates

**A7. `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` (Tier 1, open).**
- Per FOLLOWUPS.md line 124 + dogfood findings §2 Gate 5: Workstation Electron BrowserWindow shows dispatch-web "Conductor authentication" screen on every fresh launch. Architectural decision needed: (a) IPC token-injection from `~/.foxworks-dispatch/token`, (b) auth-bypass for workstation context, (c) accept as workstation onboarding step.
- Impact on Dimension A: dogfood Phase B (kanban renders + chat-shell renders) cannot proceed past Gate 5 reliably; full UI-driven spawn validation against live daemon is friction-blocked.
- [KNOWN]

**A8. v3.0 path `system-prompt.md` content.**
- `coarchitect-ipc.ts:95-101` `loadSystemPrompt()` reads `coarchitect/system-prompt.md` from app path. The v3.0 API orchestrator's behavior (whether it emits coherent action JSON) depends entirely on this prompt content.
- Plan-mode session did not read this file (out of Q-Reshape-1 default scope). Disposition is operator territory; if v3.0 API path is the operational orchestrator, this prompt's quality is load-bearing.
- [KNOWN — file existence; content unread]

### §2.A.5 — Dimension A summary

| Capability | Status |
|---|---|
| Operator can spawn a peer via UI | **Verified end-to-end** (A1) |
| Operator can spawn `__orchestrator_active` via tmux + system-prompt | **Verified end-to-end** (A2) |
| Workstation observes `__orchestrator_active` PTY | **Verified end-to-end** (A2 + wirePtyRelay) |
| API orchestrator can spawn peers autonomously | **Mechanism wired** (A6); contingent on API key + non-mock + system-prompt quality |
| HSO PTY orchestrator can spawn peers autonomously | **NOT wired** (A4 + A5); mechanism code exists, no production caller |
| Auto-spawn of active+standby pool at workstation startup | **NOT wired** (A4); OrchestratorPoolManager not instantiated |

[KNOWN] **End-to-end orchestrator-driven peer spawn is operational via the v3.0 API path. Not operational via the v3.5 HSO PTY path.** Manual operator-driven tmux spawn is the bridge pattern in active use per the dogfood doc.

---

## §2.B — Dimension B: Conducting builds

**Question:** under current shipped code, can the orchestrator drive a peer through a complete red→green→commit→push cycle? What's the minimum viable integration test that proves this works?

### §2.B.1 — Verified end-to-end (KNOWN)

**B1. Operator → orchestrator chat → peer.**
- Operator types in chat-panel input → `streamingBridge.sendAndStream(content)` (chat-panel.tsx:144) → IPC → tmux `send-keys` to `__orchestrator_active` → orchestrator response renders as chat bubble via `wirePtyRelay` → `coarchitect:ptyChunk`/`ptyTurnDone` → chat-panel `setHistory([...prev, {role:'assistant', content:text}])` (chat-panel.tsx:88-98).
- [KNOWN — `chat-panel.tsx:69-128`, `pty-streaming-bridge.ts`]

**B2. PTY token-meter scrape per peer.**
- Path: `consoleController.addStdoutObserver` → `tile-token-scraper.ts:62` strips ANSI via `ANSI_CSI_RE`, extracts last `[0-9]+ tokens` match, debounces 500ms per session, calls `onTokenUpdate(sessionName, tokensUsed)` → main.ts:466-473 sends `workstation:tile-token-update` to renderer → preload `workstationBridge.onTileTokenUpdate` → TileGridApp updates `tokensUsed` field.
- [KNOWN — `tile-token-scraper.ts:1-85`, main.ts:461-475 sentinel zone]

**B3. Orchestrator output renders as chat bubble (display only).**
- When orchestrator emits `[ACTION:spawn-session]\n...\n[/ACTION]` in PTY, `parseActionMarker` fast-path triggers in `pty-stream-relay.ts:59` — reformats marker to plain text + emits `coarchitect:ptyTurnDone` — chat-panel renders as bubble. Operator sees the action intent; system does not act on it.
- [KNOWN — `pty-stream-relay.ts:57-77`]

### §2.B.2 — Mechanism shipped, NOT wired for autonomy (KNOWN)

**B4. PTY → marker dispatch → action fire (MB-T35-revised).**
- Code: `action-variant-ipc.ts:246-357` — `dispatchActionVariant(parsed: ParsedActionMarker, deps: ActionVariantDispatchDeps)` validates 5 marker types (`send-prompt-to-session`, `spawn-session`, `kill-session`, `pull-handoff-from-session`, `assign-task`) against inline schemas, consults `deps.resolveApproval`, fires through 5 narrow injectable deps, emits `actionVariantEmitter.emit('action-variant:fired', firedPayload)`.
- F-MBT35R-A: marker fields drift from §12 SpawnSessionActionPayloadSchema (e.g., spawn-session marker has `sessionName + initialPrompt + rationale`; §12 schema has `sessionName + repoPath + initialPrompt + rationale`). Dispatcher bridges via field mapping; spawn-session repoPath resolved by dep (F-MBT35R-B).
- F-MBT35R-C: dispatch-workstation does not declare zod as direct dep; inline manual validation used.
- Production wiring: **none.** Zero callers of `dispatchActionVariant` outside test/. Per `pty-stream-relay.ts:59-77`, marker is parsed but only reformatted to text + sent as `ptyTurnDone` payload (chat-bubble display).
- [KNOWN — `action-variant-ipc.ts:246`, production grep zero hits]

**B5. Peer self-summary harvest (MB-T39 PeerSummaryHarvester).**
- Code: `peer-summary-harvester.ts:117-376` — subscribes to `ptyBroadcaster.addStdoutObserver`, debounces per-session quiescence (default 3000ms), injects MB-T41 §3 + §7 summary prompt via `promptInjector.handleSendPrompt({sessionName, prompt})`, parses YAML response with strict schema (`peer_session`, `task`, `files_touched`, `result`, `completion_status`, `no_follow_up`, `follow_up_action?`), validates `completion_status ∈ {complete, TURN_INCOMPLETE, error}`, emits `'peer:turn-complete'` payload (camelCase-translated) on `stateEmitter`. Honors TURN_INCOMPLETE binary protocol per spike SPIKE-HSO-01 scenario 2 (1/1 in spike, 100% fidelity).
- MULTI-CHUNK fix at `bb4c47c`: per-peer response buffer + inner quiescence (default 500ms) + first-chunk fast-path for exact `TURN_INCOMPLETE` match.
- `addStdoutObserver` filters out `^__orchestrator_*` patterns (Q-MBT39-4) — orchestrator sessions never harvested.
- Production wiring: **none.** No `new PeerSummaryHarvester(...)` outside test/. No `.start()` call from main.ts. Peers receive no auto-summary prompts.
- Consequence: even if dispatchActionVariant were wired and the orchestrator spawned a peer, no automatic peer-progress monitoring fires.
- [KNOWN — `peer-summary-harvester.ts:117-376`, main.ts symbol grep]

**B6. swarm-state.md continuous write + handoff document one-shot (MB-T38 SwarmStateWriter).**
- Code: `swarm-state-writer.ts:125-414` — subscribes to 7 EventEmitter events: `'tile-grid:session-add'`, `'tile-grid:session-remove'`, `'action-variant:fired'`, `'halt:emitted'`, `'error:recorded'`, `'peer:turn-complete'`, `'handoff:triggered'`. Per D9 separate-call-stack discipline: continuous events trigger `writeSwarmState()` (atomic overwrite of `<config.swarmStatePath>` via `.tmp` + `renameSync`); handoff trigger calls `writeHandoffDoc()` ONLY (one-shot at `<config.handoffDir>/handoff-<ISO-timestamp>.md`), never co-writes swarm-state.
- Schema per orchestrator.md §1: `# Active Peers`, `## Actions Fired Since Last Update`, `## Active HALTs` (with halt_urgency / halt_emitted_at / halt_blocking metadata per SPIKE-HSO-02 D2), `## Unresolved Errors`, `## Outstanding Decisions`, `## Peer Self-Summaries` (YAML blocks).
- Handoff doc structure per SPIKE-HSO-02 D8: 5 sections (state summary, verbatim unsent prompts, sequencing intent, HALT severity rationale, explicit "do not" list).
- Production wiring: **none.** No `new SwarmStateWriter(...)` outside test/. Even if dispatchActionVariant were wired, the `'action-variant:fired'` events would have no subscriber.
- Consequence: swarm-state.md is not maintained in production. Handoff documents are not generated.
- [KNOWN — `swarm-state-writer.ts:125-414`, main.ts symbol grep]

### §2.B.3 — Operational via legacy v3.0 API path (KNOWN)

**B7. API orchestrator drives peers through TDD cycle.**
- Mechanism: `coarchitect:sendAndStream` IPC handler (coarchitect-ipc.ts:314-543) — operator types in chat → API call → JSON action variant → `dispatchAction` (line 533) → fires:
  - `assign-task` → `autopilot.startIntent(payload)` records intent
  - `send-prompt-to-session` → tmux send-keys to peer
  - peer responds in tmux pane
  - peer's PTY observed by `consoleController` (CONSOLE-T01 broadcaster) but NOT auto-summarized (B5 unwired)
- For an autonomous red→green→commit→push cycle on a peer:
  - API orchestrator must emit `assign-task` then sequence of `send-prompt-to-session` calls
  - Peer's progress visible to orchestrator via Tier 4 fan-out (`buildTier4Payload` reads daemon session list + autopilot pending intents) — but Tier 4 does NOT include peer self-summaries (B5 unwired)
  - API orchestrator must infer peer state from session metadata + operator messages
- [MODELED] this is technically possible but the API orchestrator lacks the per-turn peer-summary signal that MB-T41's §3 + §7 protocol assumes. The `system-prompt.md` (v3.0 era) would need to drive this without those signals; behavior quality is contingent on prompt design.
- [KNOWN-mechanism, MODELED-quality]

### §2.B.4 — Dimension B summary

| Capability | Status |
|---|---|
| Operator-driven chat to orchestrator (display only) | **Verified end-to-end** (B1) |
| Per-tile token meter (PTY scrape) | **Verified end-to-end** (B2) |
| Orchestrator emits ACTION marker → fires action | **NOT wired via PTY path** (B3 + B4); WIRED via API path (B7) |
| Auto peer-summary harvest with TURN_INCOMPLETE protocol | **NOT wired** (B5) |
| swarm-state.md continuously maintained | **NOT wired** (B6) |
| Handoff document generated at handoff trigger | **NOT wired** (B6) |
| Full red→green→commit→push autonomy via API path | [MODELED] possible without B5/B6 signals; quality contingent on v3.0 system-prompt |
| Full red→green→commit→push autonomy via HSO PTY path | **NOT operational** (B4 + B5 + B6 all unwired) |

---

## §2.C — Dimension C: Working parallel

**Question:** what's the minimum viable HSO parallel orchestration that works today (zero tickets remaining)? After 1 more ticket? After 3 more? Identify the smallest unit of work that lights up a parallel orchestrated session.

### §2.C.1 — Verified end-to-end (KNOWN)

**C1. Human-coordinated parallel CC sessions.**
- Today's session evidence: this session (Opus 4.7, 1M context, plan-mode) co-exists with operator's other CC contexts. Per CLAUDE.md §4.3 worktree pattern + per-path git add (§2.7) + per-commit-push (§2.6) discipline.
- §0 staging verification reads coordination notes before committing.
- [KNOWN]

**C2. Multiple peer sessions runnable in parallel via tmux.**
- Spike evidence: §C.5 spike (`ef2dd3d`) ran 3 substrates simultaneously in 3 distinct tmux sessions (`spike-s46`, `spike-o47`, `spike-h45`). Each session has its own PTY; daemon registry tracks sessions by name; tile-grid renders auto-grid layout up to 2×4+overflow.
- [KNOWN — `spike-c5-pty-scrape-2026-05-10.md` §3]

### §2.C.2 — Mechanism shipped, NOT wired (KNOWN)

**C3. OrchestratorPoolManager handoff trigger + standby promotion.**
- Code: `hso-pool.ts:179-215` `_onPtyChunk` — observes `[ACTION:` / `[/ACTION]` for mid-action lock, observes `[HANDOFF-EMITTED]` marker for promotion, observes status-bar `([0-9]+) tokens$` regex for token threshold (HANDOFF_TOKEN_THRESHOLD = 130_000 = 65% of 200K window per SPIKE-HSO-01 D3). When threshold crossed AND not mid-action AND not awaiting-marker, sends `[HANDOFF-NOW]\n` directive via `handleSendStdin`. On `[HANDOFF-EMITTED]` marker receipt, promotes standby + spawns fresh standby.
- Crash detection: `_onSessionClose` (PTY stream-close, first-fires-wins) + `_pollOnce` (tmux `has-session` poll every POLL_INTERVAL_MS = 5_000 ms). Both routes call `_promote()` for active or `_spawnAndRegister(RESERVED_STANDBY)` for standby.
- Halt path: `PARSE_FAIL_MAX = 3` consecutive non-parseable status-bar lines → `deps.halt(reason)`.
- Production wiring: **none.** `OrchestratorPoolManager.start()` never called in production. Pool does not run; thresholds never observed; handoff never fires; standby never promoted; crashes never auto-handled.
- [KNOWN — `hso-pool.ts:179-247`, main.ts grep]

**C4. swarm-state.md as canonical state across handoffs.**
- Per orchestrator.md §1 + §8: swarm-state.md is the canonical session-state store; successor reads BUILD.md + swarm-state.md + handoff document (Shape A per SPIKE-HSO-02 ratification at `05154fb`) cold to reconstruct state.
- Code path: ActionVariantFired event → SwarmStateWriter.onActionVariantFired (line 158) → push to actions[] → writeSwarmState() → atomic write of formatted markdown.
- Production wiring: **none.** No SwarmStateWriter instantiated. swarm-state.md does not exist in the repo (verified by absence in `git ls-files` historical familiarity, MODELED — not directly checked this session).
- [KNOWN-code-path, MODELED-file-absence]

**C5. Peer self-summary YAML harvest with TURN_INCOMPLETE.**
- Per §2.B.5 above. PeerSummaryHarvester not instantiated; peers don't receive auto-summary prompts; swarm-state.md `## Peer Self-Summaries` section never populated.
- [KNOWN]

**C6. Action variant emission tracking.**
- Per §2.B.4 above. `dispatchActionVariant` not called in production; `actionVariantEmitter.emit('action-variant:fired', ...)` never fires; SwarmStateWriter's `'action-variant:fired'` listener (swarm-state-writer.ts:207) — even if SwarmStateWriter were instantiated — would receive nothing.
- [KNOWN]

### §2.C.3 — Operational gap impact

**C7. HSO automated parallel orchestration: NOT OPERATIONAL.**
- The autonomy loop (orchestrator perceives → emits action → action fires → state updated → handoff at threshold → standby promoted) is **broken at the action-fires step** (B4) AND **at the state-updated step** (C4) AND **at the handoff-at-threshold step** (C3). All three load-bearing transitions require wiring.
- Q-V35-7(a) 60-min uptime measurement: **cannot proceed against unwired infrastructure**. The criteria require the loop to operate; it doesn't.
- Per (ii) Q-Reshape-2: v3.5-alpha is **ship-blocked on (1) wiring + (2) evidence**.
- [KNOWN]

### §2.C.4 — Smallest unit of work that lights up parallel orchestration

[SPECULATIVE — estimate; depends on Q-OR-1/Q-OR-2 resolution per §7]

**Today (zero new tickets):**
- HSO automated parallel: not lit. v3.0 API path can drive multiple peers in parallel via repeated `dispatchAction` calls from a single API orchestrator turn — but per §3.6 of orchestrator.md "one action per turn," this is not the intended pattern.
- Manual operator can run multiple `__orchestrator_*`-prefixed sessions concurrently via separate tmux sessions; each independently observable via wirePtyRelay-equivalent (but wirePtyRelay hardcodes `'__orchestrator_active'` filter at pty-stream-relay.ts:48 — only one orchestrator session forwards to chat-panel at a time).

**After 1 more ticket (MB-T-HSO-WIRE-MIN — minimal HSO wiring):**
- Scope: instantiate `OrchestratorPoolManager.start()` + wire `dispatchActionVariant` to PTY marker emission + instantiate SwarmStateWriter subscribed to actionVariantEmitter + instantiate PeerSummaryHarvester. NEW main.ts sentinel zone.
- Estimated WB count: 8-12 single-session.
- Lights up: full HSO autonomy loop end-to-end. Active+standby auto-spawned at workstation startup. ACTION markers fire actions. swarm-state.md maintained. Peers auto-summarized. Handoff at 65% token threshold. Standby promoted on handoff or active crash.
- Gates Q-V35-7(a) 60-min dogfood measurement.

**After 3 more tickets (MB-T-HSO-WIRE-MIN + MB-T-HSO-MIGRATION + dogfood-window):**
- (1) MB-T-HSO-WIRE-MIN as above
- (2) MB-T-HSO-MIGRATION: v3.0 API path wind-down or behind-flag (per Q-OR-1 resolution)
- (3) dogfood-window: 60-min v3.5-alpha + 120-min v3.5.1 measurement sessions per Q-V35-7
- Lights up: confirmed v3.5-alpha ship + v3.5.1 ship-confidence band. PlanRing + CostMeter data-path migration (`MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2 + `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` Tier 3) closes via PTY-scrape consumption.

[SPECULATIVE — these estimates depend on Q-OR-1/Q-OR-2 outcome.]

---

## §3 — Minimum viable integration tests with author-able-today flags

Per Q2 + (c) operator instruction: each test row tagged `AUTHOR-ABLE TODAY` (no infrastructure blockers) or `BLOCKED-ON: <ticket / infra>` so §6 sequencing is actionable.

### §3.A — Dimension A integration tests (spawning)

**probe-A-01-orchestrator-fired-spawn-via-pty-action.test.ts**
- Assertion: workstation receives `[ACTION:spawn-session]\nsessionName: foo\ninitialPrompt: bar\n[/ACTION]` on `__orchestrator_active` PTY → `dispatchActionVariant` fires `fireSpawn('foo', 'bar', undefined)` → tmux session `foo` exists.
- Exercises: `pty-stream-relay.ts` parser + `dispatchActionVariant` + `fireOrchestratorSpawn` + SpawnIpcController.
- **BLOCKED-ON:** wiring of `dispatchActionVariant` to PTY marker emission in main.ts (production-side parser tap). Estimated 30-50 LOC sentinel zone.

**probe-A-02-hso-pool-startup-spawns-active-and-standby.test.ts**
- Assertion: `OrchestratorPoolManager.start()` spawns `__orchestrator_active` then `__orchestrator_standby` via injected SpawnIpcController; tile-grid registry contains both.
- Exercises: `hso-pool.ts:114-156`, ITileGridRegistry adapter, ConsoleIpcController observer subscription, SpawnIpcController integration.
- **BLOCKED-ON:** OrchestratorPoolManager instantiation in main.ts. Plus: spawn-handler currently does NOT pass `--append-system-prompt <orchestrator.md>` argv; pool would need to inject the prompt path into spawn argv (additive scope).

**probe-A-03-spawn-via-api-orchestrator-action-with-mock-anthropic.test.ts**
- Assertion: with `MB_MOCK_ANTHROPIC=1` + `MB_MOCK_ANTHROPIC_RESPONSE=spawn_action`, `coarchitect:sendAndStream` IPC fires `dispatchAction({action: 'spawn-new-session', ...})` → `fireOrchestratorSpawn` → `SpawnIpcController.handleSpawnRequest` invoked.
- Exercises: full v3.0 API path including `routeOrchestratorOutput` + `dispatchAction` + MB-T36 closure.
- **AUTHOR-ABLE TODAY** (mock-anthropic mode wired in coarchitect-ipc.ts:320-329; MB_MOCK_ANTHROPIC test hook exists).

**probe-A-04-manual-tmux-spawn-pty-relay-roundtrip.test.ts**
- Assertion: spawn `__orchestrator_active` via direct `tmux new-session ... claude --append-system-prompt`; observe `coarchitect:ptyChunk` events arrive at renderer with non-empty content.
- Exercises: `wirePtyRelay`, ConsoleIpcController, dogfood Phase C operator pattern.
- **AUTHOR-ABLE TODAY** (all wiring in place; needs Electron test harness or smoke-test extension).

### §3.B — Dimension B integration tests (build-driving)

**probe-B-01-pty-marker-parse-fires-spawn-action.test.ts**
- Assertion: orchestrator emits ACTION marker in PTY → workstation calls `dispatchActionVariant` → action fires through correct dep.
- Exercises: PTY parser + dispatch pipeline end-to-end.
- **BLOCKED-ON:** dispatchActionVariant production wiring (same as A-01).

**probe-B-02-api-orchestrator-fires-spawn-then-send-prompt-to-peer.test.ts**
- Assertion: with mock Anthropic returning a 2-action sequence (spawn, then send-prompt-to-session), full chain fires: spawn modal/auto-fire → tmux peer alive → send-prompt → peer receives prompt via tmux send-keys.
- Exercises: v3.0 dispatchAction with multiple invocations + autopilot recordAction + Tier 4 fan-out.
- **AUTHOR-ABLE TODAY** (mock-anthropic + existing IPC handlers wired).

**probe-B-03-peer-summary-harvester-receives-yaml-and-writes-swarm-state.test.ts**
- Assertion: PeerSummaryHarvester observes peer quiescence → injects summary prompt → receives valid §7 YAML → emits `peer:turn-complete` payload → SwarmStateWriter receives event → swarm-state.md written with `## Peer Self-Summaries` block populated.
- Exercises: harvester + writer integration through shared EventEmitter.
- **BLOCKED-ON:** PeerSummaryHarvester + SwarmStateWriter instantiation in main.ts.

**probe-B-04-token-meter-updates-on-pty-tokens-N.test.ts**
- Assertion: PTY chunk containing `... 24220 tokens` → `tile-token-scraper` extracts → debounce 500ms → `workstation:tile-token-update` IPC arrives at renderer with `tokensUsed: 24220`.
- Exercises: §C.5 wiring end-to-end.
- **AUTHOR-ABLE TODAY** (all wiring in main.ts:461-475).

**probe-B-05-orchestrator-pty-action-marker-displays-as-chat-bubble.test.ts**
- Assertion: orchestrator emits `[ACTION:send-prompt-to-session]...[/ACTION]` in PTY → chat-panel renders the marker text as an assistant bubble (current display-only behavior).
- Exercises: pty-stream-relay marker fast-path + chat-panel onStreamDone handler.
- **AUTHOR-ABLE TODAY**. Documents the current display-only contract; should be authored as a regression-pin so MB-T-HSO-WIRE doesn't accidentally lose the display path while adding dispatch.

### §3.C — Dimension C integration tests (parallel)

**probe-C-01-hso-pool-handoff-on-token-threshold.test.ts**
- Assertion: pool observes `131000 tokens` on active PTY → sends `[HANDOFF-NOW]\n` via stdin → on `[HANDOFF-EMITTED]` marker, promotes standby to active + spawns fresh standby.
- Exercises: hso-pool.ts:179-227 token threshold + promote logic.
- **BLOCKED-ON:** pool wiring + ConsoleIpcController.handleSendStdin path verification.

**probe-C-02-active-crash-promotes-standby.test.ts**
- Assertion: pool detects active session crash via PTY stream-close OR tmux poll → calls `_onActiveCrash()` → standby promoted + new standby spawned. Crash-handled-once flag prevents double-promote.
- Exercises: hso-pool.ts:229-247 crash paths.
- **BLOCKED-ON:** pool wiring.

**probe-C-03-swarm-state-md-written-on-action-variant-fired.test.ts**
- Assertion: emit `'action-variant:fired'` on stateEmitter with `{actionType: 'spawn-session', sessionName: 'foo', firedAt: '...', payload: {...}}` → SwarmStateWriter writes swarm-state.md with `## Actions Fired` row.
- Exercises: writer + emitter wiring.
- **BLOCKED-ON:** writer wiring + dispatchActionVariant wiring (since actionVariantEmitter is the production source of `'action-variant:fired'`).

**probe-C-04-handoff-document-generated-on-handoff-triggered.test.ts**
- Assertion: emit `'handoff:triggered'` on stateEmitter → writer generates `<handoffDir>/handoff-<timestamp>.md` with §8.2 5-section structure → does NOT touch swarm-state.md (D9 separate-call-stack).
- Exercises: writer.writeHandoffDoc + D9 discipline.
- **BLOCKED-ON:** writer wiring + handoff-triggered emitter source (would need to be emitted by OrchestratorPoolManager when promote completes; currently pool does not emit this event — tracked as wiring scope).

**probe-C-05-two-parallel-peers-driven-by-api-orchestrator.test.ts**
- Assertion: with mock Anthropic emitting 2 spawn actions for distinct peer names, both peers spawn; subsequent send-prompt-to-session actions to each peer fire correctly to the right tmux session.
- Exercises: v3.0 path multi-peer; per-session approval-policy resolver shim; per-session autopilot intent tracking.
- **AUTHOR-ABLE TODAY** (v3.0 path mechanism wired).

**probe-C-06-active-and-standby-do-not-conflict-with-operator-manual-spawn.test.ts**
- Assertion: if pool spawns `__orchestrator_active` AND operator manually spawns `__orchestrator_active` via tmux command, both attempts surface error/decline correctly without orphaning daemon registration. (Tests collision avoidance.)
- Exercises: spawn-handler + daemon registration uniqueness + pool's halt path.
- **BLOCKED-ON:** pool wiring; this probe matters specifically because the dogfood operational pattern uses manual spawn (A2). Operator decision Q-OR-2 affects whether this probe is necessary.

### §3.D — Author-able-today summary

| # | Probe | Status |
|---|---|---|
| A-01 | orchestrator-fired-spawn-via-pty-action | BLOCKED-ON: dispatch wiring |
| A-02 | hso-pool-startup-spawns-active-and-standby | BLOCKED-ON: pool wiring + spawn-argv expansion |
| A-03 | spawn-via-api-orchestrator-mock-anthropic | **AUTHOR-ABLE TODAY** |
| A-04 | manual-tmux-spawn-pty-relay-roundtrip | **AUTHOR-ABLE TODAY** |
| B-01 | pty-marker-parse-fires-spawn-action | BLOCKED-ON: dispatch wiring |
| B-02 | api-orchestrator-fires-spawn-then-send-prompt | **AUTHOR-ABLE TODAY** |
| B-03 | peer-summary-harvester-yaml-to-swarm-state | BLOCKED-ON: harvester + writer wiring |
| B-04 | token-meter-updates-on-pty-tokens-N | **AUTHOR-ABLE TODAY** |
| B-05 | orchestrator-pty-action-marker-displays-as-bubble | **AUTHOR-ABLE TODAY** (regression-pin) |
| C-01 | hso-pool-handoff-on-token-threshold | BLOCKED-ON: pool wiring |
| C-02 | active-crash-promotes-standby | BLOCKED-ON: pool wiring |
| C-03 | swarm-state-md-written-on-action-variant-fired | BLOCKED-ON: writer + dispatch wiring |
| C-04 | handoff-document-generated-on-handoff-triggered | BLOCKED-ON: writer wiring + pool handoff event emission |
| C-05 | two-parallel-peers-driven-by-api-orchestrator | **AUTHOR-ABLE TODAY** |
| C-06 | active-standby-no-conflict-with-manual-spawn | BLOCKED-ON: pool wiring + Q-OR-2 resolution |

**5 of 15 probes are author-able today.** They cover: v3.0 API path spawn + multi-peer drive (A-03, B-02, C-05); manual tmux spawn observability (A-04); §C.5 token meter (B-04); current display-only marker contract (B-05). The remaining 10 are gated on MB-T-HSO-WIRE.

---

## §4 — Remaining v3.5 ticket inventory

Per Q3 + confirmation: cite §F.3 verbatim with shipped-status overlay. Cite HSO BUILD §5 verbatim with shipped-status overlay. Surface divergence as open question; do NOT silently reconcile.

### §4.1 — Post-audit plan §F.3 verbatim with shipped-status overlay

[KNOWN per `docs/coordination/v35-post-audit-plan-2026-05-10.md` §F.3 (HEAD `c147037`)]

| §F.3 step | Plan text (verbatim summary) | Shipped status at `7dfa6f2` |
|---|---|---|
| 1.a | §B.3 followups filed at commit 719ec34 ✓ | KNOWN-shipped per `git log` |
| 1.b | §B.1 tile visual separation ticket | KNOWN-shipped at `510071e` |
| 1.c | §B.2 window title suffix ticket | KNOWN-shipped at `02c4c4a` |
| 1.d | HSO MB-T41 operator-only authoring (parallel to operator) | KNOWN-shipped at `c88048c` (orchestrator.md, 23,408 bytes) |
| 2.a | §C.1′ ticket #1 (Frame router) — load-bearing for tickets #2-4 | KNOWN-shipped at `44764fd` |
| 2.b | §A.3 (2) header-bar PlanRing+MixIndicator slot | KNOWN-shipped (folded into §C.1′ #1 per c1r findings doc) |
| 2.c | §C.5 spike (PTY scrape token-source; independent of §A.3) | KNOWN-shipped at `ef2dd3d` |
| 3.a | §C.1′ tickets #2 + #4 (Frame C surface + compact mode) in parallel | NOT SHIPPED |
| 3.b | §C.5 token-wiring ticket (ctx N% on Frame C list-row + detail-pane + Pane + Hero) | KNOWN-shipped (WB1-4 at `63f9b03` + `13b7607`) — but ctx N% on Frame C is empty rendering pending §C.1′ #2 |
| 3.c | HSO Wave 1 (MB-T35-revised + MB-T38) per BUILD §8 Pattern α — parallel to Frame C work | KNOWN-shipped as code (`f8c679d` MB-T35-revised + `70674e1` MB-T38) but **NOT WIRED in main.ts** per §1.3 finding |
| 4.a | §C.1′ ticket #3 (detail-pane footer actions) | NOT SHIPPED |
| 4.b | HSO Wave 2 (MB-T37 + MB-T39) | KNOWN-shipped as code (`38b1a03` MB-T37 + `bb2698f` MB-T39 + `bb4c47c` MULTI-CHUNK fix) but **NOT WIRED in main.ts** per §1.3 finding |
| 5.a | §C.6 BUILD.md tab (depends on swarm-state.md from MB-T38) | NOT SHIPPED — and soft-blocked even if authored, since MB-T38 SwarmStateWriter doesn't run, so swarm-state.md doesn't exist for the tab to read |
| 5.b | HSO dogfood validation | NOT MEASURED (Phase A only per `d05b6c0`) |
| 6 | v3.5-alpha ship-gate: HSO infrastructure complete + 60-min dogfood passed | NOT SATISFIED |
| 7 | v3.5 ship-gate: v3.5-alpha + §B closures + §C.1′ + §A.3 (2) + §C.5 shipped | NOT SATISFIED (§C.1′ #2/#3/#4 pending; v3.5-alpha pending) |
| 8 | v3.5.1 ship-confidence: v3.5 + §C.6 BUILD.md tab + 120-min HSO dogfood | NOT SATISFIED |

### §4.2 — HSO BUILD doc §5 verbatim with shipped-status overlay

[KNOWN per `docs/build-docs/CONDUCTOR_V3.5_BUILD.md` §5]

| §5 ticket | BUILD doc text | Shipped + WIRED status at `7dfa6f2` |
|---|---|---|
| MB-T41 | "HSO system prompt + markdown-marker protocol spec ... operator-arbitrated authoring" | SHIPPED (artifact at `c88048c`); not wired (no IPC consumes it directly; pool would inject via `--append-system-prompt`) |
| MB-T35-revised | "Action variant emission via markdown markers ... wire valid action variants to existing IPC channels (action-variant-ipc.ts, new file)" | SHIPPED-CODE-ONLY (`f8c679d`) — `dispatchActionVariant` defined but zero production callers per §1.2 / §1.3 |
| MB-T36 | "Orchestrator-fired spawn ... replace fireSpawn placeholder throw" | SHIPPED + WIRED at `a93ad74`; `fireOrchestratorSpawn` consumed by v3.0 `dispatchAction` deps in coarchitect-ipc.ts:475 |
| MB-T37 | "Orchestrator pool manager ... new module hso-pool.ts" | SHIPPED-CODE-ONLY (`38b1a03`); no `OrchestratorPoolManager` instance in main.ts; pool does not run |
| MB-T38 | "BUILD.md / swarm-state.md write protocol ... swarm-state-writer.ts" | SHIPPED-CODE-ONLY (`70674e1`); no `SwarmStateWriter` instance in main.ts; swarm-state.md not maintained |
| MB-T39 | "Tier-4 self-summary harvester ... peer-summary-harvester.ts" | SHIPPED-CODE-ONLY (`bb2698f` + `bb4c47c`); no `PeerSummaryHarvester` instance; peers not auto-summarized |
| MB-T40 | "Chat-panel rendering refactor ... consume PTY stream from active orchestrator session" | SHIPPED + WIRED (`5704dd2` + `5aca470`); chat-panel renders `__orchestrator_active` PTY via wirePtyRelay + PtyStreamingBridgeImpl |

### §4.3 — Divergence between §F.3 and §5 disposition (surfaced, not reconciled)

The post-audit plan §F.3 sequencing assumed HSO Wave 1 (MB-T35-revised + MB-T38) would land both as code AND wired into production. The HSO BUILD doc §5 ticket bodies describe scope as "subscribes to..." / "emits..." / "writes to..." — implying wiring as part of the ticket's GREEN exit. But:

- MB-T35-revised landed `dispatchActionVariant` as a pure function with dep-injection seam — wiring left to a downstream consumer (action-variant-ipc.ts:131-186 ActionVariantDispatchDeps interface is dep-injected, not main-process-consumed).
- MB-T37 landed `OrchestratorPoolManager` as a class with constructor deps — `.start()` left to be called by a downstream consumer.
- MB-T38 landed `SwarmStateWriter` as a class with constructor deps — instantiation + EventEmitter wiring left to a downstream consumer.
- MB-T39 landed `PeerSummaryHarvester` as a class with constructor deps — `.start()` left to be called by a downstream consumer.

**Whether this is "the tickets shipped scope" or "scope-shrink that surfaces in retrospect" is operator-arbitration territory.** The pattern is consistent: each ticket landed pure-module + unit-tested code with dep-injection seams; integration into main.ts was not in any ticket's body. This may be intentional (separation of concerns; integration is its own ticket) or may be an unfiled gap.

The plan-mode session does not pre-resolve this. Proposed surfacing as:

**MB-T-HSO-WIRE (new ticket, scope-pending Q-OR-1/Q-OR-2 resolution per §7).**
- Wires `OrchestratorPoolManager.start()` + `PeerSummaryHarvester.start()` + `new SwarmStateWriter(emitter, config)` + main-side parser tap that calls `dispatchActionVariant` on PTY ACTION marker emission.
- New main.ts sentinel zone (e.g., `=== BEGIN: §HSO-WIRE pool + harvester + writer + dispatch ===`).
- Dependency injection: shared EventEmitter bridges actionVariantEmitter ↔ SwarmStateWriter; harvester emits `'peer:turn-complete'` + `'error:recorded'` on same emitter; pool emits `'tile-grid:session-add'` + `'tile-grid:session-remove'` (currently absent from pool code; would need additive scope) + `'handoff:triggered'`.
- Spawn-handler argv expansion: pool's `_spawnAndRegister` needs to inject `--append-system-prompt <orchestrator.md path>` for orchestrator sessions; current spawn-handler does not pass `--append-system-prompt` argv.
- Estimated 8-12 WBs single session (SPECULATIVE).

### §4.4 — Cross-references to Dimensions A/B/C

| Pending ticket | Dimension impact |
|---|---|
| MB-T-HSO-WIRE (proposed) | Lights up A4, A5 (Dim A); B4, B5, B6 (Dim B); C3, C4, C5, C6 (Dim C) |
| §C.1′ ticket #2 (Frame C surface) | Lights up wireframe-author primary mode; UI-only, no autonomy impact |
| §C.1′ ticket #3 (Detail-pane footer actions) | Adds diff/merge/focus actions; no autonomy impact |
| §C.1′ ticket #4 (Compact tile mode for Frame A) | Pure cosmetic; no autonomy impact |
| §C.6 BUILD.md tab | Lights up swarm-state.md visualization; soft-blocked on MB-T-HSO-WIRE (writer instantiation) |
| Dogfood Phase B/C/D | Validates A6, A7, B7, C7 measurements; soft-blocked on MB-T-HSO-WIRE for v3.5-alpha gate |
| MB-F-DISPATCH-WEB-AUTH-PERSISTENCE closure | Unblocks dogfood Phase B reliably; no autonomy impact |

---

## §5 — Operator-only outstanding work

Per project instructions §3.4 + §3.7: strategic decisions are operator-arbitrated only. This section catalogs items the plan-mode session does not have authority to resolve.

### §5.1 — MB-T41 system prompt content disposition

[KNOWN] MB-T41 artifact present at `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md`, 23,408 bytes, last-modified May 8 15:57, committed at `c88048c` (`doc(MB-T41): production HSO orchestrator system prompt`).

Per Q-Reshape-1 confirmation: plan-mode session does NOT assess prompt content quality or completeness. Content review against §3.6/§3.7/§4.1 SPIKE-HSO-01 acceptance criteria + D1-D10 + F1-F15 architectural requirements is operator territory per CLAUDE.md §1 frozen-contract / §3.4 authority.

If MB-T-HSO-WIRE (§4.3) is undertaken, the orchestrator.md file will be consumed via `--append-system-prompt` argv — meaning prompt content directly shapes pool-spawned orchestrator behavior. This raises the operator-content-review bar for the prompt itself; defects in the prompt manifest as defects in HSO autonomy.

### §5.2 — §A re-arbitration potentially needed

[KNOWN per §1.4 + post-audit plan §A.4.R `c147037`]

§A.4.R v3.5-alpha checklist row contains 9 items, marked ☐ at plan authoring time. Current status:
- ☑ MB-T35-revised merged (action-variant emission) — code shipped
- ☑ MB-T36 already closed ✓
- ☑ MB-T37 merged (pool manager) — code shipped
- ☑ MB-T38 merged (swarm-state.md writer with D9 handoff doc scope) — code shipped
- ☑ MB-T39 merged (peer summary harvester) — code shipped
- ☑ MB-T40 merged (chat-panel PTY refactor) — code shipped + wired
- ☑ MB-T41 authored + ratified — artifact shipped at `c88048c`
- ☐ HSO active runs 60-min orchestration without crash — **NOT MEASURED** (mechanism unwired per §1.3)
- ☐ ≥2 successful handoffs during run — NOT MEASURED
- ☐ Action variants fire correctly ≥80% per Q-V35-7 (a) — NOT MEASURED

**Operator decision needed:** does the §A.4.R checklist treat "ticket merged" as satisfied even if main.ts wiring is absent? The checklist literal is "MB-T<NN> merged" — under strict literal reading, the ticket commits ARE merged and the rows ARE checked. Under operational-readiness reading, the loop must run and the wiring is missing.

This is operator territory; plan-mode session preserves both readings without pre-resolving.

### §5.3 — `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` (Tier 1, open) closure

Per FOLLOWUPS.md line 124 + dogfood findings §2 Gate 5: three architectural options surfaced (token-injection / auth-bypass / accept-as-onboarding-step). No closure path ratified.

**Operator decision needed:** select closure path. Affects dogfood Phase B execution reliability (currently Phase B blocked behind auth screen).

### §5.4 — v3.0 API path disposition

[KNOWN per §1.2 + `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3) + `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2)]

The v3.0 API-orchestrator path remains wired in production. Two filed followups anticipate "post-AnthropicChatClient wind-down" data-path migration but do not pre-resolve whether wind-down happens at v3.5 ship, v3.5.1 ship-confidence, or later.

**Operator decision needed:** v3.0 API path keep / wind-down / behind-flag at v3.5 / v3.5.1 / v3.6+. See Q-OR-1 in §7 for the load-bearing version of this decision.

---

## §6 — Sequencing recommendation

Per (b) operator instruction in confirmation 3: distinguish "needed to ship v3.5" from "needed for v3.5 to look complete to users." Per CLAUDE.md §4.3 parallel-CC discipline.

### §6.1 — Critical path to v3.5-alpha (per (ii) Q-Reshape-2 ship-blocked-on-evidence)

**Phase 1 (operator-arbitration session, no code):**
1. Resolve Q-OR-1 (§7) — v3.5 wires HSO PTY-replaces-API or HSO PTY-alongside-API
2. Resolve Q-OR-2 (§7) — HSO pool auto-spawn vs manual operator tmux spawn intended pattern
3. Resolve `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` closure path

**Phase 2 (single CC session, scope per Phase 1 outcomes):**
4. Author + ship **MB-T-HSO-WIRE** new ticket. Scope contingent on Q-OR-1/Q-OR-2:
   - If Q-OR-1 = PTY-replaces-API: scope includes v3.0 path removal + dispatchActionVariant wiring + pool/harvester/writer instantiation. Estimated 12-16 WBs.
   - If Q-OR-1 = PTY-alongside-API: scope is purely additive HSO wiring; v3.0 path untouched. Estimated 8-12 WBs.
   - If Q-OR-2 = manual-spawn-only: pool auto-spawn omitted; only dispatchActionVariant + harvester + writer wired. Estimated 6-10 WBs.

**Phase 3 (dogfood session, may be parallel-CC-coordinated):**
5. Resume dogfood Phase B (UI render verification under wired HSO + auth fix)
6. Dogfood Phase C (manual orchestrator spawn or pool auto-spawn per Q-OR-2)
7. Dogfood Phase D (60-min sustained loop measurement) → Q-V35-7(a) closure → v3.5-alpha gate

### §6.2 — Independent tracks (parallel-able with critical path)

| Track | Scope | Files touched | Parallel-CC viable? |
|---|---|---|---|
| §C.1′ ticket #2 (Frame C surface) | New `frame-c/` directory; consumes TileGridSessionEntry[] from MB-T12 store; selection state in shell-mode store | New dir + `tile-grid-app.tsx` integration | YES — distinct from main.ts territory |
| §C.1′ ticket #4 (Compact tile mode) | Trim Tile component to compact variant when shell-mode = A | `tile.tsx` (Frame A render path) | YES |
| §C.1′ ticket #3 (Detail-pane footer actions) | Add diff/merge/focus actions to Frame C detail-pane | `frame-c/` + 3 new IPC channels | NO — depends on ticket #2 detail-pane shape |
| §C.6 BUILD.md tab | New `build-md-tab.tsx` consuming swarm-state.md via reader | `chat-shell/` + new tab module | SOFT-BLOCKED — needs SwarmStateWriter actually writing (Phase 2) |

### §6.3 — Parallel-CC opportunities per CLAUDE.md §4.3

**MB-T-HSO-WIRE + §C.1′ ticket #2 + §C.1′ ticket #4 as 3-track parallel-CC sprint:**
- Worktrees: distinct (per CLAUDE.md §4.3)
- File ownership: MB-T-HSO-WIRE touches `main.ts` (shared territory + Fix-A/B/C/89/92 zones); ticket #2 touches new `frame-c/` directory (no overlap); ticket #4 touches `tile.tsx` (no overlap).
- Coordination friction: HIGH for MB-T-HSO-WIRE (main.ts shared + sentinel-zone discipline + cross-package-rebuild discipline per CLAUDE.md §3.4); LOW for #2 + #4.
- Recommendation: serialize MB-T-HSO-WIRE; run #2 + #4 as 2-track parallel-CC after MB-T-HSO-WIRE Phase 2 ships (so dogfood Phase 3 can start immediately while UI work proceeds).
- [SPECULATIVE per CLAUDE.md memory note "Consumer non-regression per WB" — multi-track work touching adjacent surfaces benefits from per-WB consumer probes; ticket #2 + #4 should each include MB-T12 tile-grid-state regression probe per WB.]

### §6.4 — What NOT to do next

Per (b) operator instruction:

- **Do NOT author §C.1′ tickets #2/#3/#4 first while HSO sits unwired.** Frame C displays session lists; without populated swarm-state.md (writer unwired) and without per-peer summaries (harvester unwired), Frame C ships displaying nothing meaningful — worse than no Frame C.
- **Do NOT author §C.6 BUILD.md tab before MB-T-HSO-WIRE.** Tab consumes swarm-state.md; MB-T38 writer not running → file does not exist → tab renders empty.
- **Do NOT execute dogfood Phase B/C/D before MB-T-HSO-WIRE.** Q-V35-7(a) measurement requires the loop to operate; against unwired infrastructure the measurement is invalid.
- **Do NOT re-diagnose pre-existing test failures per CLAUDE.md §4.5** (`MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` Tier 2 + `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` Tier 3).
- **Do NOT modify `orchestrator.md` system prompt content as part of MB-T-HSO-WIRE wiring work.** Prompt content is operator territory per §5.1.
- **Do NOT attempt MB-T-HSO-WIRE under fatigue.** It touches shared main.ts territory + spawn-handler argv expansion + cross-EventEmitter wiring discipline. High coordination friction.

---

## §7 — Risks + open questions

### §7.1 — Q-OR-1 — v3.5 wires HSO PTY-replaces-API or HSO PTY-alongside-API?

**Finding (KNOWN per §1.2):** v3.5 PTY dispatch mechanism shipped (MB-T35-revised at `f8c679d`, MB-T37 at `38b1a03`, MB-T38 at `70674e1`, MB-T39 at `bb2698f`, MB-T40 at `5704dd2`) but unwired to workstation dispatch path. v3.0 HTTP API path remains live in `coarchitect-ipc.ts:314-543`. Two paths coexist in code; HSO mechanism layer is **isolated machinery rather than active dispatch**.

**Specific arbitration questions:**

(Q-OR-1.a) Does MB-T-HSO-WIRE (§4.3) **retain** the v3.0 API path (`coarchitect:sendAndStream` → `dispatchAction` → `defaultDispatchActionDeps`)?
- If retained: both paths coexist; operator can switch via... (no flag exists; would need additive flag scope)
- If removed: v3.0 path's consumers (`AnthropicChatClient`, `routeOrchestratorOutput`, `orchestrator-card-emitter`, `cardContextCache`, `dispatchAction`, `orchestrator-action-handler`) become candidates for removal; OR-related followups (`MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` Tier 3, `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2) move from "post-v3.5" to "during v3.5"

(Q-OR-1.b) If retained, does the operator-typed message in chat-panel route to v3.0 API path or to v3.5 PTY path? Currently: `streamingBridge.sendAndStream` is wired (per preload.mts; not directly read this session) — needs verification of which IPC channel it invokes. The PtyStreamingBridgeImpl renderer path invokes `workstation:session-send-prompt` to `__orchestrator_active`; the v3.0 path uses `coarchitect:sendAndStream`. Both IPC handlers exist; which one the production preload binds to determines the operational route.
- [MODELED gap] Plan-mode session did not read preload.mts to verify; this is a known unread surface.

(Q-OR-1.c) Cost model: v3.0 path is ANTHROPIC_API_KEY token-billed; HSO PTY path is Max-plan keychain (subscription absorbs orchestrator runtime). Operator decision affects cost ledger semantics + CostMeter data-path (per `MB-F-A2C-*` Tier 3).

**Plan-mode session does not pre-resolve.** Operator territory per project instructions §3.4 + §3.7 + Q-Final disposition (α).

**Downstream ticket gating:**
- MB-T-HSO-WIRE scope (8-12 WBs additive vs 12-16 WBs replacement)
- `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` closure timing (during-v3.5 vs post-v3.5)
- `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` closure timing (during-v3.5 vs post-v3.5)
- §C.1′ tickets #2/#3/#4 ship-gate (whether v3.5 ships chrome alongside HSO autonomy or behind it)

### §7.2 — Q-OR-2 — HSO pool auto-spawn vs manual operator tmux spawn intended pattern?

**Finding (KNOWN per §1.3 + dogfood doc Phase C cmd line 102):** Dogfood doc operational pattern uses operator manual `tmux new-session ... claude --append-system-prompt "$(cat .../orchestrator.md)"` to start `__orchestrator_active`. HSO BUILD doc §3.3 + MB-T37 code (`hso-pool.ts:114-156`) describes auto-spawn at workstation startup. These are operationally distinct patterns.

**Specific arbitration questions:**

(Q-OR-2.a) Is the manual-spawn pattern (dogfood Phase C cmd) the **intended** operational pattern for v3.5, or a **bridge** pattern pending pool wiring?
- If intended: OrchestratorPoolManager wiring becomes optional or out-of-scope; "HSO unwired" is a feature, not a gap.
- If bridge: MB-T-HSO-WIRE includes pool auto-spawn; operator no longer manually spawns; potential collision avoidance needed (probe-C-06).

(Q-OR-2.b) If pool auto-spawn is in scope, when does it activate?
- At workstation startup (HSO BUILD doc §3.3 implies this)
- Behind a configuration flag (per-operator opt-in)
- On first chat-panel input (lazy)

(Q-OR-2.c) If pool auto-spawn is in scope, how is `--append-system-prompt <orchestrator.md path>` injected into spawn argv?
- Current `spawn-handler.ts` does not pass `--append-system-prompt` argv. Pool's `_spawnAndRegister` would need to extend SpawnSessionRequest with argv-extension fields, OR inject prompt path via env var, OR have the pool maintain its own spawn-controller-with-prompt-extension.
- This is wiring-scope territory but warrants operator awareness because it touches a frozen-ish surface (spawn-handler accepts `{repoPath, sessionName, permissionMode}` per current SpawnSessionRequest interface).

**Plan-mode session does not pre-resolve.** Operator territory per project instructions §3.4.

**Downstream ticket gating:**
- MB-T-HSO-WIRE scope (pool wiring in/out; spawn-argv-extension scope)
- probe-C-06 (active-standby-no-conflict-with-manual-spawn) authoring necessity
- Dogfood Phase C/D operational protocol

### §7.3 — Risks (likelihood + impact)

[SPECULATIVE — risk likelihoods]

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wiring MB-T37/T38/T39 surfaces integration issues unit tests didn't catch | Medium | High — could extend MB-T-HSO-WIRE 50-100% beyond estimate | Per CLAUDE.md §4.6: runtime-launch smoke verification mandatory before MB-T-HSO-WIRE merge; MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE applies. Per (CLAUDE.md memory) "Consumer non-regression per WB": run consumer probes at every WB. |
| Tier 4 buildTier4Payload races with PeerSummaryHarvester writes | Medium | Medium — could produce inconsistent orchestrator context | Pre-wire spike: verify Tier 4 fan-out semantics under harvester emission |
| addStdoutObserver fan-out ordering between wirePtyRelay + tile-token-scraper + new pool subscriber | Low | Medium — could miss chunks or double-process | Subscribers are non-redirecting per `hso-pool.ts:5-9` comment; ordering invariants documented per MB-T37 ConsoleIpcController contract |
| tmux session-name collision: pool spawns `__orchestrator_active` while operator manual-spawn coexists | Medium (if Q-OR-2 = both patterns coexist) | High — orphaned daemon registration | probe-C-06 + halt-and-surface in pool's `_spawnAndRegister` on `SessionAlreadyRegistered` daemon 409 |
| v3.0 + v3.5 paths fire same action twice (if Q-OR-1 = both retained without flag) | Medium-High | High — duplicate spawns / kills / sends | Mutual exclusion: chat-panel `streamingBridge.sendAndStream` must invoke exactly one IPC; operator decision Q-OR-1.b binds this |
| MB-T41 prompt content has gaps not surfaced by SPIKE-HSO-01 + 02 | Low (spike was thorough) | High — orchestrator emits malformed actions or skips HALT discipline | Operator content review per §5.1; Tier 1 followup if discovered post-wire |
| PlanRing + CostMeter go silent under HSO PTY path | High (if Q-OR-1 = remove or flag-default-PTY) | Medium | `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2 + `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` Tier 3 — closure paths exist, scoped post-v3.5 |
| Frame C surface ships displaying empty session list (if §C.1′ #2 ships before MB-T-HSO-WIRE) | High | Medium — UI looks broken in operator demos | Per §6.4: do NOT author #2/#3/#4 before MB-T-HSO-WIRE |
| Dogfood Phase B blocked by `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` | High (already observed Gate 5) | High — gates v3.5-alpha measurement | §5.3 operator-arbitration |
| MB-F-DOGFOOD-LONG-PAUSE-PROCESS-LIVENESS recurs at next dogfood resume | Medium | Low (caught fast) | Dispatch template amendment per dogfood findings §5 closure path |

### §7.4 — MODELED claims that should be promoted to KNOWN before MB-T-HSO-WIRE

Per §0.2 discipline:

- [MODELED] swarm-state.md does not exist in the repo currently — should verify by `ls docs/swarm-state.md` before MB-T-HSO-WIRE writer wiring. (Plan-mode did not check.)
- [MODELED] preload.mts binds chat-panel `streamingBridge.sendAndStream` to either `coarchitect:sendAndStream` (v3.0 path) or `workstation:session-send-prompt` (v3.5 PTY path). Plan-mode did not directly read preload.mts; this is the load-bearing fact for Q-OR-1.b. Should be promoted to KNOWN via direct preload.mts read before Q-OR-1 arbitration.
- [MODELED] `pty-streaming-bridge.ts` `PtyStreamingBridgeImpl` is mounted in chat-shell `mount.ts` in production (vs only used in tests). Plan-mode did not verify chat-shell `mount.ts` content.
- [MODELED] HSO BUILD doc Q-V35-7(a) thresholds (60-min, ≥80% action-variant correctness) reflect current operator intent. Plan-mode treats §A.4.R ratification text as authoritative; not re-confirmed in-session.

These should be verified at MB-T-HSO-WIRE Phase 1 (operator-arbitration session) start.

---

## §8 — Honest framing

Per (b) operator instruction in confirmation 3: name where v3.5 actually is, name realistic next 2-3 sessions, distinguish "needed to ship v3.5" from "needed for v3.5 to look complete to users."

### §8.1 — Where v3.5 actually is

**Mechanism-rich, wiring-poor.** [KNOWN]

Code for the autonomy layer exists at high quality:
- Probes pass per WB GREEN signals across MB-T35-revised, MB-T37, MB-T38, MB-T39
- `MB-F-MBT39-MULTI-CHUNK-FIX` shows post-merge defect-find-and-fix discipline (`9256406` red → `bb4c47c` green → `8cdd493` findings)
- D9 separate-call-stack discipline for SwarmStateWriter (writeSwarmState vs writeHandoffDoc) is preserved in code per swarm-state-writer.ts:200-236
- TURN_INCOMPLETE binary protocol in PeerSummaryHarvester per peer-summary-harvester.ts:204-211 (first-chunk fast-path) preserves SPIKE-HSO-01 scenario 2 evidence
- Atomic write pattern (writeFileSync + renameSync) in swarm-state-writer.ts:410-414 prevents partial-write race
- Per-substrate regex stability confirmed in §C.5 spike (`ef2dd3d`) and consumed in tile-token-scraper.ts (`63f9b03` + `13b7607`)
- Frame Router shipped at `44764fd` with 18/18 probes green per c1r findings doc

But the autonomy layer is not connected to the production main process:
- No OrchestratorPoolManager instance → no auto-spawn of active+standby
- No PeerSummaryHarvester instance → no auto-summary prompts to peers
- No SwarmStateWriter instance → no swarm-state.md continuous write
- No production caller of dispatchActionVariant → ACTION markers display only, do not fire
- `__orchestrator_active` session spawned by operator via direct tmux command (dogfood Phase C cmd) — not by workstation auto-spawn
- v3.0 API-orchestrator path remains operational alongside (uses ANTHROPIC_API_KEY + Anthropic API tokens per turn)

**The chat panel works as an interactive operator-driven console for `__orchestrator_active`.** The orchestrator's actions don't autonomously fire from PTY emissions; they fire only via the v3.0 API path's JSON action variants.

This is not a defect of the mechanism work — the code is sound. It is a wiring gap that no ticket explicitly owned. §F.3 sequencing assumed wiring would happen "as part of" the Wave 1+2 tickets; §5 ticket bodies described only the pure-module mechanism scope. Both are defensible; the gap is the integration ticket nobody authored.

### §8.2 — Realistic next 2-3 sessions

**Session 1 — Operator-arbitration + MB-T-HSO-WIRE authoring:**
- Resolve Q-OR-1 + Q-OR-2 (§7.1 + §7.2)
- Resolve `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` closure path (§5.3)
- Promote 4 MODELED claims to KNOWN per §7.4 (verify preload.mts, mount.ts, swarm-state.md absence)
- Author MB-T-HSO-WIRE ticket body (operator-arbitrated; scope contingent on Q-OR-1/Q-OR-2)

**Session 2 — MB-T-HSO-WIRE execution:**
- Single CC session, 8-16 WBs depending on scope
- Per CLAUDE.md §4.6: runtime-launch smoke per WB touching main.ts
- Per CLAUDE.md §3.4: dispatch-core dist rebuild discipline if any cross-package schema changes
- Per CLAUDE.md memory: consumer non-regression probes per WB (MB-T12 tile-grid, MB-T16/T17 IPC, §C.5 token meter)
- Final verification: 5-package typecheck one command at a time
- Author 5 BLOCKED-ON probes from §3 author-able-after-this-ticket (A-01, B-01, B-03, C-01, C-02)

**Session 3 — Dogfood Phase B+C+D against wired HSO:**
- Phase B: kanban + chat-shell + console panel render against fixed auth
- Phase C: HSO pool auto-spawn (or manual orchestrator spawn per Q-OR-2) → orchestrator drives 2-3 peers
- Phase D: 60-min sustained loop measurement → Q-V35-7(a) closure → v3.5-alpha gate
- Possible ladder into 120-min for Q-V35-7(b) → v3.5.1 ship-confidence

After Session 3 success, parallel-CC sprint of §C.1′ tickets #2 + #4 (and then #3) becomes appropriate. §C.6 BUILD.md tab becomes appropriate after §C.1′ #2 ships.

### §8.3 — Needed to ship v3.5 (per §A.4.R two-gate split)

**v3.5-alpha gate (HSO infrastructure works):**
- ☑ Code shipped: MB-T35-revised, MB-T37, MB-T38, MB-T39, MB-T40, MB-T41
- ☐ Wiring shipped: MB-T-HSO-WIRE (NEW TICKET)
- ☐ Q-V35-7(a) 60-min dogfood passed
- ☐ `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` closed (or workaround verified)

**v3.5 gate (HSO + audit-track chrome):**
- ☑ v3.5-alpha
- ☑ §B.1 + §B.2 cosmetic closures
- ☑ §C.5 PTY token meter
- ☑ §C.1′ ticket #1 (Frame router + §A.3 (2) header-bar slot)
- ☐ §C.1′ tickets #2 + #3 + #4

**v3.5.1 ship-confidence gate:**
- ☑ v3.5
- ☐ Q-V35-7(b) 120-min sustained dogfood passed
- ☐ §C.6 BUILD.md tab (depends on SwarmStateWriter actually writing — gated on MB-T-HSO-WIRE)

### §8.4 — Needed for v3.5 to "look complete" to users

These are not strict ship-gate criteria but matter for operator demos + user perception:

- **Frame C list+detail surface** (§C.1′ ticket #2) — wireframe-author primary mode per `wireframes.jsx:570-571`. Three-region default may feel partial-ship without it.
- **swarm-state.md actually populated** — without harvester + writer wired, the file doesn't exist. Operator can't show "look, the swarm is doing X" without it.
- **PlanRing + CostMeter showing real data under HSO mode** — `MB-F-A3` + `MB-F-A2C` closures. Without these, both meters go silent if Q-OR-1 = remove-v3.0-path.
- **BUILD.md tab in Conductor panel** (§C.6) — not in v3.5 ship-gate but strongly anticipated by wireframe `:312-325`. Without it, the Conductor panel feels "missing the third tab."
- **External session death reconciliation** (`MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` Tier 2, deferred to v3.6 per audit) — currently tiles persist after external session death. Cosmetic but caught quickly under sustained dogfood.
- **MixIndicator showing real model field** (`MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN` + `MB-F-T27-KILL-EVENT-PROPAGATION` Tier 2) — currently chips render at 0. Visible-but-meaningless without closure. Per §C.1′ ticket #2 bundling per Q-C1R-1=(b).

### §8.5 — What should NOT be attempted under fatigue

- **MB-T-HSO-WIRE without surfacing Q-OR-1/Q-OR-2 first.** Wiring touches main.ts (shared territory + multiple Fix-* zones); could collide with v3.0 path active simultaneously; could break operator's manual-spawn pattern silently if Q-OR-2 = bridge-only.
- **Authoring §C.1′ tickets #2/#3/#4 before MB-T-HSO-WIRE wiring direction decided.** Frame C consumes session lists that depend on what's actually populated; ship before wire risks empty-display ship.
- **v3.5.1 §C.6 BUILD.md tab without MB-T38 actually writing.** Tab will render empty.
- **Re-diagnosing pre-existing test failures per CLAUDE.md §4.5.**
- **Dogfood Phase B/C/D without Phase A re-verification per `MB-F-DOGFOOD-LONG-PAUSE-PROCESS-LIVENESS` closure path** (process liveness check at resume).
- **Modifying `orchestrator.md` system prompt content as part of MB-T-HSO-WIRE.** Operator territory per §5.1.
- **Bundling MB-T-HSO-WIRE + chrome-track work into a single session.** High coordination friction; per §6.3, serialize.

---

## §9 — Summary table

| Dimension | Today (zero new tickets) | After MB-T-HSO-WIRE | After MB-T-HSO-WIRE + dogfood |
|---|---|---|---|
| **A: Spawning** | UI spawn ✓; manual `__orchestrator_active` tmux spawn ✓; v3.0 API spawn-action ✓; HSO PTY spawn-action ✗; pool auto-spawn ✗ | All paths ✓ (auto-spawn per Q-OR-2) | Confirmed under sustained load |
| **B: Build-driving** | Chat display ✓; v3.0 API drives peers ✓; PTY action dispatch ✗; auto-summary ✗; swarm-state.md ✗ | All paths ✓ | TDD-cycle on peer measured (≥80% per Q-V35-7(a)) |
| **C: Parallel** | Human-coordinated ✓; multi-peer tmux ✓; HSO automated ✗ | HSO automated parallel ✓ | 60-min sustained measured (Q-V35-7(a)) → 120-min (Q-V35-7(b)) |

[KNOWN] Today: **mechanism shipped + wiring missing + evidence absent**. Three operational dimensions are partially-operational via the legacy v3.0 API path; the v3.5 HSO autonomy loop is isolated machinery, not active dispatch.

---

## §10 — Document metadata

- **Total length target:** ~1000-1100 lines per Q4 strategic-density
- **Citation count:** ~50+ commit SHAs + file:line refs throughout
- **Confidence labels applied:** ~80+ KNOWN / ~15+ MODELED / ~10+ SPECULATIVE
- **Open arbitration items surfaced:** Q-OR-1 (5.4), Q-OR-2 (with 3 sub-questions), §A.4.R re-arbitration (§5.2), `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` closure (§5.3), §F.3 vs §5 divergence (§4.3)
- **New tickets proposed:** MB-T-HSO-WIRE (§4.3) — operator-arbitrated scope contingent on Q-OR-1/Q-OR-2
- **MODELED claims flagged for KNOWN-promotion before MB-T-HSO-WIRE:** §7.4 (4 items)

**Anti-fabrication discipline (CLAUDE.md §2.1 + §3.5):** every factual claim about repo state at HEAD `7dfa6f2` is KNOWN per direct read this session. Every claim about post-audit plan / BUILD doc / audit / spike / dogfood content is KNOWN per direct read of those docs. Claims about operator intent, future ship dates, parallel-CC compression, dogfood pass rates are MODELED or SPECULATIVE per label discipline. Per (a) operator instruction: MODELED claims in source docs were preserved as MODELED; not promoted to KNOWN unless direct code read confirmed them.

**End of v3.5 operational readiness assessment.**

Operator next-session action items:
1. Resolve Q-OR-1 (§7.1) — v3.5 HSO PTY path retain-v3.0-API or replace-v3.0-API
2. Resolve Q-OR-2 (§7.2) — HSO pool auto-spawn or manual operator spawn intended pattern
3. Resolve `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` closure path (§5.3)
4. Promote 4 MODELED claims to KNOWN per §7.4 (verify preload.mts, mount.ts wiring, swarm-state.md absence, §A.4.R operator intent)
5. Author MB-T-HSO-WIRE ticket body with scope contingent on (1) + (2)
6. Decide whether §A.4.R checklist row "ticket merged" is satisfied by code-shipped status or requires wiring (§5.2)

Once (1)-(6) resolve, MB-T-HSO-WIRE execution → dogfood → v3.5-alpha → v3.5 → v3.5.1 sequence per §6.1.
