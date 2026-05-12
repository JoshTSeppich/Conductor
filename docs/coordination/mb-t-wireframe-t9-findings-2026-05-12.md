# MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW — findings doc

**Authored:** 2026-05-12 (Round 11 §3.9 SPECULATIVE phase4-t9-exec session, WB8 final)
**Anchor commits:**
- WB1 RED `85ed1e9` (Round 10 P5b dispatch)
- WB2 SPIKE `3baa241`
- WB3 RED `6756a6c` · WB4 GREEN `3fef80d`
- WB5 RED `debc40a` · WB6 GREEN `6d8af23`
- WB7 GREEN `de6620e`
- WB8 (this doc) — runtime smoke + findings stamp

**Authoring envelope:** Round 11 §3.9 territorial-partition manifest at `e5c7c96`; §C auto-ack; cairn discipline; per-path `git add` + commit-pathspec mandatory; PHASE 4 SPECULATIVE per directive (revision-cost accepted).

---

## §I — Summary

T9 ships the **architectural seam** for the bottom-rail plan-timer real-data flow. The post-MB-T-HSO-WIRE WB14a silence on `coarchitect:getRateLimitState` is reauthored in shape — IPC handler now pulls from a pluggable rate-limit aggregator, broadcast emitter reauthored at the channel `coarchitect:rate-limit-update`, mount auto-wire closes the PlanTimerText production-wiring arm — but the **data source** is intentionally null per ADR-MBTWFT9-A (Sub-Q-T9-A=(f) skeleton-with-deferred-source) until a follow-on plugs a real source.

Outcome classification per CLAUDE.md §2.11: **Capability enabled with known limitations.**

`[KNOWN]` evidence: 12/12 T9 unit probes GREEN at WB7; coarchitect-ipc consumer-non-regression 6/6 GREEN; workstation typecheck CLEAN; build successful; Phase-3 headless smoke launched electron + captured screenshot at `docs/coordination/screenshots/de6620e.png` (gitignored per §3.9.D).

---

## §II — Cairn ladder

| WB | Type | Commit | Test impact |
|---|---|---|---|
| WB1 | red | `85ed1e9` | 3-cond probe (STUB removed, aggregator module, mount auto-wire) — all RED at HEAD |
| WB2 | spike | `3baa241` | ADR-MBTWFT9-A/B/C/D/E + Sub-Q resolutions; (c) PTY-scrape NON-VIABLE finding |
| WB3 | red | `6756a6c` | 6-cond probe (aggregator factory + roundtrip + null-source) |
| WB4 | green | `3fef80d` | WB3 6/6 GREEN; WB1 cond (2) GREEN |
| WB5 | red | `debc40a` | 3-cond emission-channel sentinel probe |
| WB6 | green | `6d8af23` | WB5 3/3 GREEN; WB1 cond (1) GREEN; coarchitect-ipc 6/6 preserved |
| WB7 | green | `de6620e` | WB1 cond (3) GREEN; full T9 ladder 12/12 unit GREEN |
| WB8 | green (this) | (pending push) | Build OK; Phase-3 smoke TARGET-ABSENT/PASS-exit; findings stamp |

8 WBs total (baseline; matches ticket body §4 default path).

---

## §III — Sub-Q resolutions (ADR cross-ref)

| Sub-Q | Resolution | ADR | Rationale |
|---|---|---|---|
| T9-A | (f) skeleton-with-deferred-source [NEW disposition] | MBTWFT9-A | (c) PTY-scrape NON-VIABLE per scenario-5-results.md; (a) needs key-provisioning follow-on; (b) needs §6.6 amendment FORBIDDEN by manifest |
| T9-B | (i) `state.requests?.reset` primary | MBTWFT9-B | RATIFY T4 WB10 default + dispatch P5b operator-direction |
| T9-C | (β) 60s tick | MBTWFT9-C | minute-granularity countdown display |
| T9-D | (i) reuse `coarchitect:rate-limit-update` | MBTWFT9-D | ZERO §6.6 touch (matches manifest FORBIDDEN) |
| T9-E | (α) "Max plan" literal | MBTWFT9-E | RATIFY wireframe target + T4 WB10 default |

---

## §IV — WB2 spike finding (full evidence)

`[KNOWN, docs/spike-evidence/HSO-01/scenario-5-results.md:28-29 + 94-96, dated 2026-05-08]`:

> The `/cost` command surfaces the extra-usage overage meter (overages beyond the flat Max subscription rate), **NOT the weekly rate-limit meter** visible in the Claude.ai interface. ... **Weekly rate-limit meter not accessible from CC CLI**: The `/cost` command surfaces the extra-usage overage meter only. The weekly rate-limit bar (visible in Claude.ai interface, where the operator saw "81% weekly usage") is not surfaced in the CLI.

