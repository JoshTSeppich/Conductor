# MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG — Production rate-limit source plug closing T9 (f)-skeleton-deferred-source

**Status:** DRAFT (Round 11 §3.9 SPECULATIVE Wave 5)
**Date authored:** 2026-05-13
**Authored under:** operator dispatch — Round 11 Wave 5 c5-ticket-wb1 continuation
**Authoring anchor commit (HEAD at authoring time):** `ff290c2` (WB-final of c5 Wave 2 trinity)
**Manifest:** `docs/coordination/territorial-manifests/c5-t9-rate-limit-source.txt`
**Cairn ladder anchor:** Cluster F per P3-rev-2 §3.2 — closes MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW ADR-MBTWFT9-A `(f)` deferred-source disposition (T9 findings `mb-t-wireframe-t9-findings-2026-05-12.md` §VII row 1).

**SPECULATIVE Phase-4 status:** `[SPECULATIVE per Round 11 §3.9 STATUS FRAMING]` — Phase 3 visual-verification not yet triggered. Operator may RATIFY / RESHAPE / DISCARD post-Phase-3.

**Closes / advances:**
- `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` (Tier 2 — surfaced at T9 findings §VII row 1; pending operator stamp) — **primary closure target** (source-arm of `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO`).
- `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2 — FOLLOWUPS.md:274) — full closure post-plug (infrastructure arm closed at T9 WB6; source arm closed by this ticket).

**Depends on (all merged):**
- T9 ladder shipped at `afd3778` — `rate-limit-aggregator.ts` exports `RateLimitSource` interface + `createNullRateLimitSource()` default; `coarchitect-ipc.ts:94` constructs the aggregator with the null-source.
- T9 decisions `mb-t-wireframe-t9-decisions-2026-05-12.md` ADR-MBTWFT9-A enumerates (a)/(b)/(c-monthly)/(d) source paths.

**Downstream gates:**
- 1-line plug at `coarchitect-ipc.ts:95` (replace `createNullRateLimitSource()` with `createCoarchitectRateLimitSource(...)`) — **OUT of c5-ticket-wb1-t9-rate-limit territory per manifest (coarchitect-ipc.ts FORBIDDEN)**. Authored as a separate chore-commit by a downstream session (or operator-direct edit) once this ticket ships source modules + tests + docs.

**Estimated WB count:** 5 baseline (1 docs + 2 RED + 2 GREEN + 1 WB-final).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (architectural constraint) first.
2. Read §3 (Sub-Q gates) — five operator decisions parameterize the WB ladder; defaults `[MODELED]` recommendations marked.
3. Read §4 (WB ladder) for execution order.
4. §5-§8 are operational supports — risk register + cross-refs + plug instructions + DOD.

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` observed in this session via direct source read at HEAD `ff290c2`; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence — especially binding for the Anthropic API endpoint behavior assumptions until WB-final operator-spike-or-runtime-verify.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED via dispatch wording "coarchitect-rate-limit-source production wiring"]`:

1. **Ships a production `RateLimitSource` implementation** — `createCoarchitectRateLimitSource()` in NEW `packages/dispatch-workstation/src/main/coarchitect-rate-limit-source.ts`. The source pings Anthropic API on a configurable interval, parses rate-limit response headers, and emits `RateLimitState` via the `onState` callback.

2. **Ships a header-parser pure-fn** — `parseAnthropicRateLimitHeaders(headers): RateLimitState | null` in NEW `packages/dispatch-workstation/src/main/rate-limit-source.ts`. Reads the Anthropic-documented `anthropic-ratelimit-*` response headers (e.g., `anthropic-ratelimit-requests-limit`, `anthropic-ratelimit-requests-remaining`, `anthropic-ratelimit-requests-reset`, …) and constructs a `RateLimitState` shaped per `chat-shell/ring-helpers.ts:38-43`.

3. **Provides deps-injection seams** — `createCoarchitectRateLimitSource()` accepts injected `fetchFn`, `setIntervalFn`, `clearIntervalFn`, `apiKey`, `pollIntervalMs`, `endpointUrl` so:
   - Tests can substitute fakes (no real network).
   - Production wiring can pass `globalThis.fetch` + `globalThis.setInterval` + env-derived API key.
   - Operators can override `endpointUrl` (`https://api.anthropic.com/v1/models` default) if Anthropic API base URL changes.

