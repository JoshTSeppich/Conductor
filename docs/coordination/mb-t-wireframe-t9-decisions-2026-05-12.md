# MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW — decisions doc

**Authored:** 2026-05-12 (Round 11 §3.9 SPECULATIVE phase4-t9-exec session)
**Authoring anchor commit:** post-`e5c7c96` (manifest expansion to workstation-side)
**Cairn ladder anchor:** WB1 RED shipped at `85ed1e9`; this doc captures WB2 SPIKE arbitration + Sub-Q resolutions.

---

## ADR-MBTWFT9-A — Sub-Q-T9-A rate-limit source-of-truth (Phase 4 SPECULATIVE)

### Status

`[KNOWN per direct-read of cited evidence]` — (c) PTY-scrape NON-VIABLE for weekly rate-limit-window data; adopt (f) skeleton-with-deferred-source per §2.3 graceful-degradation discipline.

### Context

Ticket §3.1 enumerates four source options:

- (a) workstation-direct Anthropic API ping
- (b) daemon-side Anthropic API ping
- (c) PTY-scrape from CC CLI plan-bar (recommended default; SPIKE-FIRST per CLAUDE.md §2.8)
- (d) accept STUB (honest "—" render)

`RateLimitState.requests.reset` (consumed by `PlanTimerText` at `plan-timer-text.tsx:38-49`) expects an Anthropic API `X-RateLimit-Requests-Reset`-equivalent semantic — i.e. weekly/short-window rate-limit reset timing, not monthly billing reset.

### Evidence

`[KNOWN, docs/spike-evidence/HSO-01/scenario-5-results.md:28-29 + 94-96, dated 2026-05-08]`:

> The `/cost` command surfaces the extra-usage overage meter (overages beyond the flat Max subscription rate), NOT the weekly rate-limit meter visible in the Claude.ai interface. ... **Weekly rate-limit meter not accessible from CC CLI**: The `/cost` command surfaces the extra-usage overage meter only. The weekly rate-limit bar (visible in Claude.ai interface, where the operator saw "81% weekly usage") is not surfaced in the CLI.

`[KNOWN, packages/dispatch-workstation/src/main/tile-token-scraper.ts:1-84]`: PTY-scrape pattern is continuous-passive (subscribes to `IConsoleBroadcaster.addStdoutObserver`; sees every byte streamed from the child CC CLI). The token-count regex `/([0-9]+) tokens/` extracts the status-bar count that CC CLI continuously prints in its status line — different from `/cost` which is interactive-on-demand and prints only when the user types the slash command.

### Decision

Adopt **(f) skeleton-with-deferred-source** — a NEW disposition synthesized from the manifest + evidence constraints:

1. WB4 GREEN ships `packages/dispatch-workstation/src/main/rate-limit-aggregator.ts` with a `RateLimitSource` interface and a `createRateLimitAggregator({ source })` factory.
2. Production default source is a **null-source** (`createNullRateLimitSource()`) that never emits — aggregator state stays `null` indefinitely.
3. WB6 GREEN wires `coarchitect-ipc.ts:94` to `() => aggregator.getLatestState()` (returns `null` until source plumbed) AND registers `aggregator.onUpdate(...)` → `webContents.send('coarchitect:rate-limit-update', state)` broadcast (fires zero times until source plumbed).
4. WB7 GREEN auto-mounts `PlanTimerText` via `resolveRenderPlanTimerText` — renders honest `Max plan resets in —` placeholder until source plumbed.
5. Follow-on ticket plugs a real source into the stable architectural seam — (a) workstation-direct Anthropic ping with NEW `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` follow-on, OR (b) daemon-side ping behind `WORKSTATION_CONTRACT.md` §6.6 amendment (currently FORBIDDEN by phase4-t9-exec manifest), OR refined (c) via opportunistic `/cost`-interactive scrape if operator wants monthly-reset semantics.

### Consequences

`[KNOWN]`:

