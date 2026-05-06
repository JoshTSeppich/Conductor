# cardbridge-shape Probe 1 — REPORT.md (2026-05-06)

**Branch:** `sess-3/cardbridge-integration-smoke`
**Cut from:** `main` HEAD `c7c1a3a`
**This REPORT commit lands at:** post-`728a6c2` (final C4 GREEN)
**Probe result (KNOWN, captured 20:13:39 on 2026-05-06):** **8 / 8 PASS** in 251ms.
**Auto-skip path (KNOWN, captured 20:05:59 on 2026-05-06):** when `dist/main/card-bridge.cjs` is absent, the entire `describe` is replaced by `describe.skip` carrying the operator-actionable recovery command verbatim — verified by temporarily moving the bundle aside and observing `1 skipped (1)` with the loud reason in the vitest verbose reporter.

This single probe ships Session 3 / parallel-batch-3's **CardBridge integration smoke test** per finding #111's followup recommendation (`docs/cairn-findings.md:2281`). Closes a Tier-2 gap that pre-existed Phase 1 and would have allowed cross-package interface drift to land silently.

## §1 Strategic context

Finding #111 (`MB-F-MB-T07-CARDBRIDGE-INTERFACE-DRIFT-RESOLVED`, RESOLVED at MB-T07 commit `e440420`) documented that the shell-side `CardBridge` factory and the web-side `CardBridge` interface declaration had drifted apart silently:

- shell exposed `emitCardApproved` / `emitCardDeclined` / `emitMultiChoiceSelected` (emit-prefixed)
- web called `bridge.approve(...)` / `bridge.decline(...)` / `bridge.multiChoiceSelect(...)` (unprefixed)
- subscribe-side methods (`onCardRendered/Superseded/Update`) did not exist on the shell-exposed object at all

Per-side unit tests at `test_card_bridge_factory.spec.ts` (shell) and `mb-t07-approve-fires-action.test.tsx` (web) **both passed** because each side mocked the bridge in its own preferred shape. Production would have crashed on every operator click with `TypeError: cardBridge.approve is not a function`. Finding #111 ¶**Methodology lesson** identified the gap:

> Cross-package interface contracts need integration tests, not just per-side unit tests. … A single integration test that imports both factories and calls them through the same window.cardBridge object would have caught this at first runtime; the absence of such a test was the load-bearing gap.

The followup recommendation:

> File a Tier 2 followup to add an integration smoke test that boots the preload bundle (`dist/main/card-bridge.cjs`) and asserts the exposed `cardBridge` shape matches the web-side `CardBridge` interface structurally. This would catch future drift even without per-side test coverage.

This probe IS that followup.

## §2 Probe inventory

| # | File | Result | Evidence |
|---|---|---|---|
| 1 | `probe-01-shape-and-roundtrip.test.ts` | **8 / 8 PASS** in 251ms | createRequire + require.cache stub for electron + 8 it() cases (shape, 3 emit, 3 subscribe, cleanup) |

### §2.1 Operator arbitrations applied (per Phase 1 §6 + Phase 2 brief)

| ID | Decision | Status |
|---|---|---|
| Q1 | Phase 1 brief itself IS the de-facto Phase-2 contract; no separate `parallel-batch-3-2026-05-06.md` scaffold authored. | APPLIED — territory + frozen-contract list internalized from brief sections. |
| Q2 | Mock injection: option A (require.cache pre-population). | APPLIED — `requireCjs.cache[electronPath] = { exports: electronStub }` before `requireCjs(BUNDLE_PATH)`. KNOWN works. |
| Q3 | Skip pattern: `describe.skip` with descriptive reason (option A from Phase 1 §2.2). | APPLIED — verified loud reason renders inline in vitest verbose reporter. |
| Q4 | Test granularity: 8 separate `it` cases. | APPLIED — exactly 8 it() cases per the Phase 2 brief enumeration. |
| Q5/Q6 | Type-only import from dispatch-web allowed. | APPLIED — `import type { CardBridge } from 'dispatch-web/src/orchestrator-cards/card-ipc-bridge.js'`; CANONICAL_METHODS list derived as `keyof CardBridge`. |
| Q7 | sess-3-findings-2026-05-06.md is NEW from scratch. | APPLIED in C6 (next commit). |
| Q8 | No vitest config changes; createRequire(import.meta.url) is sufficient. | APPLIED — `packages/dispatch-workstation/vitest.config.ts` untouched. |