4. **Surfaces a downstream-plug instruction** — WB-final coord doc enumerates the 1-line edit at `coarchitect-ipc.ts:95` that a downstream session must execute to flip the production aggregator from null-source to coarchitect-source.

### §1.2 — What this ticket DOES NOT

`[KNOWN]` per manifest constraints:

- Does NOT modify `coarchitect-ipc.ts` (FORBIDDEN per manifest) — production plug is a downstream 1-line edit.
- Does NOT modify `rate-limit-aggregator.ts` (FORBIDDEN per manifest) — `RateLimitSource` interface is consumed via type-import only.
- Does NOT modify `main.ts`, `preload.mts`, `chat-shell/plan-timer-text.tsx`, or any renderer-side surface (FORBIDDEN per manifest or out-of-scope).
- Does NOT add `@anthropic-ai/sdk` dependency — uses native `fetch` to call the Anthropic REST API directly (avoids package.json mutation; `package.json` not in c5-t9-rate-limit-source territory).
- Does NOT add Anthropic API key provisioning / persistence infrastructure — operator provides key via env var `ANTHROPIC_API_KEY` at workstation runtime. Persistence (user-config storage of API key) is `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` Tier 2 (T9 findings §VII row 2) — separate ticket.
- Does NOT modify daemon (FORBIDDEN per manifest) — workstation-direct path per Sub-Q-T9PLUG-A=(a).
- Does NOT modify `WORKSTATION_CONTRACT.md` §6 (FORBIDDEN per manifest) — no new IPC channel; existing `coarchitect:rate-limit-update` broadcast carries the data once source emits.
- Does NOT spike the Anthropic API endpoint behavior live (no network access in this session) — header shape assumed from Anthropic docs `[MODELED]`; operator runtime-verifies post-plug.
- Does NOT close `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` Tier 2 (key persistence/UI is separate scope).

---

## §2 — Architectural constraint

### §2.1 — c5 territory + RateLimitSource interface

`[KNOWN]` per direct-read of `rate-limit-aggregator.ts:48-60` at HEAD `ff290c2`:

```typescript
export interface RateLimitSource {
  start(): void;
  stop(): void;
  onState(cb: (state: RateLimitState) => void): () => void;
}
```

`createRateLimitAggregator({ source })` subscribes once to `source.onState` at construction; downstream consumers (`coarchitect:getRateLimitState` IPC handler + `coarchitect:rate-limit-update` broadcast emitter) read from / fan out via the aggregator.

c5 territory ships:
- A type-compatible `RateLimitSource` implementation (`createCoarchitectRateLimitSource`).
- A pure-fn header parser (`parseAnthropicRateLimitHeaders`).

### §2.2 — The plug step (OUT of c5 territory)

`[KNOWN]` per direct-read of `coarchitect-ipc.ts:94-96`:

```typescript
export const rateLimitAggregator = createRateLimitAggregator({
  source: createNullRateLimitSource(),
});
```

The c5-territory-OUT plug:

```typescript
// downstream chore-commit (NOT in c5 territory):
import { createCoarchitectRateLimitSource } from './coarchitect-rate-limit-source.js';

export const rateLimitAggregator = createRateLimitAggregator({
  source: createCoarchitectRateLimitSource({
    apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
  }),
});
```

(plus `rateLimitAggregator.start()` from main.ts at app-ready time; also OUT of c5 territory).

c5 work is "production-ready source module"; the 1-line plug is a downstream chore. Per §2.11 outcome classification: **"Capability enabled with known limitations"** — source is production-quality + tested; full closure of `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` requires the downstream plug.

