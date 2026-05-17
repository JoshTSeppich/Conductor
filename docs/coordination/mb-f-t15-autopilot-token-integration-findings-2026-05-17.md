# MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION — RESOLVED-BY-EQUIVALENCE findings

**Session**: `r12-cw2-t15-autopilot-token-integration` (Round 12 R12-CLOSURE-Wave-2; V4 12-cap high-concurrency cascade; gen-7 dispatched 2026-05-17)
**Closure path**: (α) RESOLVED-BY-EQUIVALENCE — gen-7 arbitration approved 2026-05-17 ~12:00 MDT
**Outcome class** (per CLAUDE.md §2.11): **No improvement + structural finding** — no code shipped this session; the structural finding is that the closure-target user-visible-symptom was already delivered via §C.5 PTY-scrape mechanism (`13b7607` + `63f9b03`) 7 days before this session's dispatch, via a different data-source identity than the row body anticipated.
**Commits authored this session**: 1 (WB-final docs + FOLLOWUPS stamp + new Tier-3 row filing)

---

## §I — Closure-target row verbatim

`docs/FOLLOWUPS.md:189` row body (pre-stamp) [KNOWN per direct read 2026-05-17]:

> MB-T15 WB3 + WB4 ship the token meter UI surface with stubbed data (Q-MBT15-2=a: `tokensUsed=0`, `tokenBudget=200_000` defaults). Real data source lands with autopilot loop telemetry (sess-mbt11 WB6 + future MB-T17 successor): per-session token tracking via NEW field on the autopilot-state-store OR a separate per-session-cost-info module. The TileGridSessionEntry already accepts `tokensUsed?` + `tokenBudget?` plumb-through; closure path is wiring the autopilot telemetry → TileGridApp `useEffect` subscription → `setSessions` updates per-session token fields. Optionally: per-model `tokenBudget` lookup (Sonnet 4.6 = 200k, Opus 4.7·1M = 1M, Haiku 4.5 = 200k) in `color-helpers.ts` so the meter scales correctly when model varies. Tier 2 — meter visual ships correctly; data is fake until autopilot wires it.

**Row filed**: `14bae97` (2026-05-11; `docs(MB-T15): WB5 — findings doc + followups`).

---

## §II — Phase-1 diagnose: closure-mechanism unreachable + symptom already shipped

Phase-1 diagnose (plugin agent `a0435fdb2d35f5a8d` 2026-05-17) returned 35-tool-call surface inventory + Q1-Q7 answers + 4 arbitration questions + 5 risks. Following operator SUBAGENT-RATIONED protocol 2026-05-17 ~11:58 MDT, subsequent ≤2-WB sessions skip the retrofit agent in favor of direct Read — but for this session the agent had already run and its findings remain load-bearing.

### §II.A — Autopilot loop emits zero token telemetry [KNOWN]

Direct Read of all three autopilot-side files confirms zero token tracking:

| File | Surface | Token references? |
|---|---|---|
| `packages/dispatch-workstation/src/main/autopilot-loop.ts:109-248` | `class AutopilotLoop` — methods: `setEnabled`, `isEnabled`, `startIntent`, `recordAction`, `getPendingIntents`, `getLastActionFiredAt`, `clearIntent`, `resetSession` | NONE |
| `packages/dispatch-workstation/src/main/autopilot-state-store.ts:49-56` | `interface AutopilotState` — fields: `enabled`, `currentIntentId`, `currentStep`, `totalSteps`, `lastActionFiredAt`, `pendingIntents` | NONE (no `tokensUsed` / `tokenBudget`) |
| `packages/dispatch-workstation/src/main/autopilot-ipc.ts:104-155` | `AutopilotIpcController` — channels: `workstation:autopilot-get`, `workstation:autopilot-put` | One hit — a code comment `"NO readToken"` confirming the **absence** of token IPC |

Grep `-i token` across all three files returns one match: the negative-confirmation comment in autopilot-ipc.ts. **The row body's anticipated source ("autopilot telemetry") was never instrumented.**

### §II.B — TileGridSessionEntry already has the optional fields [KNOWN]

`packages/dispatch-workstation/src/tile-grid/tile-grid.tsx:40-43`:

```ts
/** Tokens consumed in the current session window (MB-T15 token meter). */
readonly tokensUsed?: number;
/** Token budget (model context window). */
readonly tokenBudget?: number;
```

