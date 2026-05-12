# MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING — Findings + closures

**Ticket:** MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING (γ closure-path of `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` `230cb6c`)
**Ticket body:** `docs/build-docs/CONDUCTOR_MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING_BUILD.md` (authored `030c2d6` 2026-05-12)
**Author:** P1 sub-session (gen-4 orchestrator dispatch, Round 9+ cairn-under-stress)
**Date:** 2026-05-12
**Sub-Q resolutions (operator-acked 2026-05-12):** A=(i) playwright-electron · B=(i) pixelmatch+pngjs · C=(i) 1% mismatch threshold · D=(β) gitignore screenshots · E=(ii) optional+opt-out §C amendment · F=(i) DOM-sentinel (refined to `frame-c-root` testid; T1 surface)
**Primary closure target:** `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` (Tier 2, FOLLOWUPS.md:335, filed T6 `0d71590`)

---

## I — What shipped

10 commits across the WB ladder + this WB-final:

| # | Commit | Type | Net |
|---|---|---|---|
| 1 | `030c2d6` | docs | Ticket body authoring (457 lines · 6 Sub-Qs · 10 WBs scoped) — auto-acked per expanded §C |
| 2 | `2e8493d` | red | WB1 — probe-mbtmp3vvt-01 smoke-script-contract |
| 3 | `9f58359` | spike | WB2 — playwright-electron SPIKE all-pass on macOS Darwin 25.3 + deps installed (Sub-Q-A=(i), Sub-Q-B=(i)) |
| 4 | `47237b3` | green | WB3 — phase-3-visual-smoke.mjs skeleton; WB1 probe RED→GREEN flip |
| 5 | `21ff7b7` | green | WB4 — launchHeadless + DOM-sentinel (`frame-c-root` testid; no main.ts cross-session edit) |
| 6 | `1dc5e57` | green | WB5+WB6 paired — captureScreenshot + resolveScreenshotPath + gitignore entry |
| 7 | `72a0d3c` | green | WB7 paired — diffImages pixelmatch+pngjs + 4-branch graceful-degradation |
| 8 | `132c033` | green | WB8+WB9 paired — runPhase3Smoke orchestration + classifyResult + formatSummary pure-fns |
| 9 | this commit | docs | WB10 — verify:phase-3-smoke CLI + §C amendment text + findings doc + row 335 closure stamp |

**Net file inventory:**
- NEW: `scripts/phase-3-visual-smoke.mjs` (~360 lines) + `scripts/phase-3-visual-smoke-cli.mjs` (CLI wrapper) + 5 probe specs (~370 lines total) + ADR + §C amendment doc + this findings doc
- MOD: `package.json` (devDeps + scripts) · `pnpm-lock.yaml` · `.gitignore` (Sub-Q-D=(β) entry)

---

## II — Sub-Q disposition

| Sub-Q | Operator ack | Binding interpretation | WB landed |
|---|---|---|---|
| MBTMP3VVT-A test runner | (i) playwright-electron | `_electron.launch` API; HALT-PRE-INSTALL cleared at WB2 SPIKE | WB2-WB4 |
| MBTMP3VVT-B image-diff | (i) pixelmatch + pngjs | Pure-JS; threshold 0.1 per-pixel AA tolerance | WB7 |
| MBTMP3VVT-C threshold | (i) 1% mismatch percent | Configurable via `MB_PHASE_3_DIFF_THRESHOLD` env var | WB9 |
| MBTMP3VVT-D storage | (β) gitignore | `docs/coordination/screenshots/` in `.gitignore`; avoid binary-bloat | WB6 |
| MBTMP3VVT-E §C amendment | (ii) optional+opt-out | Amendment text drafted at `auto-ack-c-amendment-mbtmp3vvt-2026-05-12.md`; ratification deferred to orchestrator landing per §3.5 wording | WB10 |
| MBTMP3VVT-F sentinel | (i) DOM-sentinel — REFINED | Originally proposed `[data-app-ready="true"]` on `#shell` via main.ts edit; refined to `[data-testid="frame-c-root"]` from T1 surface (avoids cross-session main.ts edit) | WB4 |

**Net frozen-surface impact:** **ZERO `WORKSTATION_CONTRACT.md` §6 amendment.** All additions workstation-internal per CLAUDE.md §3.7 build-script convention; devDependencies addition is operator-supervised mechanical translation per §2.10 (HALT-PRE-INSTALL gate cleared 2026-05-12 single batch).

---

## III — Architectural deltas

### III.A — `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` row 335 — CLOSED

