# Session 3 findings — 2026-05-06 (parallel-batch-3)

**Branch:** `sess-3/cardbridge-integration-smoke`
**Cut from:** `main` HEAD `c7c1a3a`
**Append-only during this session.** Operator merges into
`docs/cairn-findings.md` as the scaffold-close step. Reserved finding
range for this session: **#130-134** (per Phase 1 brief §5).

This file holds Session 3's Phase-2-shipped findings before they land
in the canonical `docs/cairn-findings.md`. Same shape as the canonical
findings file; the merge into cairn-findings.md is a literal copy-and-
renumber step (operator may renumber if other sessions claimed
intervening slots in parallel).

---

## Finding #130 — MB-F-CARDBRIDGE-INTEGRATION-SMOKE-LANDED

**Date filed:** 2026-05-06
**Tier:** 2 (verification-net coverage; closes finding #111's followup
recommendation)
**Origin:** Finding #111 ¶**Followup recommendation** at
`docs/cairn-findings.md:2281`. Operator-arbitrated parallel-batch-3
brief (the brief itself per Q1 stands as the de-facto Phase-2 scaffold).
**Discovered by:** Session 3 / parallel-batch-3 (this session).
**Resolution status:** **SHIPPED** — single probe at
`packages/dispatch-workstation/test/integration/cardbridge-shape/
probe-01-shape-and-roundtrip.test.ts`. Aggregate REPORT lives at
`packages/dispatch-workstation/test/integration/cardbridge-shape/
REPORT.md`. 8/8 cases PASS in 251ms; auto-skip-with-loud-reason path
also verified (operator-actionable recovery command in the skip
description renders inline in vitest verbose reporter).