Row body claim **VERIFIED**. The boot-prompt Q3 escape ("if Q3 requires schema addition, HALT-COARCH-CONSULTATION-NEEDED") is **NOT** triggered.

### §II.C — §C.5 PTY-scrape already wired the renderer-side per-session token update [KNOWN]

The closure-path text in the row body specifies "wiring the autopilot telemetry → TileGridApp `useEffect` subscription → `setSessions` updates per-session token fields". The renderer-side wire is **already live** via a different upstream:

`packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx:95-101` — `WorkstationBridgeShape.onTileTokenUpdate?` declaration:

```ts
/** §C.5: subscribes to 'workstation:tile-token-update' main-process events
 *  emitted by tile-token-scraper after per-session 500ms debounce.
 *  Optional — when undefined, token meter stays at stub default (0 tokens).
 *  Returns cleanup. */
onTileTokenUpdate?: (
  cb: (payload: { sessionName: string; tokensUsed: number }) => void,
) => () => void;
```

`packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx:326-337` — the live subscription using the canonical per-session merge pattern:

```ts
// §C.5: subscribe to per-tile PTY token-count updates from tile-token-scraper.
// Updates only tokensUsed on the matching session; does not trigger persistence
// (token count is transient display state, not layout state).
useEffect(() => {
  if (!workstationBridge.onTileTokenUpdate) return undefined;
  return workstationBridge.onTileTokenUpdate(({ sessionName, tokensUsed }) => {
    setSessions((current) =>
      current.map((s) => (s.name === sessionName ? { ...s, tokensUsed } : s)),
    );
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [workstationBridge]);
```

### §II.D — §C.5 upstream commit chain [KNOWN]

| Commit | Date | Scope |
|---|---|---|
| `63f9b03` | 2026-05-10 | `green(§C.5): WB1+WB2 — tile-token-scraper ANSI strip + debounce [RED→GREEN]` — `src/main/tile-token-scraper.ts` with `ANSI_CSI_RE` strip + `TOKEN_RE = /([0-9]+) tokens/g` (last-match-wins) + per-session 500ms debounce + 8 probes GREEN |
| `13b7607` | 2026-05-10 | `green(§C.5): WB3+WB4 — model-context-windows + TileGridApp token wiring + main.ts sentinel` — `tile-grid-app.tsx` `onTileTokenUpdate` subscription + `preload.mts` channel exposure + `main.ts §C.5` sentinel zone registers `registerTileTokenScraper` + fires `mainWindow?.webContents.send('workstation:tile-token-update', { sessionName, tokensUsed })` |

`main.ts` §C.5 sentinel zone verified at lines 65-67 (imports) + 705-719 (registration) [KNOWN].

### §II.E — Manifest territory forbids closure-path-literal [KNOWN]

`docs/coordination/territorial-manifests/r12-cw2-t15-autopilot-token-integration.txt` explicitly FORBIDS writes to `packages/dispatch-workstation/src/main/**`. The row body's literal "autopilot telemetry" source would require instrumenting `autopilot-loop.ts` or `autopilot-state-store.ts` with token-tracking state + emission — both writes are out-of-territory. The only TERRITORY-permissible NEW file is `tile-grid/autopilot-token-bridge.ts` (renderer-side), but no autopilot-side event source exists for it to subscribe to — authoring it without an upstream would create dead code (no event source) OR duplicate the live §C.5 subscription.

---

## §III — Equivalence argument

The row body's closure path consists of three sub-objectives:

1. **TileGridSessionEntry accepts `tokensUsed?` + `tokenBudget?`** — VERIFIED present (§II.B) [KNOWN].
2. **TileGridApp `useEffect` subscription updates `setSessions` per-session token fields** — VERIFIED live at `tile-grid-app.tsx:329-337` (§II.C) [KNOWN].
3. **A real data source feeds per-session token counts** — VERIFIED via `63f9b03` + `13b7607` §C.5 PTY-scrape chain (§II.D) [KNOWN].