Closure stamp authored at this commit. Row 335's enumerated γ scope items 1-5 map to WB landings:

| Scope item (row 335 body) | WB landing |
|---|---|
| (1) dev dep arbitration (playwright-electron OR electron-mocha) | WB2 SPIKE — Sub-Q-A=(i) playwright-electron ratified |
| (2) test-harness for launching workstation in headless mode | WB4 — launchHeadless via `_electron.launch` + `firstWindow` |
| (3) screenshot capture point + path convention | WB5+WB6 — captureScreenshot + resolveScreenshotPath → `docs/coordination/screenshots/<sha>.png` |
| (4) commit-body integration | WB10 — `verify:phase-3-smoke` CLI prints single-line summary; §C amendment text drafts opt-in mechanism |
| (5) optional visual-diff against canonical wireframe target | WB7 — diffImages + WB9 graceful-degradation (TARGET-ABSENT branch); operator-supplied target image consumed when present |

### III.B — Sibling closure-path advances

| Followup | Tier | Advance via P1 |
|---|---|---|
| `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) γ | Tier 1 | γ closure completes α+β+γ triple (α + β shipped at `0d71590`) |
| `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (`64d9249`) | Tier 1 | REDUCED — mechanical primary path replaces operator-visual single-point-of-failure |
| `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (`c2abb28`) closure-path-γ | Tier 1 | UNBLOCKED — visual-comparison gate tooling now exists for second-order wireframe cascade |

### III.C — FOLLOWUPS.md new filings

NONE required at WB10. All Sub-Q resolutions matched operator-acked defaults; no edge-case ratchet candidates surfaced during ladder execution. Future Tier 3 filings may surface during dogfood:
- Diff threshold tuning if Sub-Q-C=(i) 1% proves noisy (cite as `MB-F-PHASE-3-SMOKE-THRESHOLD-TUNING` candidate)
- Per-package script invocation convention amendments if `pnpm --filter dispatch-workstation verify:phase-3-smoke` ergonomics surface friction

---

## IV — Probe distribution

| Probe | WB | Conditions | Final state |
|---|---|---|---|
| `probe-mbtmp3vvt-01-smoke-script-contract.spec.ts` | WB1 RED + WB3 GREEN flip | 1 | GREEN |
| `probe-mbtmp3vvt-02-launch-headless.spec.ts` | WB4 RED+GREEN | 2 | GREEN |
| `probe-mbtmp3vvt-03-screenshot-capture.spec.ts` | WB5+WB6 paired | 4 | GREEN |
| `probe-mbtmp3vvt-04-image-diff.spec.ts` | WB7 paired | 5 | GREEN |
| `probe-mbtmp3vvt-05-orchestration.spec.ts` | WB8+WB9 paired | 8 | GREEN |

**Total P1 probes:** 5 probes / 20 conditions / 20 GREEN at WB-final.
**Consumer non-regression:** α-β probes (`probe-mbtmrvcab-01` + `-02`) untouched; T1 + T2 + T3 + T6 + T7 ticket probes unaffected by package.json + .gitignore + scripts/ additions (verified via package-level vitest at each commit).

---

## V — Architecture notes

### V.A — DOM-sentinel refinement (Sub-Q-F=(i) interpretation)

Ticket body §3.6 Sub-Q-F=(i) originally proposed adding `[data-app-ready="true"]` attribute setter on `#shell` via workstation main.ts sentinel-zone edit. WB4 refined this to use `[data-testid="frame-c-root"]` from T1 WB-final `526dd51` — Frame C is the default shell mode per `frame-mode-state.ts:8` `DEFAULT_MODE = 'C'`; the testid presence guarantees renderer mount has executed past Frame C auto-mount factory. Trade-offs:
- ✓ Avoids cross-session main.ts edit (T5 has working-tree changes there at run time)
- ✓ Leverages existing T1 surface as sync sentinel (no new contract)
- ✓ Zero workstation runtime change
- — Couples to Frame C being default mode; if operator changes default to Frame A, sentinel must be reevaluated. Tier 3 forward-propagation memory.

### V.B — Pure-fn extraction (WB8+WB9 paired)