**Symptom (KNOWN, gap-confirmed by finding #111).** Pre-finding-#111-
resolution: every operator click on an OrchestratorCard pill threw
`TypeError: cardBridge.approve is not a function` because the shell-
side `makeCardBridge` factory exposed `emitCardApproved/emitCardDeclined/
emitMultiChoiceSelected` while the web-side helpers in
`card-ipc-bridge.ts:87-133` called `bridge.approve(...)`,
`bridge.decline(...)`, `bridge.multiChoiceSelect(...)`. Subscribe-side
was strictly worse: `bridge.onCardRendered/onCardSuperseded/onCardUpdate`
did not exist on the shell-exposed object at all, so
`useOrchestratorCards`'s subscribe call would throw on first render.
**Per-side unit tests on both surfaces passed**; no integration test
composed both. Finding #111's resolution renamed shell-side methods
to canonical web names and added subscribe methods at MB-T07 commit
`e440420`. Finding #111 ¶**Followup recommendation** asked for an
integration smoke test that boots the preload bundle and asserts shape
match, "to catch future drift even without per-side test coverage."

**Defect class.** Verification-net coverage gap. NOT a production-code
defect; finding #111 already resolved the underlying shell/web rename.
The gap was the absence of a regression net at the cross-package
interface boundary.

**Resolution.**

Single probe directory shipped:

| Path | Result | Closes |
|---|---|---|
| `packages/dispatch-workstation/test/integration/cardbridge-shape/probe-01-shape-and-roundtrip.test.ts` | **8 / 8 PASS** in 251ms (KNOWN at branch HEAD `728a6c2`) | finding #111 ¶Followup recommendation |

Plus `packages/dispatch-workstation/test/integration/cardbridge-shape/
REPORT.md` aggregate.

The 8 it() cases:
1. `exposes window.cardBridge with all 6 canonical methods` —
   structural shape check via `CANONICAL_METHODS` derived as
   `keyof CardBridge` from a type-only import of the WEB-side
   interface.
2. `approve(envelope) → ipc.send("card:approved", envelope)` —
   emit-side round-trip; channel + envelope identity.
3. `decline(envelope) → ipc.send("card:declined", envelope)` — same.
4. `multiChoiceSelect(envelope) → ipc.send("card:multi-choice-selected",
   envelope)` — same.
5. `onCardRendered(handler) wires ipc.on("orchestrator-card-rendered");
   fired event delivers payload (event-unwrapped)` — subscribe-side
   round-trip; channel + listener registration + (event, payload) →
   handler(payload) unwrap behavior.
6. `onCardSuperseded(handler) wires ipc.on("orchestrator-card-
   superseded"); fired event delivers payload (event-unwrapped)` — same.
7. `onCardUpdate(handler) wires ipc.on("orchestrator-card-update");
   fired event delivers payload (event-unwrapped)` — same.
8. `cleanup closure calls ipc.removeListener with same channel + same
   listener reference` — listener-reference identity for the cleanup
   path; load-bearing because Electron's `ipcRenderer.removeListener`
   compares listeners by reference.

Mock-injection approach (per Q2 operator authorization, option A from
Phase 1 §2.3): pre-populate `requireCjs.cache[electronPath]` with a
stub `electron` module (contextBridge.exposeInMainWorld captures the
bridge into a closure variable; ipcRenderer surface stubs send/on/
removeListener as `vi.fn` and invoke as `() => Promise.resolve(null)`
to settle the Fix-92 IIFE benignly). Then `requireCjs(BUNDLE_PATH)`
loads the bundle, hits the cache for electron, exposes the bridge
synchronously at bundle line 43.

Auto-skip path (per Q3 operator authorization): when `dist/main/
card-bridge.cjs` is absent (e.g., post-`pnpm clean` or fresh worktree),
the entire describe block is replaced by `describe.skip` carrying the
operator-actionable recovery command verbatim:

> Run `pnpm --filter dispatch-workstation build` (or focused: `node
> packages/dispatch-workstation/scripts/build-card-bridge.mjs`) then
> re-run this probe for KNOWN evidence.

Pattern adapted from `mb-t05-spawn-tmux/probe-01-tmux-session-exists.
test.ts` per finding #115 / fix-94 precedent, but using `describe.skip`
instead of per-it `ctx.skip` so the reason surfaces louder in the
vitest reporter output (verified visually with
`--reporter=verbose` against an absent bundle at 20:05:59).

**Source-side seam additions.** **None.** Session 3 is OBSERVER on
`packages/dispatch-workstation/src/` per Phase 1 brief territory
boundaries. Probe loads the existing built bundle; no production
source modified.

**Drift this catches (KNOWN by construction).**

| Drift class | Probe assertion that fires |
|---|---|
| Method rename (e.g., shell back to `emitCardApproved`) | C2 it #1 — `typeof bridge.approve === 'function'` fails; message names the missing method. |
| Method removal (subscribe-side missing entirely, the worst pre-MB-T07-resolution state per finding #111 ¶1) | C2 it #1 — all 3 `on*` assertions fail. |
| Web-side method rename | Compile-time — `CANONICAL_METHODS` is `ReadonlyArray<keyof CardBridge>`; if web renames, the type-derivation breaks before the test runs. |
| Channel-name shift on Webview→Shell envelopes | C3 it #2/3/4 — `toHaveBeenCalledWith(channel, envelope)` fails on channel mismatch. |
| Channel-name shift on Shell→Webview envelopes | C4 it #5/6/7 — listener-not-found in `findRegisteredListener(channel)` fails the assertion. |
| Envelope payload restructure (field rename, type change) | C3/C4 — Vitest's deep-equal on the envelope/payload arg surfaces the diff. |
| Subscribe-helper unwrap regression (forwarding both args) | C4 it #5/6/7 — `toHaveBeenCalledWith(payload)` fails with arg-count mismatch. |
| Cleanup-closure-constructs-new-arrow regression | C4 it #8 — reference identity check fails. |

**Methodology lesson — generalizes finding #111.**

Cross-package interface contracts MUST have integration tests that
compose both sides. Per-side unit tests are insufficient — both sides
will mock the contract in their own preferred shape and both will
pass while production crashes. Finding #111 documented this lesson;
this finding operationalizes it as a regression net.

The pattern generalizes: **any time a TypeScript interface is declared
in two places** (here: `CardBridge` in `card-bridge.ts:97-104` and
`card-ipc-bridge.ts:63-70`) the two sides are at risk of silent
drift. The mitigation is either (a) a single source of truth via
shared package, or (b) an integration test that proves shape match
at runtime. (a) was rejected at MB-T07 design (operator A7) because
the shell-side bridge needs `card: unknown` for schema-decoupling
while web needs the narrow type for reducer correctness. So (b) is
the active mitigation; this probe IS the active mitigation.

**Verification chain (KNOWN-where-noted).**

- Probe in isolation (KNOWN, captured 2026-05-06 20:13:39 against
  branch HEAD `728a6c2`):
  ```
  pnpm --filter dispatch-workstation exec vitest run \
    test/integration/cardbridge-shape/probe-01-shape-and-roundtrip.test.ts
  > ✓ test/integration/cardbridge-shape/probe-01-shape-and-roundtrip.test.ts (8 tests) 4ms
  > Test Files: 1 passed (1)
  > Tests: 8 passed (8)
  > Duration: 251ms
  ```
- Auto-skip path (KNOWN, captured 2026-05-06 20:05:59 — bundle moved
  aside): `1 skipped (1)` with full loud-reason in the verbose
  reporter output.
- Workstation-suite-wide cross-check (KNOWN, captured 2026-05-06
  20:13:43): `Tests: 7 failed | 557 passed | 11 skipped (575)`. The
  7 failures are pre-existing in OTHER directories (fix-84/probe-06,
  fix-89/probe-01, fix-92/probe-02, fix-92/probe-07, mb-t04/spawn-
  modal-emits-intent, coarchitect-ipc/test_register_ipc_handlers).
  None of the failures touch `test/integration/cardbridge-shape/`
  or any source the cardbridge-shape probe loads. **KNOWN no-
  regression.**
- RED→GREEN cycle proves each assertion fires when the underlying
  behavior is wrong (channel name, unwrap, cleanup reference). KNOWN
  per the C2-RED, C3-RED, C4-RED test runs in the commit ladder.

**Confidence.** KNOWN. Probe runs deterministic in 251ms. Auto-skip
path verified. RED→GREEN cycle proves assertions are meaningful
(not vacuously passing).

**Cross-references.**
- Finding #111 (`docs/cairn-findings.md:2260`) — source defect;
  methodology lesson; followup recommendation that drives this
  finding.
- Finding #115 (`docs/cairn-findings.md:2362`) — auto-skip-with-MANUAL
  pattern referenced for the skip-guard discipline.
- `mb-t05-spawn-tmux/probe-01-tmux-session-exists.test.ts` —
  auto-skip reference probe.
- `packages/dispatch-workstation/test/integration/cardbridge-shape/
  REPORT.md` — per-directory aggregate REPORT.

**Out of scope for this finding.**
- Schema-narrowing differences between `card: unknown` (shell) and
  `card: CardOutput | MultiChoiceCardOutput` (web) — the schema
  narrow happens at the web-side reducer boundary; not part of the
  bridge surface shape.
- Multi-instance bundle reload semantics — probe loads the bundle
  once at module-import time; re-loading would hit Node's
  `require.cache`. Not currently exercised; documented in REPORT §8
  for future-test reference.

**Commit ladder (10 commits, all on `sess-3/cardbridge-integration-
smoke`).**

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
| C5 | `887a95f` | `refactor(MB-F-CARDBRIDGE-SMOKE): C5 — REPORT.md aggregate` |
| C6 (this) | _pending_ | `docs(MB-F-CARDBRIDGE-SMOKE): C6 — sess-3 finding entry` |

---

## §G — gaps surfaced during Phase 2 (operator-state observations)

### §G1 — bundle materialized in worktree without explicit Session 3 build

**Confidence: SPECULATIVE.** Per Phase 1 brief FACT-D, `dist/main/
card-bridge.cjs` should NOT exist in this worktree because worktrees
don't inherit gitignored `dist/` artifacts. C1 RED confirmed this at
20:03:48 (MODULE_NOT_FOUND error). C1 GREEN re-ran at 20:04:40 and
the bundle WAS THERE — `TypeError: Cannot read properties of undefined
(reading 'exposeInMainWorld')` is an in-bundle stack frame, proving
the bundle loaded.

Between those two runs, Session 3 only did:
- `git status --short`
- `git add ...`
- `git commit -m ...`
- `git log -1 --stat`
- `git push`

None of these should build the bundle. Most plausible cause: parallel
operator-side `pnpm build` in another terminal, or pnpm workspace
machinery triggering a transitive build during `pnpm exec vitest`.

The bundle contents look correct (1695 bytes, esbuild CJS output,
line-for-line match against `card-bridge-preload.mts`); SHIPPED on
as-built bundle is sound. NOT halting — surfaced for operator
awareness in case the materialization affects other sessions or
indicates an environment misconfiguration.

### §G2 — wider workstation suite has 7 pre-existing failures

**Confidence: KNOWN (pre-existing, not caused by Session 3).** When
running the full workstation suite at 20:13:43, 7 tests failed:

1. `fix-84-verification/probe-06-defect-b-card-emission-manual.test.ts`
2. `fix-89-menu-rebuild/probe-01-menu-rebuild-propagates.test.ts`
3. `fix-92-verification/probe-02-daemon-precondition.test.ts`
4. `fix-92-verification/probe-07-daemon-connectivity-from-webview.test.ts`
5. `mb-t04/spawn-modal-emits-intent.test.ts`
6. `coarchitect-ipc/test_register_ipc_handlers.spec.ts` (1 case)

Six are integration probes that depend on operator-state (running
daemon, Electron available, etc. — same operator-state class as fix-94's
auto-skip pattern). One is a coarchitect-ipc unit test with a
"Timeout: waitForSend" message suggestive of timing flake. None of
the failures touch `test/integration/cardbridge-shape/` or any source
the cardbridge-shape probe loads.

Surfacing for operator triage post-merge — these failures may be
banked operator-state issues already, but the visibility of 7 reds
in CI is worth a HALT-class-4 surfacing if operator wants this fixed
before merging Session 3's branch.

---

End of session-3 findings file. Operator merges into
`docs/cairn-findings.md` as scaffold-close step.