The PlanTimerText component (`plan-timer-text.tsx:34-49`) consumes `RateLimitState.requests.reset` — X-RateLimit-Requests-Reset semantics (weekly/short-window). CC CLI PTY stream does not emit X-RateLimit-* equivalents continuously; only the per-session token-count status-bar line (already scraped by `tile-token-scraper.ts` at `13b7607`). Continuous-passive PTY-scrape mirror of the token-scraper pattern was the ticket-body `[MODELED]` default; the evidence proves it non-viable for the target data semantic.

Forward dispositions examined at HALT-WB2-POST-SPIKE:

- **(a) workstation-direct Anthropic API ping** — viable but requires Anthropic API key provisioning in workstation env. File NEW Tier 2 follow-on `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` (currently FORBIDDEN to file directly per manifest excluding FOLLOWUPS.md; surfaced here for operator stamp).
- **(b) daemon-side ping** — viable architecturally but requires `WORKSTATION_CONTRACT.md` §6.6 amendment (NEW IPC channel `workstation:plan-timer` or equivalent). FORBIDDEN by phase4-t9-exec manifest at `e5c7c96`; cannot author in this session.
- **(c-monthly) opportunistic `/cost`-interactive PTY scrape** — captures the monthly Max-subscription reset ("Resets Jun 1") which is DIFFERENT semantics from the weekly rate-limit window. Would render "Max plan resets in 19 days" instead of "Max plan resets in 2h 47m" — semantic mismatch with wireframe. NOT recommended.
- **(d) accept STUB** — honest "—" render; no architectural seam; leaves `MB-F-A3` fully open.
- **(f) skeleton-with-deferred-source [NEW]** — adopted per ADR-MBTWFT9-A. Ship aggregator + emitter + mount-wire under §2.3 graceful-degradation pattern (precedent from MB-T-METHODOLOGY-PHASE-3 work just shipped at `a8e9a76`). Null-source default; real source plugs in via follow-on.

---

## §V — Architectural shape shipped

```
┌────────────────────────────────────────────────────────────────────┐
│ rate-limit-aggregator.ts (WB4 GREEN)                               │
│                                                                     │
│   RateLimitSource = { start, stop, onState }   ← pluggable seam    │
│   createRateLimitAggregator({ source })                             │
│     → { getLatestState, start, stop, onUpdate }                    │
│   createNullRateLimitSource()                  ← production default│
└────────────────────────────────────────────────────────────────────┘
                       │ injected at construction
                       ▼
┌────────────────────────────────────────────────────────────────────┐
│ coarchitect-ipc.ts (WB6 GREEN)                                     │
│                                                                     │
│   const rateLimitAggregator = createRateLimitAggregator({          │
│     source: createNullRateLimitSource(),                            │
│   });                                                               │
│                                                                     │
│   ipcMain.handle('coarchitect:getRateLimitState',                   │
│     () => rateLimitAggregator.getLatestState());     ← handler     │
│                                                                     │
│   rateLimitAggregator.onUpdate((state) => {                         │
│     for (const wc of allWebContents.getAllWebContents()) {         │
│       if (!wc.isDestroyed()) {                                      │
│         wc.send('coarchitect:rate-limit-update', state); ← fan-out │
│       }                                                             │
│     }                                                               │
│   });                                                               │
└────────────────────────────────────────────────────────────────────┘
                       │ broadcast channel
                       ▼
┌────────────────────────────────────────────────────────────────────┐
│ preload.mts (UNCHANGED — bridge already exposes onRateLimitUpdate) │
│ chat-shell/mount.ts (WB7 GREEN)                                    │
│                                                                     │
│   resolveRenderPlanTimerText(opts) →                                │
│     opts.renderPlanTimerText                                        │
│     ?? (bridge?.onRateLimitUpdate                                   │
│         ? () => <PlanTimerTextContainer bridge=… />                 │
│         : undefined)                                                │
│                                                                     │
│   PlanTimerTextContainer (plan-timer-text.tsx WB7 GREEN)            │
│     - subscribes to bridge.onRateLimitUpdate at mount               │
│     - ticks nowMs every 60s (ADR-MBTWFT9-C)                         │
│     - renders pure-prop PlanTimerText with latest state             │
└────────────────────────────────────────────────────────────────────┘
```

Plug-points for follow-on:
- **(a) workstation-direct path**: NEW `rate-limit-anthropic-source.ts` exporting `createAnthropicApiSource({ apiKey })` returning `RateLimitSource`; main.ts wires it in place of `createNullRateLimitSource()`.
- **(b) daemon-side path**: NEW `rate-limit-daemon-source.ts` exporting `createDaemonSource({ daemonClient })` polling daemon endpoint; same wiring change at main.ts.

---

## §VI — Test evidence

