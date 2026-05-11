# Spike — chat-content-markers parser resilience under PTY chunking

**Ticket:** MB-T-HSO-WIRE WB1
**Date:** 2026-05-11
**Anchor SHA:** `28761d1` (ticket body, on origin/main)
**Parser source:** `packages/dispatch-workstation/src/coarchitect/chat-content-markers.ts`
**Parser shipped at:** `fc15a26` (`green(MB-T35-revised): WB2 — parseActionMarker + dispatchActionVariant; closes MB-F-T11A-IPC-ROUTING-ROUND-6`) — Q-WB1-2 confirms the ticket body's `f8c679d` citation as stale; correction batched into D-2 plan-doc edit window post-MB-T-HSO-WIRE per operator arbitration.
**Spike harness:** `packages/dispatch-workstation/test/spike/spike-mbthsowire-01-marker-chunking.spec.ts`

---

## I. Spike question

Does the existing `parseActionMarker` function (MB-T35-revised, shipped `fc15a26`) reliably extract `[ACTION:type]...[/ACTION]` markers from PTY stdout when the marker arrives split across multiple chunks at varying byte boundaries — or does WB7's `pty-stream-relay` marker-parse observer require a buffer-accumulator pattern mirroring MB-T39 multi-chunk-fix (`bb4c47c`, `peer-summary-harvester.ts:204-211`)?

## II. Method

Simulation-driven per operator reframe 2026-05-10. No real claude session spawn, no PTY transport. Fixtures fed directly through the actual parser via in-process function call.

**Matrix:**

- **5 fixtures** — one per `orchestrator.md §2` action variant: `send-prompt-to-session`, `spawn-session`, `kill-session`, `pull-handoff-from-session`, `assign-task`. Fixture content mirrors `test/unit/coarchitect/probe-07-action-marker-parser.spec.ts` cases P1-P5 verbatim, preserving cross-test consistency.
- **5 chunk sizes** — 1B, 16B, 64B, 1KB, one-chunk (encoded via `Number.MAX_SAFE_INTEGER`, yielding one chunk per fixture).
- **2 caller patterns:**
  - **Pattern A (control):** caller invokes `parseActionMarker(chunk)` on each chunk individually; iterates; stops at first non-null result; else returns null.
  - **Pattern B (treatment):** caller appends each chunk to a string buffer; invokes `parseActionMarker(buffer)` after each append; stops at first non-null result; else returns null.

Total Pattern A/B cells: 5 × 5 × 2 = **50**.

**3 chunking-adjacent concerns** fixtured independently:

- (i) **Multi-marker-in-buffer** — two complete markers (`kill-session` + `send-prompt-to-session`) concatenated with `\n` separator; single `parseActionMarker(buf)` call.
- (ii) **Mid-`[/ACTION]` chunk split** — 2-chunk sequence with boundary after `[/`.
- (iii) **Mid-`[ACTION:...]` chunk split** — 2-chunk sequence with boundary after `[ACT`.

**Total test cases:** 50 + 3 = **53**.

**Execution:** `pnpm --filter dispatch-workstation exec vitest run test/spike/spike-mbthsowire-01-marker-chunking.spec.ts` — 53/53 passed in 274ms.

## III. Evidence

Fixture lengths (bytes, measured at harness construction): all five fixtures fall in the range ~130-230 B; all < 1024 B. Hence 1KB chunk size and one-chunk slicing place the entire fixture in `chunk[0]`.

### Pattern A (control) — observed matrix [KNOWN per harness execution]

| Variant | 1B | 16B | 64B | 1KB | one-chunk |
|---|---|---|---|---|---|
| `send-prompt-to-session` | null | null | null | match | match |
| `spawn-session` | null | null | null | match | match |
| `kill-session` | null | null | null | match | match |
| `pull-handoff-from-session` | null | null | null | match | match |
| `assign-task` | null | null | null | match | match |

**Mechanism:** parser regex `/\[ACTION:([^\]]+)\]\n([\s\S]*?)\[\/ACTION\]/` requires both opener and closer in the SAME input string. For chunk sizes < fixture length (1B / 16B / 64B), no single chunk contains both opener and closer → all calls return null. For chunk sizes ≥ fixture length (1KB / one-chunk), one chunk holds the complete marker → caller's first parser call returns match.