### §2.3 — Test isolation (deps-injection)

All non-pure-fn behavior (`fetch`, `setInterval`, `clearInterval`) flows through deps-injection so tests use fakes. Pre-§2.8 spike-required surface (the actual Anthropic API contract) is observable only at runtime by operator; tests cover code paths assuming documented API behavior.

---

## §3 — Sub-Q gates

### §3.1 — Sub-Q-T9PLUG-A: Source-of-truth path

Required before **WB4** (source probe). Default if unresolved: **(a) workstation-direct Anthropic API ping**.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (a) workstation-direct Anthropic API ping (recommended) | NEW `coarchitect-rate-limit-source.ts` uses `fetch` against `https://api.anthropic.com/v1/models` (cheap GET; rate-limit headers attached per Anthropic API docs `[MODELED]`). Operator provides key via `ANTHROPIC_API_KEY` env var. | NONE (existing `coarchitect:rate-limit-update` broadcast channel carries data) | LOW-MEDIUM — header parser + fetch + interval + tests |
| (b) daemon-side ping | daemon owns Anthropic API call; workstation thin-client polls daemon | YES — daemon route + §6.6 amendment | HIGH (FORBIDDEN by c5 manifest — defers to separate ticket post-§6.6) |
| (d) accept-STUB indefinitely | Keep `createNullRateLimitSource()`; close `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` as NOT-FIXABLE-IN-CURRENT-ARCHITECTURE per CLAUDE.md §2.11 | NONE | ZERO |

`[MODELED]` Recommend **(a)**. Operator dispatch wording "coarchitect-rate-limit-source production wiring" implies (a) — naming convention `coarchitect-` prefix matches the historical owner of Anthropic API surface in workstation (pre-HSO-WIRE WB14a). (b) is forbidden by manifest. (d) is the conservative fallback if (a) header behavior turns out non-existent at runtime.

### §3.2 — Sub-Q-T9PLUG-B: Anthropic API endpoint

Required before **WB4**. Default if unresolved: **(β) GET `/v1/models`**.

| Option | Endpoint | Cost characteristic | Rate-limit-headers exposure |
|---|---|---|---|
| (α) POST `/v1/messages` minimal tokens | 1-token-input + 1-token-output | $0.0001/call ≈ free at 60s cadence ($0.0144/day); model invocation counts toward requests-dimension | All `anthropic-ratelimit-*` headers `[MODELED]` |
| (β) GET `/v1/models` (recommended) | List available models | $0 (no model invocation) | All `anthropic-ratelimit-*` headers `[MODELED — operator verifies at runtime]` |
| (γ) POST `/v1/messages/count_tokens` | Token counting (no model invocation) | $0 | Unknown — may or may not return rate-limit headers `[SPECULATIVE]` |
| (δ) Operator-config endpoint | Pluggable via `endpointUrl` deps field | Depends on selection | Operator-arbitrated runtime |

`[MODELED]` Recommend **(β)** for zero-cost + no model invocation. If runtime spike reveals (β) does NOT return rate-limit headers, escalate to (α) (cheap but non-zero cost) or (γ). Source code defaults to (β) but accepts override via `endpointUrl` dep field so operator can flip at plug-time without code change.

### §3.3 — Sub-Q-T9PLUG-C: API key source

Required before **WB4**. Default if unresolved: **(i) env var `ANTHROPIC_API_KEY`**.

| Option | Source | Persistence |
|---|---|---|
| (i) Env var `ANTHROPIC_API_KEY` (recommended) | `process.env['ANTHROPIC_API_KEY']` at workstation startup | Operator-managed env (shell rc, launch script, etc.) |
| (ii) User-config persistence | NEW state module mirroring `splitter-state.ts` raw `fs` pattern; operator UI to enter key | NEW Tier 2 followup `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` |
| (iii) Both (i) then (ii) fallback | env var preferred; user-config persistence as fallback when env absent | Combined |