### §VI.1 — T9 unit probes (12/12 GREEN at WB7)

```
$ pnpm exec vitest run test/unit/chat-shell/probe-mbtwft9-01-current-stub-state.spec.ts \
    test/unit/plan-timer/
Test Files  3 passed (3)
     Tests  12 passed (12)
```

- WB1 RED probe (3 conditions): STUB removed, aggregator module exists, mount auto-wire — ALL GREEN at WB7.
- WB3 RED probe (6 conditions): aggregator factory exports, initial-null state, source→aggregator roundtrip, start/stop forwarding, onUpdate dispose, null-source no-op — ALL GREEN at WB4.
- WB5 RED probe (3 conditions): aggregator imports in coarchitect-ipc, onUpdate→broadcast wire-up, getLatestState handler reference — ALL GREEN at WB6.

### §VI.2 — Consumer non-regression

```
$ pnpm exec vitest run test/unit/coarchitect-ipc/
Test Files  1 passed (1)
     Tests  6 passed (6)
```

### §VI.3 — Workstation typecheck

```
$ pnpm --filter dispatch-workstation typecheck
CLEAN. tsc --noEmit exits 0.
```

### §VI.4 — Build verification

```
$ pnpm --filter dispatch-workstation build
... dist/chat-shell/renderer.js  1.1mb (BUILD_COMPLETE)
```

Bundle inclusion check (T4 WB13 smoke pattern):
- `dist/chat-shell/renderer.js`: 6 hits for plan-timer-text symbols
- `dist/main/coarchitect-ipc.js`: 10 hits for rate-limit-aggregator + broadcast-channel symbols

### §VI.5 — Phase-3 headless smoke

```
$ pnpm --filter dispatch-workstation verify:phase-3-smoke
Phase 3 smoke: TARGET-ABSENT screenshot=…de6620e.png duration=5.3s
```

`[KNOWN]` Outcome classification: **TARGET-ABSENT** (exit 0 — graceful-degradation per §2.3 + recent MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING ship). Electron launched; window rendered; screenshot captured at `docs/coordination/screenshots/de6620e.png` (61KB; gitignored per Sub-Q-D=β at `1dc5e57`).

`[MODELED]` Interpretation: Phase-3 smoke's target sentinel (`frame-c-root` per Phase-3 ticket scope) is absent in current shell — this is a Phase-3-tooling-scope finding, NOT a T9 regression. T9-specific visual validation (plan-timer text renders honest "Max plan resets in —" with bottom-rail layout) requires either operator-manual screenshot OR a Phase-3 extension adding plan-timer-text target — both out of T9 scope.

### §VI.6 — Pre-existing failure class disclosure

`[KNOWN]` per stash-verify cycle pre-WB7:
- `test/unit/chat-shell/probe-01-render-tests.spec.tsx` 7/7 fail with `Invalid Chai property: toBeInTheDocument` + `Found multiple elements` — jest-dom matcher registration / RTL cleanup issue under happy-dom.
- Confirmed PRE-EXISTING (fails identically on `git stash`-applied baseline before WB7 edits).
- Tracked under CLAUDE.md §4.5 `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` class.
- **NOT** re-diagnosed per "Do NOT re-diagnose these per WB" discipline.

---

## §VII — FOLLOWUPS surface (operator stamp required — manifest excludes FOLLOWUPS.md direct edit)

The following rows in `docs/FOLLOWUPS.md` require operator-side stamps; manifest at `e5c7c96` forbids workstation-session edits to that file. Operator applies in a separate manifest-relaxation commit.