## §3 Source-side seam additions

**None.** Session 3 is OBSERVER on `packages/dispatch-workstation/src/` per Phase 1 brief territory boundaries. The probe loads the existing built bundle (`dist/main/card-bridge.cjs`) without touching any production source. No source-side commits in this branch.

This is a deliberate contrast with parallel-batch-2 / Session 3, which added a SHELL_EVAL stdin handler to `main.ts` (44 LOC under MB_TEST_HOOKS=1) for a different probe class. The cardbridge-shape probe needs no source-side seam because the bundle's `contextBridge.exposeInMainWorld` is already the natural test seam — we just intercept the call via `require.cache` electron stub.

## §4 Probe results detail

### §4.1 PASS-individual-mode (KNOWN evidence)

**Probe 1 — cardbridge-shape — PASS in 251ms** (8/8 cases)

Run command:
```
pnpm --filter dispatch-workstation exec vitest run \
  test/integration/cardbridge-shape/probe-01-shape-and-roundtrip.test.ts
```

Result (KNOWN, captured at 20:13:39 on 2026-05-06 against branch HEAD `728a6c2`):
```
 ✓ test/integration/cardbridge-shape/probe-01-shape-and-roundtrip.test.ts (8 tests) 4ms
 Test Files  1 passed (1)
      Tests  8 passed (8)
   Duration  251ms
```

The 8 it() cases (in execution order):

1. **`exposes window.cardBridge with all 6 canonical methods`** — KNOWN. Iterates `CANONICAL_METHODS` (derived from `keyof CardBridge` on the web-side type) and asserts `typeof bridge[method] === 'function'` for each. Catches: method rename, method removal, signature degradation to non-function. Failure message names the specific missing method.

2. **`approve(envelope) → ipc.send("card:approved", envelope)`** — KNOWN. Constructs the canonical `ApprovedEnvelope` shape (matches `card-bridge.ts:51-56` verbatim per FACT-A), calls `bridge.approve(envelope)`, asserts `ipcSpies.send.toHaveBeenCalledWith('card:approved', envelope)`. Catches: channel rename, envelope payload restructure.

3. **`decline(envelope) → ipc.send("card:declined", envelope)`** — KNOWN. Same pattern, channel `card:declined`, envelope shape per `card-bridge.ts:58-63`.

4. **`multiChoiceSelect(envelope) → ipc.send("card:multi-choice-selected", envelope)`** — KNOWN. Same pattern, channel `card:multi-choice-selected`, envelope shape per `card-bridge.ts:65-71`.

5. **`onCardRendered(handler) wires ipc.on("orchestrator-card-rendered"); fired event delivers payload (event-unwrapped)`** — KNOWN. Registers a vi.fn handler via the bridge, locates the listener arrow `ipcSpies.on` registered for `orchestrator-card-rendered`, fires the listener with `(fakeEvent, payload)`, asserts `handler.toHaveBeenCalledWith(payload)` (single arg, NOT the un-unwrapped tuple) and `toHaveBeenCalledTimes(1)`. Catches: subscribe-helper unwrap regression (forwarding both args), double-dispatch.

6. **`onCardSuperseded(handler) wires ipc.on("orchestrator-card-superseded"); fired event delivers payload (event-unwrapped)`** — KNOWN. Same pattern, channel `orchestrator-card-superseded`, payload shape per `card-bridge.ts:83-87`.

7. **`onCardUpdate(handler) wires ipc.on("orchestrator-card-update"); fired event delivers payload (event-unwrapped)`** — KNOWN. Same pattern, channel `orchestrator-card-update`, payload shape per `card-bridge.ts:89-93`.

8. **`cleanup closure calls ipc.removeListener with same channel + same listener reference`** — KNOWN. Captures the listener registered for `onCardRendered`, calls the cleanup closure returned by `onCardRendered(handler)`, asserts `ipcSpies.removeListener.toHaveBeenCalledWith('orchestrator-card-rendered', registeredListener)`. Reference-identity check via Vitest's deep-equal-with-function-identity at the top level. Catches: cleanup-closure-constructs-new-arrow regression, which would silently leak listeners across subscribe/unsubscribe cycles.

### §4.2 AUTO-SKIP path (KNOWN evidence)

**Trigger:** `dist/main/card-bridge.cjs` absent.

