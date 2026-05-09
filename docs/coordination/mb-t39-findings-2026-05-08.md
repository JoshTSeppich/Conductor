# MB-T39 Findings — Peer Summary Harvester

**Date:** 2026-05-08
**Session shape:** TICKET — Terminal Y, Wave 2 parallel-cairn with MB-T37 (Terminal X)
**Base SHA:** 9bd82c1 (Wave 1 closure / origin/main HEAD at dispatch authoring)
**RED commit:** 1aee5cb
**GREEN commit:** bb2698f
**WB3:** Skipped (operator-authorized — implementation clean; same disposition as Terminal X)
**Docs commit:** (this commit)

---

## I. Shipped infrastructure

### PeerSummaryHarvester module

**File:** `packages/dispatch-workstation/src/coarchitect/peer-summary-harvester.ts`

| Export | Lines | Purpose |
|---|---|---|
| `IConsoleBroadcaster` | 34–41 | Terminal X tap interface (addStdoutObserver) |
| `IPromptInjector` | 43–52 | MB-T09 surface (handleSendPrompt) |
| `PeerSummaryHarvesterDeps` | 55–68 | Constructor dep bag |
| `PeerSummaryHarvester` (class) | 113–328 | Main harvester |
| `start()` | 135–139 | Subscribes to broadcaster, installs observer |
| `dispose()` | 141–152 | Removes observer, clears all per-peer timers |
| `_onPtyChunk()` | 174–193 | Debounced quiescence + AWAITING_RESPONSE parse |
| `_onQuiescence()` | 195–220 | Sends summary prompt, starts timeout timer |
| `_parseResponse()` | 221–259 | TURN_INCOMPLETE / YAML parse / error dispatch |
| `_validateSummary()` | 261–318 | Field validation + snake_case→camelCase translation |
| `_emitError()` | 319–325 | Emits `error:recorded` with ISO timestamp |

**Test file:** `packages/dispatch-workstation/test/unit/coarchitect/peer-summary-harvester.spec.ts`

---

## II. Probe distribution — 9/9 GREEN at bb2698f

| Probe | Coverage | State transition |
|---|---|---|
| 01 | Quiescence detection — chunk resets debounce timer; silence past threshold fires summary prompt | IDLE → (timer) → AWAITING_RESPONSE |
| 02 | Summary prompt fire — correct sessionName + summaryPromptText to IPromptInjector | → AWAITING_RESPONSE |
| 03 | TURN_INCOMPLETE response — peer:turn-complete NOT emitted; state recovers to IDLE via quiescence | AWAITING_RESPONSE → IDLE |
| 04 | Valid §7 YAML — field validation + snake_case→camelCase translation; peer:turn-complete payload exact-match | AWAITING_RESPONSE → IDLE |
| 05 | Invalid/drifted YAML — non-YAML prose (sub-case a) + missing required field (sub-case b) → error:recorded | AWAITING_RESPONSE → IDLE |
| 06 | Orchestrator exclusion — `__orchestrator_active` + `__orchestrator_standby` never receive summary prompt | IDLE stays IDLE |
| 07 | Concurrent harvest lock — second quiescence fires while AWAITING_RESPONSE → only one prompt sent | AWAITING_RESPONSE unchanged |
| 08 | Multi-peer parallel — 3 simultaneous quiescences → 3 prompts + 3 peer:turn-complete events, independent state machines | 3× parallel IDLE→AWAITING_RESPONSE→IDLE |
| 09 | TIMEOUT path — awaitingResponseTimeoutMs elapses with no response → error:recorded; state recovers to IDLE; subsequent quiescence re-fires | AWAITING_RESPONSE → IDLE + error:recorded |

---

## III. IConsoleBroadcaster mock interface and Terminal X compatibility

**Mock interface encoded in RED at SHA 1aee5cb:**
```typescript
interface IConsoleBroadcaster {
  addStdoutObserver(
    observerFn: (sessionName: string, chunk: string) => void
  ): () => void;  // returns disposer
}
```

**Verification at HALT-STAGING-FOR-X clearance (anti-fabrication §3.1):**
Direct read of `packages/dispatch-workstation/src/main/console-ipc.ts` at Terminal X's WB2
GREEN SHA `38b1a03`. Confirmed:

- Method name: `addStdoutObserver` — matches
- Signature: `(fn: (sessionName: string, chunk: string) => void): () => void` — matches exactly
- Implementation (lines 169-172): `stdoutObservers.add(fn)`; disposer returns `() => { stdoutObservers.delete(fn) }`
- Fan-out position: `console-ipc.ts:356` — `for (const obs of this.stdoutObservers) obs(sessionName, bytes)` fires AFTER `emitToWebview` (non-redirecting)

**No divergence between coordination note and actual file.** Structural compatibility confirmed
via direct source read, not from coordination note alone. Anti-fabrication §3.1 discipline applied.