`[MODELED]` Recommend **(i)** for minimum-scope ship. (ii)/(iii) is `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` Tier 2 territory (T9 findings §VII row 2) — separate ticket. c5 source accepts `apiKey: string` deps field; plug-time reads `process.env['ANTHROPIC_API_KEY']`.

### §3.4 — Sub-Q-T9PLUG-D: Poll cadence

Required before **WB4**. Default if unresolved: **(β) 60s** (RATIFY ADR-MBTWFT9-C=(β)).

| Option | Cadence | API call rate |
|---|---|---|
| (α) Short interval (10s/30s) | Frequent updates | High (8640/day @ 10s) — wasteful at minute-granularity display |
| (β) 60s interval (recommended) | Matches countdown minute-granularity display | 1440 calls/day |
| (γ) Adaptive (60s when active session, 5min idle) | Conserves API quota when idle | ~500/day (estimated) |
| (δ) Operator-config | `pollIntervalMs` deps field | Operator-arbitrated |

`[MODELED]` Recommend **(β)** — RATIFY ADR-MBTWFT9-C=(β). c5 source defaults to 60000 ms; accepts override via `pollIntervalMs` dep.

### §3.5 — Sub-Q-T9PLUG-E: Error handling semantics

Required before **WB4**. Default if unresolved: **(i) Silent-degradation (no emission on error; no throw; preserve last-good state in aggregator)**.

| Option | 401 auth-fail | Network failure | 5xx server error | Quota-exceeded (429) |
|---|---|---|---|---|
| (i) Silent-degradation (recommended) | No emission; no throw | No emission; no throw | No emission; no throw | No emission; no throw (rate-limit data is itself the value — circular dependency) |
| (ii) Console.warn on error | Log via console.warn; no emission | Log; no emission | Log; no emission | Log; no emission |
| (iii) Re-throw on auth-fail (operator-visible) | Throw → main process logs visible to operator | No emission | No emission | No emission |

`[MODELED]` Recommend **(i)**. Rationale:
- Plan-timer is a non-critical display surface; silent-degradation matches graceful-degradation pattern used elsewhere (cost-meter null, plan-timer "—" copy).
- Operator can verify wiring via electron devtools network panel or `coarchitect:getRateLimitState` IPC return (null = source has not emitted; non-null = source emitted at least once).
- (ii) console.warn pollutes main-process logs at 1440/day if auth permanently broken.
- (iii) re-throw could destabilize the interval scheduler.

---

## §4 — WB ladder

| WB | Type | Description |
|---|---|---|
| WB1 | docs | this ticket body (commit current) |
| WB2 | red | probe-mbtphase4-t9plug-01-header-parser.spec.ts (≈8 conditions on parseAnthropicRateLimitHeaders) |
| WB3 | green | rate-limit-source.ts shipping parseAnthropicRateLimitHeaders (flips WB2 GREEN) |
| WB4 | red | probe-mbtphase4-t9plug-02-source.spec.ts (≈10 conditions on createCoarchitectRateLimitSource with deps-injected fakes) |
| WB5 | green | coarchitect-rate-limit-source.ts shipping createCoarchitectRateLimitSource (flips WB4 GREEN) |
| WB-final | docs | coord-phase4-t9plug-2026-05-13.md + mb-t-phase-4-t9-rate-limit-source-plug-findings-2026-05-13.md + ADR-MBTPHASE4-T9PLUG-A (path selection) |

§4.6 runtime-launch smoke NOT applicable — c5 work is pure-fn module + class shipping; no `src/main/main.ts` wiring touch. The plug at `coarchitect-ipc.ts:95` (downstream) will need its own smoke.

---

## §5 — Risk register