| Row | Action | Closing WB | Citation |
|---|---|---|---|
| `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2, FOLLOWUPS:274) | **PARTIAL-STAMP** — infrastructure ARM CLOSED at WB6 `6d8af23`; source-of-truth ARM remains OPEN. Cross-ref NEW follow-on `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` (proposed below). | WB6 (partial) | architectural seam shipped; null-source default per ADR-MBTWFT9-A |
| `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` (Tier 3, T4 WB14 §IX) | **RATIFIED-CLOSED** — `state.requests?.reset` primary confirmed per ADR-MBTWFT9-B + operator-direction dispatch P5b. | WB2 (ratification) | ADR-MBTWFT9-B |
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2, T4 WB14 §IX) | **PARTIAL-STAMP** — PlanTimerText arm CLOSED at WB7 `de6620e`. MaxParallelCounter + BypassPermsIndicator arms remain OPEN (separate Phase 4 follow-ons). | WB7 (partial) | `resolveRenderPlanTimerText` shipped + `PlanTimerTextContainer` |

NEW Tier 2 follow-on to be filed (proposed body):

```
| MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED | T9 shipped architectural seam at de6620e with createNullRateLimitSource default per Sub-Q-T9-A=(f). Closure path: plug a real RateLimitSource via (a) workstation-direct Anthropic API ping (requires NEW MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING follow-on) OR (b) daemon-side ping (requires WORKSTATION_CONTRACT.md §6.6 amendment — currently FORBIDDEN by Phase 4 territorial manifests; revisit post-Round-11). Discoverability anchor: docs/coordination/mb-t-wireframe-t9-decisions-2026-05-12.md ADR-MBTWFT9-A. Tier 2. | MB-T-WIREFRAME-T9 WB8 |
```

Optional NEW Tier 2 follow-on (depends on operator direction on Sub-Q-A=(a) viability):

```
| MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING | Workstation env currently lacks Anthropic API key provisioning; daemon-side ownership is the existing pattern but T9 Sub-Q-A=(a) workstation-direct ping would require key in workstation env. Closure path: operator decides between (i) provision in workstation env (e.g., user-config persistence mirroring splitter-state.ts pattern), (ii) accept (a) non-viable and pursue (b) daemon-side per future §6.6 amendment, or (iii) accept STUB indefinitely. Discoverability anchor: docs/coordination/mb-t-wireframe-t9-findings-2026-05-12.md §IV WB2 spike + §V plug-points. Tier 2. | MB-T-WIREFRAME-T9 WB8 |
```

---

## §VIII — Audit reclassification surface (manifest excludes audit doc — operator stamp required)

`docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §10.7 row "PlanRing placement":
- **From:** SHIPPED-with-stub
- **To:** SHIPPED-with-architectural-seam-and-deferred-source
- **Reason:** T9 ships full data-path infrastructure including aggregator + emitter + mount auto-wire; bottom-rail PlanTimerText now renders via production wiring (PlanTimerTextContainer), not the placeholder em-dash from "no render-prop wired" scenario. The source plug is the only remaining gap, tracked at `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` (proposed).

---

## §IX — Risk register (residual; ticket §8 cross-ref)

`[KNOWN]` Resolved:
- Sub-Q-T9-A=(c) PTY-scrape viability (WB2 spike) — RESOLVED to non-viable; (f) skeleton-with-deferred-source adopted.
- WB6 broadcast-emit race (workstation startup vs webContents creation) — addressed via `wc.isDestroyed()` guard precedent.
- `coarchitect-ipc` consumer non-regression — 6/6 GREEN at WB6.

`[KNOWN]` Carried forward (pre-existing):
- `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` Tier 3 class — chat-shell suite happy-dom matchers; per CLAUDE.md §4.5 NOT re-diagnosed per WB.

`[SPECULATIVE]` Phase 4:
- Operator may revise T9 disposition post-Phase-3-visual-verification per dispatch /tmp/dispatch-p5.txt STATUS FRAMING (revision-cost accepted).
- Operator may prefer Sub-Q-T9-A=(d) accept-STUB framing instead of (f) — pure deletion of WB7 auto-wire + full close of `MB-F-A3` as NOT-FIXABLE-IN-CURRENT-ARCHITECTURE.

---

## §X — Definition-of-done verification

| Item | Status | Evidence |
|---|---|---|
| WB1-WB8 cairn ladder lands; commits pushed to origin | ✓ | `git log origin/main..HEAD` empty after each WB push |
| `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2 CLOSED | PARTIAL ✓ | infrastructure ARM closed at WB6; source ARM tracked at proposed NEW follow-on per §VII |
| `coarchitect:rate-limit-update` broadcasts emitted | ✓ (architecturally) | wire-up shipped at WB6; emits zero times under null-source default per ADR-MBTWFT9-A |
| mount.ts auto-wire for PlanTimerText | ✓ | `resolveRenderPlanTimerText` shipped at WB7 |
| 5-package typecheck CLEAN | dispatch-workstation ✓ verified; other 4 packages not run per WB-scoped discipline (no changes there) | tsc --noEmit exits 0 |
| No regression in shipped probes | ✓ | coarchitect-ipc 6/6; T9 12/12; chat-shell pre-existing failures verified pre-existing via stash cycle |
| WB-final runtime-launch smoke | PARTIAL ✓ | Phase-3 headless smoke launched electron + captured screenshot; T9-specific UX validation requires operator-manual or Phase-3 extension |
| WB-final findings doc + audit reclassification + FOLLOWUPS updates | findings doc ✓ (this); audit + FOLLOWUPS surface in §VII + §VIII for operator stamp | manifest excludes those paths from this session |
| Operator-visible UX | ✓ (honest) | PlanTimerText renders "Max plan resets in —" via real wiring chain; source plumbing deferred per ADR-MBTWFT9-A |

Outcome classification per CLAUDE.md §2.11: **Capability enabled with known limitations** — the data-flow plumbing is architecturally complete; only the data tap is deferred. Honest framing.