**Production wiring pattern:**
```typescript
const harvester = new PeerSummaryHarvester({
  ptyBroadcaster: consoleIpcController,  // implements IConsoleBroadcaster
  promptInjector: sessionSendPromptController,  // implements IPromptInjector
  stateEmitter: sharedEmitter,
  ...
});
harvester.start();
```

`ConsoleIpcController` at `38b1a03` satisfies `IConsoleBroadcaster` structurally — no cast needed.

---

## IV. Schema translation implementation

### snake_case→camelCase boundary (ratified HALT 0 PF4)

| YAML field (§7) | PeerTurnCompletePayload field | Notes |
|---|---|---|
| `peer_session` | `sessionName` | Observer's sessionName is used (authoritative); YAML `peer_session` validated as required but value not cross-checked |
| `task` | `task` | Identity |
| `files_touched` | `filesTouched` | Array of strings; `[]` valid (empty list) |
| `result` | `result` | Identity |
| `completion_status` | `completionStatus` | Union: `complete \| TURN_INCOMPLETE \| error` |
| `no_follow_up` | `noFollowUp` | Boolean; js-yaml parses `true`/`false` correctly |
| `follow_up_action` | `followUpAction` | Optional; omitted from payload when absent in YAML |

### Validation sequence (`_validateSummary`)

1. All 6 required fields present (returns error if any missing)
2. No unexpected fields (schema drift → error if any key outside known set)
3. Type validation per field (string / string[] / boolean / union-string)
4. camelCase translation → `PeerTurnCompletePayload`

**Imports:** `CompletionStatus` and `PeerTurnCompletePayload` imported from
`./swarm-state-writer.js` (same package, same `src/coarchitect/` directory). No
cross-package dependency added.

### js-yaml dep (no gap — contrast with MB-F-MBT35R-C)

`js-yaml` confirmed in `packages/dispatch-workstation/package.json` `dependencies` at
`"js-yaml": "^4.1.1"`. Import pattern `import jsYaml from 'js-yaml'` confirmed at
`src/coarchitect/build-doc-validator.ts:1`. `@types/js-yaml` in devDependencies. No new
dep introduced. No `F-MBT35R-C zod-in-workstation`-style gap to surface.

---

## V. State machine + TIMEOUT mechanism

### Per-peer state machine (Q-MBT39-3 ratified)

```
IDLE
  ↓ chunk arrives → debounce timer reset (setTimeout QUIESCENCE_MS)
  ↓ timer fires → _onQuiescence()
AWAITING_RESPONSE + timeout timer running (setTimeout TIMEOUT_MS)
  ↓ chunk arrives in AWAITING_RESPONSE → _parseResponse()
    ├── text.trim() === 'TURN_INCOMPLETE' → cancel timeout → IDLE (Probe 03)
    ├── valid §7 YAML → cancel timeout → emit peer:turn-complete → IDLE (Probe 04)
    └── invalid / schema-drift → cancel timeout → emit error:recorded → IDLE (Probe 05)
  ↓ timeout fires (no response arrived within TIMEOUT_MS) → emit error:recorded → IDLE (Probe 09)
```

**Concurrent lock (Q-MBT39-5, Probe 07):** `_onQuiescence` checks `if (peer.state !== 'IDLE') return`
immediately. Second quiescence firing while in `AWAITING_RESPONSE` is a no-op — the timeout timer
cancels itself naturally; the state machine stays in `AWAITING_RESPONSE`.

**Timer debounce:** every chunk arrival (any state) clears and resets the quiescence `setTimeout`.
This means the TURN_INCOMPLETE chunk itself resets the quiescence timer → after returning to IDLE,
the timer fires again in `QUIESCENCE_MS` (Probe 03 assert: `toHaveBeenCalledTimes(2)`).

**TIMEOUT parameters:**
- Default: `awaitingResponseTimeoutMs = 30000ms` per HALT 1 ratification
- Configurable: constructor dep bag per Q-MBT39-2=(c) configurable-with-default pattern
- Error message contains `'timeout'` substring (Probe 09 asserts `/timeout/i`)

**Quiescence threshold:**
- Default: `quiescenceThresholdMs = 3000ms` per Q-MBT39-2=(c)
- Tests use `QUIESCENCE_MS = 100` for fast execution

---

## VI. Q-gate dispositions (ratified HALT 0)