- WB1 RED probe (`probe-mbtwft9-01-current-stub-state.spec.ts` at `85ed1e9`) flips GREEN as designed — all three conditions (STUB removed, aggregator module exists, `resolveRenderPlanTimerText` symbol present in `mount.ts`) satisfied by the skeleton.
- `coarchitect:rate-limit-update` broadcast channel **revived** (architecturally) — the post-HSO-WB14a `broadcastRateLimitUpdate` removal is reauthored in shape, even though the source is null. Both `PlanTimerText` (new mount auto-wire) and `PlanUsageRing` (existing `mount.ts:418-422` subscription) receive updates from the new emitter once source plumbed.
- **`MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2)** transitions from **CLOSED** (data-path silent post-WB14a) → **PARTIAL — infrastructure ARM CLOSED; source-of-truth ARM remains OPEN**. The structural finding it tracks is now half-resolved.
- **`MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2)** PlanTimerText arm transitions from **OPEN** → **CLOSED** at WB7. MaxParallelCounter + BypassPermsIndicator arms remain OPEN.
- **`MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` (Tier 3)** transitions to **RATIFIED** per Sub-Q-T9-B=(i) — see ADR-MBTWFT9-B below.
- **NEW Tier 2 follow-on** to be filed: `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` — captures (a)/(b)/(c-monthly-via-cost-cmd) path-of-source as future work; the WB4 aggregator factory accepts an injected `RateLimitSource` so plugging a real source is an additive change.
- UX: bottom-rail plan-timer continues to render `Max plan resets in —` until source plumbed. This matches §2.11 outcome classification **"Capability enabled with known limitations"** — the data-flow plumbing is architecturally complete; only the data tap is deferred.

`[SPECULATIVE]`:

- Operator may revise this ADR post-Phase-3-visual-verification per dispatch /tmp/dispatch-p5.txt STATUS FRAMING (revision-cost accepted).
- Operator may prefer Sub-Q-T9-A=(d) accept-STUB framing instead — pure deletion of WB7 auto-wire and full close of `MB-F-A3` as **NOT-FIXABLE-IN-CURRENT-ARCHITECTURE**. (f) is the more forward-positioned disposition; (d) is the more conservative one.

---

## ADR-MBTWFT9-B — Sub-Q-T9-B dimension selection

### Status

`[KNOWN]` — RATIFY ticket-body `[MODELED]` default per operator-direction in dispatch /tmp/dispatch-p5.txt P5b.

### Decision

**(i) `state.requests?.reset` primary (RATIFY T4 WB10 default)**. Matches existing `plan-timer-text.tsx:34-49` resolver. Closes `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` Tier 3.

### Consequences

- Component unchanged.
- Fallback ladder (`tokens.reset`) preserved per current resolver.
- Sub-Q-B=(iv) "new plan dimension" remains `[SPECULATIVE]`; deferred until Anthropic API exposes one.

---

## ADR-MBTWFT9-C — Sub-Q-T9-C poll cadence

### Status

`[KNOWN]` — RATIFY ticket-body `[MODELED]` default.

### Decision

**(β) 60s interval** — matches minute-granularity countdown display. With (f) null-source the cadence is dormant (aggregator's `start()` does nothing). Once a real source is plugged, 60s is the default refresh.

`mount.ts` `setInterval(60_000)` on `nowMs` refresh is independent and lives in the consumer closure — it makes the rendered countdown text update once per visible minute change, regardless of source cadence.

---

## ADR-MBTWFT9-D — Sub-Q-T9-D emission channel

### Status

`[KNOWN]` — RATIFY ticket-body `[MODELED]` default.

### Decision

**(i) Reuse existing `coarchitect:rate-limit-update`**. Mirrors the removed `broadcastRateLimitUpdate` pattern from MB-T-HSO-WIRE WB14a. Renderer-side subscriber surface unchanged (`preload.mts:79` `onRateLimitUpdate` bridge + `PlanUsageRing` existing subscription).

### Consequences

- ZERO `WORKSTATION_CONTRACT.md` §6.6 touch — matches manifest FORBIDDEN list (the contract path is explicitly excluded).
- (ii) `workstation:plan-timer` NEW channel deferred — would require manifest expansion + separate `contract:` commit.

---

## ADR-MBTWFT9-E — Sub-Q-T9-E plan-name surfacing

### Status

`[KNOWN]` — RATIFY ticket-body `[MODELED]` default.

### Decision

**(α) "Max plan" literal** — matches `plan-timer-text.tsx:69` hardcoded text + wireframe target. No component change.

---

## Manifest constraint note

`[KNOWN, docs/coordination/territorial-manifests/phase4-t9-exec.txt at e5c7c96]`:

- `docs/FOLLOWUPS.md` is FORBIDDEN — FOLLOWUPS row stamps surfaced via this decisions doc + WB8 findings doc; operator applies stamps in a separate manifest-relaxation commit.
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` is NOT in territory — audit reclassification surfaced in WB8 findings doc; operator applies in separate commit.
- `packages/dispatch-workstation/src/main/hso-pool.ts` FORBIDDEN — `RateLimitSource` interface accepts an injected source dependency at aggregator construction time; main.ts wires `createNullRateLimitSource()` by default. No hso-pool touch needed.