| Risk | Severity | Confidence | Mitigation |
|---|---|---|---|
| Anthropic API endpoint does not return `anthropic-ratelimit-*` headers on `/v1/models` | High | `[MODELED-MEDIUM]` | `endpointUrl` deps override allows runtime flip to (α) POST `/v1/messages` without code change |
| Anthropic API header field names differ from `[MODELED]` assumption | Medium | `[SPECULATIVE]` | `parseAnthropicRateLimitHeaders` is pure-fn + tested; trivially adjustable |
| Operator has no `ANTHROPIC_API_KEY` in env at plug-time | Low (graceful-degradation) | `[KNOWN]` | Source emits nothing; aggregator stays null; PlanTimerText renders "—" (existing fallback) |
| Anthropic API auth changes (Bearer vs x-api-key header) | Medium | `[MODELED]` | Source uses documented `x-api-key` header; if API moves to Bearer, 1-line code change |
| Polling at 60s exhausts low-quota plans | Low | `[MODELED]` | 1440 calls/day on `/v1/models` is below Free-tier quota; configurable via `pollIntervalMs` |
| Source plug never lands (downstream session forgets) | Medium | `[KNOWN]` | WB-final findings doc explicitly enumerates the 1-line plug; tracked as TASK in coord-phase4-t9plug doc |

---

## §6 — Cross-refs

- T9 ladder: `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW_BUILD.md`
- T9 decisions (ADR-MBTWFT9-A `(f)`): `docs/coordination/mb-t-wireframe-t9-decisions-2026-05-12.md`
- T9 findings (§VII followup surface): `docs/coordination/mb-t-wireframe-t9-findings-2026-05-12.md`
- P3-rev-2 Cluster F: `docs/coordination/phase-4-tier-1-roadmap-rev-2-2026-05-12.md` §3.2
- RateLimitState type: `packages/dispatch-workstation/src/chat-shell/ring-helpers.ts:26-43` (READ-ONLY consulted)
- RateLimitSource interface: `packages/dispatch-workstation/src/main/rate-limit-aggregator.ts:48-60` (FORBIDDEN to modify; type-import OK)
- bypass-perms-source pattern precedent: `packages/dispatch-workstation/src/main/bypass-perms-source.ts` (`3fef80d`)

---

## §7 — Downstream plug instructions

**1-line edit at `coarchitect-ipc.ts:95` (FORBIDDEN to c5; chore-commit OR operator-direct edit):**

```diff
-import {
-  createRateLimitAggregator,
-  createNullRateLimitSource,
-} from './rate-limit-aggregator.js';
+import { createRateLimitAggregator } from './rate-limit-aggregator.js';
+import { createCoarchitectRateLimitSource } from './coarchitect-rate-limit-source.js';

 // ...

 export const rateLimitAggregator = createRateLimitAggregator({
-  source: createNullRateLimitSource(),
+  source: createCoarchitectRateLimitSource({
+    apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
+  }),
 });
```

**Plus a `start()` call** somewhere in main.ts post-app-ready:

```typescript
rateLimitAggregator.start();
```

Both edits are out of c5 territory. WB-final findings doc reiterates this for the downstream session.

---

## §8 — Definition of Done

- [ ] WB1 ticket body committed (this).
- [ ] WB2 RED probe authored — ≥6 header-parser conditions failing.
- [ ] WB3 GREEN — rate-limit-source.ts shipped; WB2 RED → GREEN; existing tests un-regressed.
- [ ] WB4 RED probe authored — ≥8 source-factory conditions failing.
- [ ] WB5 GREEN — coarchitect-rate-limit-source.ts shipped; WB4 RED → GREEN; existing tests un-regressed.
- [ ] WB-final coord doc + findings doc + ADR-MBTPHASE4-T9PLUG-A committed.
- [ ] All cairn-grammar commits use per-path `git commit -- <pathspec>` (operator Phase 1 reinforcement (d), c5 Wave 2 discipline).
- [ ] Per-cairn-commit push to origin/main per §2.6.
- [ ] §2.11 honest framing: "Capability enabled with known limitations" — source ready to plug; downstream 1-line edit pending.