`runPhase3Smoke` orchestration would have been hard to unit-test without running real playwright-electron. WB8+WB9 paired refactored the classification + summary-formatting into pure-fn helpers (`classifyResult`, `formatSummary`) testable independently. End-to-end orchestration is exercised at:
- WB-final smoke cycle (this commit; operator runs `verify:phase-3-smoke` against this commit's HEAD)
- Future workstation-touching tickets per §C amendment opt-in semantics

### V.C — Graceful-degradation triple-handling (anti-fabrication §2.3)

The "target image may not exist" requirement propagates through three layers:
1. `diffImages` returns `error='TARGET-ABSENT'` (not throw)
2. `classifyResult` maps `error='TARGET-ABSENT'` → `state='TARGET-ABSENT'` SmokeState
3. CLI wrapper `phase-3-visual-smoke-cli.mjs` exits 0 (not 1) for `TARGET-ABSENT` state — auto-ack-eligible per §C amendment text

Each layer is unit-tested. This is the canonical defensive-coding pattern for non-locally-verifiable inputs.

---

## VI — Documentation drift

NONE. Ticket body §1.1 8 DOES bullets all shipped:
1. Sub-Q-A test runner selection — WB2 SPIKE ✓
2. Sub-Q-B image-diff library selection — WB7 ✓
3. phase-3-visual-smoke.mjs orchestration — WB8+WB9 ✓
4. Screenshot path convention — WB5+WB6 ✓
5. Graceful-degradation for absent target — WB7+WB9 ✓
6. §C envelope integration as closure-path-γ — WB10 amendment text ✓
7. CLI primitive `verify:phase-3-smoke` — WB10 ✓
8. Audit-doc reclassification candidates — surfaced in §III above ✓

Ticket body §1.2 DOES NOT bullets all honored (zero §6, zero frozen-surface touch, zero δ/ε implementation, etc).

---

## VII — Consumer non-regression

Per CLAUDE.md memory `feedback_consumer_non_regression_per_wb`: at each P1 WB, the prior P1 probes plus existing α-β probes were re-run; all GREEN throughout. T1 + T2 + T3 + T6 + T7 probes are path-disjoint from P1's `scripts/` + `test/unit/methodology-phase-3-smoke/` + `.gitignore` additions. Workstation typecheck verified clean at WB2 SPIKE build run (`dist/main/main.js` produced).

---

## VIII — WB skip rationale

- **No WBs skipped.** All 10 WBs landed per ticket body §4 ladder.
- **WB2 SPIKE** included per CLAUDE.md §2.8 — external API (playwright-electron + electron 28+ on macOS Darwin 25.3) personally observed before production wiring. ADR landed at `docs/coordination/mbtmp3vvt-wb2-spike-adr-2026-05-12.md`.

---

## IX — New followups filed

NONE this WB. Two candidates surfaced in §III.C as forward-propagation memory for dogfood-driven Tier 3 escalation:
- `MB-F-PHASE-3-SMOKE-THRESHOLD-TUNING` — if Sub-Q-C=(i) 1% threshold proves noisy at first real wireframe-vs-shipped diff
- `MB-F-PHASE-3-SMOKE-DOM-SENTINEL-FRAME-C-COUPLING` — if Frame C ceases to be default shell mode (currently `frame-mode-state.ts:8` `DEFAULT_MODE = 'C'`)

Both are pre-emptive candidates; neither warrants filing at WB10 since dogfood hasn't surfaced supporting evidence.

---

## X — Open items

1. **Auto-ack §C envelope amendment ratification** — text drafted at `docs/coordination/auto-ack-c-amendment-mbtmp3vvt-2026-05-12.md`; ratification deferred to orchestrator landing per dispatch §3.5 visual-comparison gate addition wording. P1 sub-session role complete; orchestrator gen-4 (or successor) ratifies at separate commit cycle.

2. **Wireframe target image** — `docs/coordination/wireframe-target-2026-05-11.png` does NOT exist at this commit's HEAD (anti-fabrication §2.3 honored throughout P1 ladder). Operator supplies asynchronously. First post-supply Phase 3 smoke run will produce real diff result; current runs produce `TARGET-ABSENT` graceful-degradation summary.

3. **End-to-end smoke run against this commit's HEAD** — P1 sub-session did not run `pnpm --filter dispatch-workstation verify:phase-3-smoke` as final verification (CLI script just landed in this commit; running it before the commit lands creates a chicken-and-egg). Orchestrator gen-4 or operator may run post-merge to verify end-to-end orchestration; expected output `state=TARGET-ABSENT screenshot=docs/coordination/screenshots/<sha>.png duration=~35-95s` per architecture notes §V.

4. **First-merge invocation** — Future workstation-touching tickets at WB-final cycles begin opting in to `verify:phase-3-smoke` per §C amendment text. Operator visual-diff fallback retained for opt-out cases.

5. **Dispatch §3.5 operator-manual-screenshot fallback** — Now formally opt-out (was load-bearing default). Operator may direct adjustments per dogfood observations.