### Pattern B (treatment) — observed matrix [KNOWN per harness execution]

| Variant | 1B | 16B | 64B | 1KB | one-chunk |
|---|---|---|---|---|---|
| `send-prompt-to-session` | match | match | match | match | match |
| `spawn-session` | match | match | match | match | match |
| `kill-session` | match | match | match | match | match |
| `pull-handoff-from-session` | match | match | match | match | match |
| `assign-task` | match | match | match | match | match |

**Mechanism:** accumulator buffer eventually holds the complete fixture; the parser's first match-on-complete-buffer returns the parsed marker. Latency under Pattern B = (time-to-receive-closer-chunk).

### Chunking-adjacent concerns [KNOWN per harness execution]

| Concern | Fixture | Pattern A | Pattern B | Observed evidence |
|---|---|---|---|---|
| (i) multi-marker buffer | `m1 = kill-session` + `\n` + `m2 = send-prompt-to-session` | parser returns `m1` only; `m2` invisible | same — parser is non-global; returns FIRST block | `result.actionType === 'kill-session'`; no second result without strip-and-re-parse |
| (ii) mid-`[/ACTION]` split | `kill-session` split after `[/` | null | match (after both chunks buffered) | Pattern A test asserts null; Pattern B asserts `actionType === 'kill-session'` |
| (iii) mid-`[ACTION:...]` split | `spawn-session` split after `[ACT` | null | match (after both chunks buffered) | Pattern A test asserts null; Pattern B asserts `actionType === 'spawn-session'` |

## IV. Findings

1. **Pattern A fails for all chunk sizes finer than one-chunk-per-marker.** [KNOWN per evidence] The parser regex requires both opener and closer in the SAME input string. Any WB7 caller that hands chunks to the parser without accumulation will fail to extract markers whenever PTY chunk size < marker size. Production PTY chunking is observed at single-token granularity (1B-16B typical) per MB-T39 evidence (`bb4c47c` predecessor). Pattern A is structurally insufficient for the PTY transport contract.

2. **Pattern B succeeds for all chunk sizes.** [KNOWN per evidence] Buffer accumulator lets the regex find opener+closer once the buffer holds the complete block, independent of how chunks arrived.

3. **Multi-marker bursts surface a late-marker-silent-leak risk for naive Pattern B.** [KNOWN per evidence + parser-structure analysis] The parser is non-global (`ACTION_BLOCK_RE` has no `g` flag); it returns the FIRST block only. A WB7 caller that accumulates indefinitely and parses-on-each-append will only ever extract the first marker of a burst, even when subsequent markers are fully buffered.

4. **Mid-tag chunk splits (concerns (ii) + (iii)) confirm Pattern A's structural insufficiency.** [KNOWN per evidence] Even when the chunk boundary falls inside the opener or closer literal, Pattern A returns null. Pattern B passes once both chunks are appended.

5. **Parser API surface implies stateless-caller-with-external-buffer architecture.** [KNOWN per parser source read] `parseActionMarker` is a pure function over `string`; there is NO internal accumulator. The state of "what has the orchestrator emitted so far" lives at the CALLER's scope, not the parser's. WB7 owns the buffer.

## V. Binding decision for WB7

**WB7 (`green(MB-T-HSO-WIRE): pty-stream-relay marker-parse observer + dispatchActionVariant caller wired`) MUST implement Pattern B (buffer accumulator) with strip-and-re-parse for multi-marker bursts.**

The accumulator pattern mirrors MB-T39 multi-chunk-fix at `bb4c47c` (`peer-summary-harvester.ts:204-211` responseBuffer + inner-quiescence) — same architectural shape adapted to the per-session relay observer scope.

### Required WB7 component shape

One valid implementation sketch (the spike binds the PATTERN; this is one concrete shape):