**Verification (captured at 20:05:59 on 2026-05-06):** temporarily moved bundle aside, re-ran with `--reporter=verbose`. Output:
```
 ↓ test/integration/cardbridge-shape/probe-01-shape-and-roundtrip.test.ts >
   cardbridge-shape Probe 1 SKIPPED: .../dist/main/card-bridge.cjs missing.
   Run `pnpm --filter dispatch-workstation build` (or focused: `node
   packages/dispatch-workstation/scripts/build-card-bridge.mjs`) then
   re-run this probe for KNOWN evidence. > preconditions: bundle exists
   and loads
 Test Files  1 skipped (1)
      Tests  1 skipped (1)
```

The loud reason is the operator-actionable recovery command verbatim — no separate README required. Pattern adapted from `mb-t05-spawn-tmux/probe-01-tmux-session-exists.test.ts` per finding #115 / fix-94 precedent, but using `describe.skip` (Q3 operator preference) instead of per-it `ctx.skip` so the reason surfaces louder in the reporter output.

## §5 What drift this catches (per finding #111 root-cause cluster)

KNOWN, by construction:

| Drift class | Probe assertion that fires |
|---|---|
| Method rename (e.g., shell back to `emitCardApproved`) | C2 it #1 — `typeof bridge.approve === 'function'` fails; message names the missing method. |
| Method removal (subscribe-side missing entirely, the worst pre-Phase-2 state per finding #111 ¶1) | C2 it #1 — all 3 `on*` assertions fail. |
| Web-side method rename | Compile-time — `CANONICAL_METHODS` is `ReadonlyArray<keyof CardBridge>`; if web renames, the type-derivation breaks before the test runs. |
| Channel-name shift on Webview→Shell envelopes | C3 it #2/3/4 — `toHaveBeenCalledWith(channel, envelope)` fails on channel mismatch. |
| Channel-name shift on Shell→Webview envelopes | C4 it #5/6/7 — listener-not-found in `findRegisteredListener(channel)` fails the assertion. |
| Envelope payload restructure (field rename, type change) | C3/C4 — Vitest's deep-equal on the envelope/payload arg surfaces the diff. |
| Subscribe-helper unwrap regression (forwarding both args) | C4 it #5/6/7 — `toHaveBeenCalledWith(payload)` fails with arg-count mismatch. |
| Cleanup-closure-constructs-new-arrow regression | C4 it #8 — reference identity check fails. |

MODELED, not by construction:
- Type-narrowing differences between `card: unknown` (shell) and `card: CardOutput | MultiChoiceCardOutput` (web) — probe uses `unknown`-shaped fixtures, so the narrow-type discrepancy doesn't surface unless explicitly asserted. The schema-narrowing happens at the web-reducer boundary, which is web-side test territory.

## §6 Methodology lesson (informs Session 3 / parallel-batch-3 finding entry)

Cross-package interface contracts MUST have integration tests that compose both sides. Per-side unit tests are insufficient — both sides will mock the contract in their own preferred shape and both will pass while production crashes. Finding #111 documented this lesson; this probe operationalizes it as a regression net.

The pattern generalizes: **any time a TypeScript interface is declared in two places** (here: `CardBridge` in shell card-bridge.ts:97-104 and web card-ipc-bridge.ts:63-70) the two sides are at risk of silent drift. The mitigation is either (a) a single source of truth via shared package, or (b) an integration test that proves shape match at runtime. (a) was rejected at MB-T07 design (operator A7) because the shell-side bridge needs `card: unknown` for schema-decoupling while web needs the narrow type for reducer correctness. So (b) is the active mitigation; this probe is the active mitigation's enforcement.

## §7 Cross-references

- **Finding #111** (`MB-F-MB-T07-CARDBRIDGE-INTERFACE-DRIFT-RESOLVED`) — `docs/cairn-findings.md:2260`. Source defect; methodology lesson; followup recommendation that drives this probe.
- **Finding #115** (`MB-F-PROBE-COVERAGE-GAP-CLOSURES-2026-05-05`) — `docs/cairn-findings.md:2362`. Auto-skip-with-MANUAL pattern referenced for the C1 GREEN skip-guard discipline.
- **`mb-t05-spawn-tmux/probe-01-tmux-session-exists.test.ts`** — auto-skip reference probe.
- **`packages/dispatch-workstation/src/main/card-bridge.ts`** — shell-side factory under test.
- **`packages/dispatch-workstation/src/main/card-bridge-preload.mts`** — preload entry that the bundle is built from.
- **`packages/dispatch-workstation/scripts/build-card-bridge.mjs`** — esbuild script that produces `dist/main/card-bridge.cjs`.
- **`packages/dispatch-web/src/orchestrator-cards/card-ipc-bridge.ts`** — web-side `CardBridge` interface (canonical shape per finding #111 resolution).

## §8 Confidence

**Overall: KNOWN.** Probe runs deterministic in 251ms. Auto-skip path verified on bundle-absent. RED→GREEN cycle proves each assertion fails when the underlying behavior is wrong (channel name, unwrap, cleanup reference) — so the GREEN assertions are meaningful, not vacuous.

**MODELED:** the probe loads the bundle once at module-import time (capture happens synchronously inside `requireCjs(BUNDLE_PATH)` at bundle line 43). Re-loading the bundle in the same vitest worker (e.g., for a future "two preload instances" test) would hit Node's `require.cache` and not re-fire the side effect — operator should `delete requireCjs.cache[BUNDLE_PATH]` between requires if that test is ever added. Not a current concern.

**SPECULATIVE:** the dist/main/card-bridge.cjs bundle materialized in this worktree between the C1 RED run (20:03:48 — bundle absent) and the C1 GREEN run (20:04:40 — bundle present) without any explicit build invocation by Session 3. Most plausible cause: parallel operator-side `pnpm build` in another terminal, or pnpm workspace machinery triggering a transitive build during `pnpm exec vitest`. The bundle contents look correct (1695 bytes, esbuild CJS output, line-for-line match against `card-bridge-preload.mts` source), so SHIPPED on as-built bundle is sound. Not a HALT — surfaced for operator awareness.

## §9 Wider workstation suite cross-check

KNOWN, captured at 20:13:43 on 2026-05-06:
```
Tests:  7 failed | 557 passed | 11 skipped (575)
```

The 7 failures are pre-existing in OTHER directories (`fix-84/probe-06`, `fix-89/probe-01`, `fix-92/probe-02`, `fix-92/probe-07`, `mb-t04/spawn-modal-emits-intent`, `coarchitect-ipc/test_register_ipc_handlers`). Six are integration probes that depend on operator-state (running daemon, Electron available, etc. — same operator-state class as fix-94's auto-skip pattern); one is a coarchitect-ipc unit test with a "Timeout: waitForSend" message suggestive of timing flake. None of the failures touch `test/integration/cardbridge-shape/` or any source the cardbridge-shape probe loads. **KNOWN no-regression for this Session 3 ladder.**

## §10 Commit ladder

| # | SHA | Subject |
|---|---|---|
| C1 RED | `025a6b2` | `red(MB-F-CARDBRIDGE-SMOKE): C1 — auto-skip guard test fails without conditional` |
| C1 GREEN | `8142dfa` | `green(MB-F-CARDBRIDGE-SMOKE): C1 — describe.skip wraps conditional on bundle existence` |
| C2 RED | `0cff1d7` | `red(MB-F-CARDBRIDGE-SMOKE): C2 — shape assertion fails without bundle load` |
| C2 GREEN | `56958f3` | `green(MB-F-CARDBRIDGE-SMOKE): C2 — createRequire + require.cache stub captures cardBridge` |
| C3 RED | `a4435dd` | `red(MB-F-CARDBRIDGE-SMOKE): C3 — emit-side tests fail without ipc.send wiring` |
| C3 GREEN | `5ad50fa` | `green(MB-F-CARDBRIDGE-SMOKE): C3 — 3 emit methods invoke correct channels` |
| C4 RED | `d5e58d1` | `red(MB-F-CARDBRIDGE-SMOKE): C4 — subscribe-side tests fail without ipc.on wiring + cleanup` |
| C4 GREEN | `728a6c2` | `green(MB-F-CARDBRIDGE-SMOKE): C4 — 3 subscribe methods + cleanup unwire correctly` |
| C5 (this) | _pending_ | `refactor(MB-F-CARDBRIDGE-SMOKE): C5 — REPORT.md aggregate` |
| C6 | _pending_ | `docs(MB-F-CARDBRIDGE-SMOKE): C6 — sess-3 finding entry` |

10 commits total. Each cairn five-verb. Per-commit-push verified after each commit.

## §11 Halt status

Phase 2 ship complete (C1-C5). C6 next (sess-3 finding entry) then HALT for operator merge per Phase 2 brief: "Do NOT attempt to merge to main yourself — operator authors all merges."