The user-visible delivery — per-session live token counts on tile-grid headers — is **structurally shipped** by §C.5. The only divergence from the row body is the **identity of the upstream data source**: PTY-scrape (reading the CC CLI's "N tokens" status-bar render via `ANSI_CSI_RE` strip + `TOKEN_RE` extraction + 500ms debounce) instead of the row body's anticipated "autopilot loop telemetry".

**Functional equivalence** [MODELED, anchored on §C.5 spike `ef2dd3d` + 8-probe GREEN suite at `63f9b03`]: PTY-scrape captures the same fundamental measure (active CC session's reported token-consumption count) at higher fidelity than an autopilot-loop instrumentation would (autopilot only fires on `recordAction` cadence, missing operator-driven prompts; PTY-scrape captures every status-bar render).

---

## §IV — Gen-7 arbitration outcome

Gen-7 ack 2026-05-17 ~12:00 MDT: **closure path (α) RESOLVED-BY-EQUIVALENCE APPROVED.**

Rationale (verbatim from gen-7 arbitration message): "your Phase-1 diagnose evidence (13b7607 + 63f9b03 §C.5) shows the closure-target user-visible-value (per-session token meter updates via setSessions) is ALREADY DELIVERED via PTY-scrape mechanism. Per gen-6 §1.2 STAMP-LAG precedent (d6b4107 + 735703f closure-path-β) this is a legitimate equivalence-closure."

Precedent invoked: **gen-6 §1.2 STAMP-LAG-CLOSURE-PATTERN** — Round 12 archive §1.2 (per `docs/cairn-under-stress-round-12.md`) registered a NEW emergent class of methodology gap where shipped closure work fails to update FOLLOWUPS row state, requiring later orchestrator-mediated stamp. `MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT` (FOLLOWUPS:74) was the originating instance; `d6b4107` stamped row 74 + filed `MB-F-FOLLOWUPS-RESOLVED-SWEEP-DISCIPLINE` (FOLLOWUPS:372) in same commit; `735703f` operationally applied closure-path-β (orchestrator-side pre-check macro `git --no-pager log --all --grep <row-id>`). This session's MB-F-T15 case is a NEAR-ANALOG: closure-symptom shipped via different source identity than row anticipated; the row was never stamped because the shipping commit (`13b7607`) does not reference `MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION` (the followup hadn't been filed yet — `14bae97` filed it 1 day later on 2026-05-11).

---

## §V — NEW Tier-3 followup filed: MB-F-T15-AUTOPILOT-LOOP-STRUCTURED-TOKEN-TRACKING

Gen-7 directed authoring of a forward-deferred Tier-3 row capturing the *direct* autopilot-loop instrumentation that the original row body anticipated (and that PTY-scrape does NOT structurally provide):

- **PTY-scrape limitation [MODELED]**: PTY-scrape parses the *displayed* token count from the CC CLI status-bar render; it does NOT distinguish autopilot-initiated token spend from operator-driven token spend. A future tier of audit / cost-attribution (e.g., MB-T26 cost meter family) may need to discriminate the two — that would require instrumenting `AutopilotLoop.recordAction` or a sibling cost-info module to attribute token spend to specific intent_ids / pending intents.
- **Tier 3**: not user-visible-ship-blocking; v3.0 meter ships functional via PTY-scrape; structured tracking is an attribution / observability concern.
- **Closure path**: when MB-T26 cost-meter family or another downstream consumer needs per-intent attribution: extend `AutopilotState` with a `tokensSpentByIntent: Record<intent_id, number>` map + `recordAction` updates it from a passed-through `UsageInfo` (per `MB-F-T26-CACHE-TOKEN-COST-ENRICHMENT` closure or its successor); expose via `workstation:autopilot-get`. Requires §6.6 channel additivity arbitration if a new IPC channel is introduced.

---

## §VI — Risks + non-regression

| ID | Description | Disposition |
|---|---|---|
| R-MBF-T15-1 | **Stale-dispatch** — closure-target was filed pre-§C.5; the data source it imagined never landed; §C.5 closed the symptom via a different upstream. | RESOLVED-BY-EQUIVALENCE per gen-7 arbitration (§IV); this finding-doc serves as the structural record per §C.5-as-load-bearing-anchor. |
| R-MBF-T15-2 | **Manifest-territory contradiction** — literal closure-path source ("autopilot telemetry") requires forbidden `src/main/**` writes. | Closure-path text re-interpreted at "renderer-side per-session token meter via `setSessions`" granularity — manifest-internal. No territory expansion needed. |
| R-MBF-T15-3 | **Cross-source confusion** — would PTY-scrape and a hypothetical autopilot-side emitter race on `s.tokensUsed`? | NOT EXERCISED — no autopilot-side emitter exists. If MB-F-T15-AUTOPILOT-LOOP-STRUCTURED-TOKEN-TRACKING closes in the future, it should split into a distinct field (`tokensUsedByIntent`) rather than racing on `tokensUsed`. Pre-mitigation documented in this finding. |
| R-MBF-T15-4 | **Pre-existing test failures (CLAUDE.md §4.5)** could mask GREEN. | NOT EXERCISED — no tests authored this session. Existing `test/unit/tile-grid-app/probe-02-token-update.spec.tsx` covers the §C.5 wiring end-to-end (4 probes); unchanged. |
| R-MBF-T15-5 | **§C.5 probe overlap** — new `probe-mbf-t15-01/02-*.spec.tsx` per boot prompt §C would duplicate the existing §C.5 probe. | NOT EXERCISED — closure-path (α) skips new probes; the existing §C.5 probe at `test/unit/tile-grid-app/probe-02-token-update.spec.tsx` is the load-bearing test for the wired path. |

---

## §VII — Verification

**No code modified this session**. WB-final commit ships:

- `docs/coordination/mb-f-t15-autopilot-token-integration-findings-2026-05-17.md` (this file)
- `docs/coordination/mb-f-t15-autopilot-token-integration-decisions-2026-05-17.md` (gen-7 arbitration record)
- `docs/FOLLOWUPS.md` — row 189 closure stamp + NEW `MB-F-T15-AUTOPILOT-LOOP-STRUCTURED-TOKEN-TRACKING` Tier 3 row appended (operator-stamp envelope exception per shared bootstrap §F.7; manifest FORBIDS writes to FOLLOWUPS.md by default)

**Test suites**: not re-run — closure adds zero source-code changes. Existing test posture preserved.

**Typecheck**: not re-run for the same reason. CLAUDE.md §4.4 5-package typecheck mandate applies to code-changing closures; doc-only closures + FOLLOWUPS-stamp envelope are typecheck-exempt by precedent (`d6b4107` row-74 stamp commit; `735703f` closure-path-β operationalization commit — neither re-ran typecheck).

**Runtime-launch smoke**: not re-run — CLAUDE.md §4.6 trigger is `src/main/*.ts` modification; no such modification this session.

---

## §VIII — Cross-references

- FOLLOWUPS:189 (closure-target row; stamped this commit)
- FOLLOWUPS:383 (NEW Tier-3 row `MB-F-T15-AUTOPILOT-LOOP-STRUCTURED-TOKEN-TRACKING`; filed this commit)
- `13b7607` (§C.5 WB3+WB4 GREEN — renderer-side wire + main.ts sentinel + preload exposure)
- `63f9b03` (§C.5 WB1+WB2 GREEN — tile-token-scraper.ts ANSI-strip + debounce + 8-probe RED→GREEN)
- `14bae97` (closure-target row filing 2026-05-11; post-§C.5 by 1 day — the row was authored after the closure-symptom had already shipped, anticipating a different data source)
- Gen-6 §1.2 STAMP-LAG precedent: `d6b4107` (row 74 RESOLVED + row 372 filed) + `735703f` (closure-path-β operational)
- `docs/cairn-under-stress-round-12.md` §1.2 (emergent class anchor)
- Phase-1 diagnose agent: `a0435fdb2d35f5a8d` (35 tool calls; 4 arbitration Qs; 5 risks surfaced)
- Manifest: `docs/coordination/territorial-manifests/r12-cw2-t15-autopilot-token-integration.txt`
- Boot prompt: `/tmp/r12-cw2-t15-autopilot-token-integration-boot.md`
- Shared bootstrap: `/tmp/r12-cw2-shared-bootstrap.md`
- Decisions doc (companion): `docs/coordination/mb-f-t15-autopilot-token-integration-decisions-2026-05-17.md`

**MEMORY anchor applied**: `feedback_stale_dispatch_detection` — Phase-1 triangulation (git log + FOLLOWUPS row read + source file Reads of autopilot-*.ts + tile-grid-app.tsx) caught the stale-dispatch condition pre-RED; 0 dead-code commits authored. Round 12 §1.2 SWEEP-DISCIPLINE precedent applied at row-stamp granularity rather than session-RED scaffold.