```typescript
class ActionMarkerAccumulator {
  private readonly buffers = new Map<string, string>(); // per-session

  /** Process one PTY chunk; return all markers extractable from buffer. */
  onChunk(sessionName: string, chunk: string): ParsedActionMarker[] {
    let buf = (this.buffers.get(sessionName) ?? '') + chunk;
    const matches: ParsedActionMarker[] = [];
    let parsed = parseActionMarker(buf);
    while (parsed !== null) {
      matches.push(parsed);
      // Strip everything up to and including the closer of the parsed block.
      const closerIdx = buf.indexOf('[/ACTION]');
      buf = buf.slice(closerIdx + '[/ACTION]'.length);
      parsed = parseActionMarker(buf);
    }
    this.buffers.set(sessionName, buf);
    return matches;
  }

  /** Clear buffer when a session is killed or detached. */
  onSessionEnd(sessionName: string): void {
    this.buffers.delete(sessionName);
  }
}
```

### Additional WB7 requirements derived from this spike

| Requirement | Source | Label |
|---|---|---|
| Per-session buffering (multi-peer concurrency) | Spike Finding 5 + parser stateless surface | [KNOWN-required] |
| Strip-and-re-parse loop (multi-marker bursts) | Spike Concern (i) | [KNOWN-required] |
| Buffer cleanup on session end (orphan buffer growth) | Structural analysis; not exercised by spike | [KNOWN-required] |
| Buffer-size cap + error-on-overflow (malformed/orphaned-opener pathological case) | Hypothetical; not exercised by spike | [MODELED — DEFER] |

**Defer recommendation for buffer-size cap:** WB7 ships without size cap. If dogfood reveals pathological buffer growth (e.g., orchestrator emits `[ACTION:...]` opener but never closer), file as Tier 2 followup with concrete observed growth rate. Cost of cap-on-day-1 = arbitrary threshold + error-recovery code; benefit deferred until observed need.

### WB6 RED probe scope implications

The WB6 RED probe (per build doc §4 line 236-241) MUST include:
- Fixture exercising chunk-size 1B / 16B / 64B against all 5 action variants (asserts Pattern A would fail — confirms accumulator is required, not optional)
- Multi-marker-in-burst fixture (asserts strip-and-re-parse correctness, not just single-marker handling)
- Mid-tag-split fixture for both opener and closer (asserts accumulator robustness to byte-level chunking)

This expanded RED probe scope is itself implied by the spike evidence; WB6 dispatch should reference this ADR §III/§V for the concrete fixture set.

## VI. Confidence labels

**Section III evidence:** all 53 cells are **[KNOWN]** — harness-executed against the actual `fc15a26`-shipped parser source (`src/coarchitect/chat-content-markers.ts`, direct read this session).

**Section IV findings (1)–(5):** all **[KNOWN]** — direct harness evidence + parser-structure analysis (parser source read at session start).

**Section V binding decision:**
- **Core requirement (Pattern B + strip-and-re-parse):** **[KNOWN]** — direct implication of [KNOWN] evidence; no alternative architecture is consistent with the observed parser behavior.
- **Implementation sketch (`ActionMarkerAccumulator` class):** **[MODELED]** — one valid implementation; alternatives include closure-captured buffer Map, observable streams, etc. Spike binds the PATTERN, not the class shape.
- **Per-session buffering + strip-and-re-parse + cleanup-on-session-end:** **[KNOWN-required]** by structural analysis grounded in [KNOWN] evidence.
- **Buffer-size cap deferral:** **[MODELED — DEFER]** — pathological case is hypothetical; spike did not exercise unbounded growth.

**Anti-fabrication discipline (CLAUDE.md §2.1 + §2.2):** every Section III evidence cell is harness-verified at this session; every Section IV finding is grounded in either harness output or direct source read; Section V binding-decision implementation sketch is explicitly labeled **[MODELED]** to distinguish "what the spike binds (the pattern)" from "one valid implementation shape." No SPECULATIVE claims appear in this ADR.

**Spike binding posture:** WB7 GREEN implementation MAY deviate from the Section V sketch (e.g., functional style instead of class) without re-spike; WB7 MAY NOT deviate from the buffer-accumulator + strip-and-re-parse pattern without re-spike, because the evidence does not support any alternative.

**End of WB1 spike ADR.**