| Gate | Disposition | Encoded at |
|---|---|---|
| Q-MBT39-1 (summary prompt text) | Inert prose `[SYSTEM-METADATA]` marker; no parser extension; SPIKE-HSO-01 scenario 2 evidence supports prose-only | `DEFAULT_SUMMARY_PROMPT` const + `summaryPromptText` constructor dep |
| Q-MBT39-2 (quiescence threshold) | (c) configurable constructor param, default 3000ms | `quiescenceThresholdMs?: number = 3000` |
| Q-MBT39-3 (concurrent lock + state machine) | IDLE→AWAITING_RESPONSE→IDLE state machine; TIMEOUT path ratified at HALT 1 (30000ms) | `_onPtyChunk` + `_onQuiescence` + `_parseResponse` |
| Q-MBT39-4 (orchestrator exclusion) | `^__orchestrator_` regex; set at construction; pool transitions don't change filter | `orchestratorNamePattern?: RegExp = /^__orchestrator_/` |
| Q-MBT39-5 (multi-peer parallel) | Per-peer `Map<string, PeerEntry>` with independent timers; concurrent emissions safe per Wave 1 atomic-write | `peers = new Map<string, PeerEntry>()` |
| Q-MBT39-6 (schema validation drift) | (b) reject + emit `error:recorded`; do NOT silently accept drift | `_validateSummary` + `_parseResponse` error path |

---

## VII. Cross-session coordination outcomes

**Per-path git add discipline:** held across all 3 commits.

| Commit | Files staged | Terminal X files in staged set |
|---|---|---|
| 1aee5cb (WB1 RED) | `peer-summary-harvester.ts` (new) + `peer-summary-harvester.spec.ts` (new) — 2 files | NO |
| bb2698f (WB2 GREEN) | `peer-summary-harvester.ts` (modified) — 1 file | NO |
| docs commit | `mb-t39-findings-2026-05-08.md` (new) + `docs/FOLLOWUPS.md` (modified) — 2 files | NO |

**Terminal X in-flight observation at WB1 pre-commit:**
`git status --short` before WB1 RED commit showed `?? packages/dispatch-workstation/src/coarchitect/hso-pool.ts`
(Terminal X's WB1 RED file, untracked). Left unstaged. Terminal Y staged set unaffected.

**HALT-STAGING-FOR-X:** held literally per §3.7 discipline. No reads, no prep, no file inventories
during halt window. Halt cleared by operator cross-session coordination note confirming
Terminal X WB2 GREEN SHA `38b1a03`.

**Anti-fabrication verify at HALT-STAGING-FOR-X clearance:** operator coordination note
claimed `addStdoutObserver` signature. Verified against actual `console-ipc.ts:169` at
`38b1a03` before WB2 GREEN authoring. All claims matched exactly; no divergence; no
halt-and-surface required.

**Territory boundaries throughout:**
- `orchestrator.md` — READ-only
- `dispatch-core/src/v3/schema.ts` — READ-only
- `CONDUCTOR_API_CONTRACT.md` — READ-only
- `console-ipc.ts`, `hso-pool.ts` (Terminal X files) — never staged

**Reserved name pattern cross-session alignment:**
Both Terminal X (`hso-pool.ts`) and Terminal Y (`peer-summary-harvester.ts`) encode
`/^__orchestrator_/` as the exclusion pattern. Pattern consistent; sessions independently
ratified identical regex at HALT 0. No drift.

---

## VIII. Deviations from BUILD doc §5

**BUILD doc §5 MB-T39 scope:** matches dispatch §1 and implementation.

**Elaborations vs BUILD doc (not contradictions):**

1. **TIMEOUT path:** BUILD doc does not mention `awaitingResponseTimeoutMs`. HALT 1 ratification
   added this as a constructor parameter (30000ms default). Q-MBT39-3 state machine is an
   elaboration of "per-peer quiescence" not described at BUILD doc resolution level.

2. **snake_case→camelCase translation:** BUILD doc says "validate TURN_INCOMPLETE vs summary,
   hands valid summaries to swarm-state-writer." Translation boundary (PF4, HALT 0) was an
   implementation-level finding not explicitly in the BUILD doc.

3. **`peer_session` authoritative source:** Observer's `sessionName` used for
   `PeerTurnCompletePayload.sessionName` instead of YAML `peer_session` value. Not in BUILD
   doc scope; by-design decision noted in implementation header.

4. **Single-chunk response model:** BUILD doc says "captures peer response from PTY stream"
   without specifying multi-chunk accumulation. Implementation treats each chunk as a complete
   response candidate. Multi-chunk scenarios filed as MB-F-MBT39-MULTI-CHUNK-RESPONSE-ACCUMULATION
   (Tier 2).

**No deviations from BUILD doc §5 scope lines.** All four items above are elaborations or
implementation-level decisions within the specified scope.

---

## IX. Findings filed

| ID | Tier | Description |
|---|---|---|
| `MB-F-MBT39-MULTI-CHUNK-RESPONSE-ACCUMULATION` | Tier 2 | Single-chunk response model; multi-chunk streaming is default LLM PTY behavior |
| `MB-F-MBT39-BASE64-CHUNK-PASSTHROUGH` | Tier 3 | Observer receives raw bytes without encoding field; base64 chunks not decoded |
| `MB-F-MBT39-PEER-SESSION-NAME-CROSS-CHECK` | Tier 3 | YAML peer_session not cross-checked against observer sessionName; by-design |

**No existing followups closed by MB-T39.** (No targeted closure in MB-T39 scope per BUILD doc.)
