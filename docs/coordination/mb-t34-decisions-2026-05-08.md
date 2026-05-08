# MB-T34 Decisions — Anthropic API client (workstation)

**Terminal:** D (parallel-cairn 4-session run, Round 4)
**Date:** 2026-05-08
**Companion to:** `docs/coordination/mb-t34-diagnose-2026-05-08.md`
**Status:** Phase 1 dispositions PENDING operator markup. Operator acks (or flips) each Q-MBT34-N + R-MBT34-N before WB1.

This doc is the operator-skim review surface. Full inventory + risks + spike result + prose live in the diagnose doc; here, each question gets one row with the tentative disposition + the option set + a one-line rationale.

---

## Spike result (one-line summary; full detail in diagnose §III)

[KNOWN] **Headers ARE exposed via `apiPromise.withResponse()` on streaming `/v1/messages`.** 13 anthropic-ratelimit headers + request-id + organization-id captured. No `retry-after` on 200-OK (will fixture-test). No `anthropic-priority-*` (priority-tier-only). No separate "Max plan budget" header — standard rate-limit headers ARE the plan-usage data Terminal B needs.

**Cross-session signal:** **Terminal B (MB-T25) — green light.** Proceed with full ring widget impl against the data contract in diagnose §VIII.

---

## Q-MBT34-N — open questions + tentative dispositions

| ID | Question | Options | Tentative | Rationale (1 line) |
|---|---|---|---|---|
| Q-MBT34-1 | **File-extend vs new-file for new API client surface** | (a) extend `anthropic-client.ts` with sentinel zone / (b) new sibling `anthropic-api-client.ts` for non-chat-flow only / (c) split: low-level `AnthropicAPIClient` + chat-client composes it | **(c)** | Clean separation: transport+headers+retry+key-loading in API client; chat client becomes thin composition wrapper preserving MB-T26 onUsage signature. |
| Q-MBT34-2 | **Header exposure surface to consumers** | (a) attach to UsageInfo / (b) `getRateLimitState()` accessor / (c) `onRateLimit?` callback | **(b) + (c)** | Accessor for snapshot reads (Terminal B reads at any time); callback for push-driven UI updates. Both wire to same internal state. |
| Q-MBT34-3 | **API key source migration** | (a) replace env-var entirely / (b) file-first with env-var fallback / (c) new factory alongside existing | **(b)** | File-first preserves dev/test workflows that set ANTHROPIC_API_KEY; production path uses file. New tiny `loadApiKey()` utility. |
| Q-MBT34-4 | **Retry policy** | (a) exp backoff w/ jitter, max 3, respect retry-after / (b) (a) + circuit breaker / (c) operator-pluggable | **(a)** | Match Anthropic recommendation. Circuit breaker + pluggable policy are over-scope for v3.0. |
| Q-MBT34-5 | **Where retry logic lives** | (a) inside `AnthropicAPIClient.streamMessage` / (b) external decorator / (c) lean on SDK built-in | **(a)** | SDK has built-in retry on transport errors but NOT on 429 stream-mid; we need our own outer retry that re-creates the stream. |
| Q-MBT34-6 | **RateLimitState shape** | (a) flat / (b) nested per-bucket / (c) Map keyed by dimension | **(b)** | `state.tokens.remaining / state.tokens.limit` reads cleanly for Terminal B's ring rendering. ISO strings for safe IPC serialization. |
| Q-MBT34-7 | **Test fixture format** | (a) hand-written JSON RawMessageStreamEvent arrays / (b) recorded SSE bytes / (c) inline objects | **(a)** | JSON arrays match the parsed type contract; mock the async iterable, NOT the SDK — exercises real parser. |
| Q-MBT34-8 | **WB count** | (a) 6 WBs (matches §3 ladder) / (b) 8 WBs (split parser+integration, client+factory) / (c) 4 WBs collapsed | **(a)** | One acceptance criterion per WB. 6 WBs ≈ Round 3 ticket size; matches prompt §3 suggested split. |
| Q-MBT34-9 | **onUsage cache-token enrichment** | (a) preserve signature; new `onCacheUsage?` / (b) extend UsageInfo additively / (c) leave for v3.1 followup | **(c)** | Out of scope for MB-T34. MB-T25 needs rate-limit headers; MB-T26 already has token-cost. **Operator may flip to (b) at HALT 0** if a 1-line additive change is desirable. |
| Q-MBT34-10 | **Sentinel zone strategy in `coarchitect-ipc.ts`** | (a) leave existing MB-T26 zone untouched, new zone if wiring changes / (b) signature additive ⇒ no IPC changes / (c) signature changes ⇒ new MB-T34 sentinel zone | **(b)** | Q-MBT34-2=(b)+(c) is purely additive; chat-flow can ignore `onRateLimit?`. **Surface to operator:** if Terminal B wants plan-usage state via renderer IPC (not main-internal), new IPC channel is needed — out-of-scope additive contract change requiring operator arbitration. |
| Q-MBT34-11 | **Live-API smoke test runtime** | (a) gated under `RUN_LIVE_API=1` / (b) always runs / (c) fixture-replay only | **(a)** | Avoid burning request budget on every CI run. WB6 ships gated live-smoke + fixture-replay coverage. |

---

## R-MBT34-N — risks + dispositions

| ID | Risk | Severity | Disposition |
|---|---|---|---|
| R-MBT34-1 | `withResponse()` requires un-awaited APIPromise; subtle bug if developer awaits first | LOW (type system enforces) | **MITIGATE: explicit code comment + spike-confirmed call shape; type system rejects `(stream).withResponse()` because Stream lacks the method.** |
| R-MBT34-2 | Existing `streamMessages` signature change could regress MB-T26 chat-flow | HIGH if signature breaks | **MITIGATE: refactor strategy preserves AnthropicChatClient.streamMessages signature; internally composes new lower-level client. Run MB-T26 cost-meter probes (probe-01 + probe-02) as regression suite at WB2+ per prompt §4.** |
| R-MBT34-3 | Retry on stream-mid 429 doubles cumulative usage | MEDIUM | **ACCEPT via scope: outer retry handles ONLY pre-stream errors. Stream-mid errors propagate to caller; no auto-retry mid-stream. Documented in code; tested via fixture WB3.** |
| R-MBT34-4 | Stale RateLimitState read by consumer | LOW | **MITIGATE: include `capturedAt: string` ISO timestamp in RateLimitState. UI consumers decide staleness threshold.** |
| R-MBT34-5 | API key file disappears between sessions | LOW | **MITIGATE: typed `ApiKeyNotConfiguredError`; factory returns null + logs to main-process console. Existing env-var-null path is precedent.** |
| R-MBT34-6 | `t26-t27-coord.md` may need MB-T34 entry if onUsage path changes shape | LOW (MODELED unchanged) | **DEFER to WB6 — read coarchitect-ipc.ts at WB2; if shape changes, append MB-T34 row at WB6.** |
| R-MBT34-7 | Live-API smoke could fail on network-hostile CI | LOW under (Q-MBT34-11=a) | **MITIGATE via gating; WB6 fixture replay always runs.** |
| R-MBT34-8 | Spike used haiku-4-5 not sonnet-4-6; header shape model-specific? | ZERO | **[KNOWN] headers are response-level not model-specific per spike + Anthropic docs. WB6 live-smoke uses CHAT_MODEL for parity.** |
| R-MBT34-9 | Worktree isolation: can't read Terminal B's MB-T25 in-progress branch | LOW | **MITIGATE: contract surface (RateLimitState shape) surfaced via this diagnose doc; Terminal B reads post-merge. Additive fields only if shape adjustment needed.** |
| R-MBT34-10 | dispatch-core dist rebuild (CLAUDE.md §3.4) | ZERO | **NO SCHEMA SPINE INGRESS.** MB-T34 is workstation-only. |
| R-MBT34-11 | Runtime-launch smoke as merge gate (CLAUDE.md §4.6) | HIGH if skipped | **WB6 RUNS SMOKE — `WINDOW_READY` ≤ 10s — before findings doc.** |
| R-MBT34-12 | Test directory layout per CLAUDE.md §3.6 | ZERO | **New tests at `test/unit/anthropic-api-client/probe-NN-*.spec.ts`; fixtures at `test/fixtures/anthropic/`.** |
| R-MBT34-13 | esbuild script (CLAUDE.md §3.7) | ZERO | **No new renderer surface; main-process only. No build script needed.** |
| R-MBT34-14 | Pre-existing test failures (CLAUDE.md §4.5) | ZERO new | **NOT RE-DIAGNOSED.** Noted in WB6 verification surface as expected. |
| R-MBT34-15 | Push-rebase contention with parallel terminals A/B/C on shared origin | LOW | **MITIGATE via atomic-chain `git pull --rebase --autostash` at top of every commit (per prompt §1.4); per-session worktree isolation makes index-race structurally impossible.** |
| R-MBT34-16 | API key leakage into commit body / log / chat output | HIGH | **MITIGATE: spike script reads via `fs.readFileSync(...).trim()` and never echoes; spike-result JSON contains org-id and request-id which are redacted to `<redacted>` in committed docs; spike script is committed as `scripts/mb-t34-spike.cjs` (operator-runnable for verification, no key in source).** |

---

## Cross-session coordination questions (operator-arbitrated)

**C-MBT34-1:** Terminal B (MB-T25) data contract — does Terminal B consume `RateLimitState` via:
- **(a)** main-process direct call (Terminal B's ring widget renders in main-process? unlikely) — N/A
- **(b)** new IPC channel `workstation:rate-limit-state-updated` (renderer subscribes; main pushes on each `onRateLimit`) — requires preload.mts edit + new IPC contract
- **(c)** Terminal B reads via existing IPC seam (e.g., the same IPC channel that `onUsage` flows through) — extends existing MB-T26 IPC

**Tentative:** **(c)** — extend existing `onUsage`-style IPC additively to also carry `rateLimitState`. Zero new IPC contract surface. Surface to operator at HALT 0; if (b) is preferred, that's an additive contract change requiring arbitration.

**C-MBT34-2:** Should `mb-t34-spike.cjs` be committed to the repo (`packages/dispatch-workstation/scripts/`) or kept in `/tmp` (out-of-tree)?
- **(a)** commit (operator can re-run for verification; no API key in source — script reads from file)
- **(b)** keep `/tmp`-only (script is load-bearing for diagnose §III but not for production)

**Tentative:** **(a) commit.** Operator-rerunnable verification is valuable; script contains no secrets.

---

## WB ladder (assuming tentative dispositions ack)

- **WB1** RED scaffold + spike committed
- **WB2** GREEN stream-event parsing (MB-T26 non-regression checkpoint)
- **WB3** GREEN retry + exponential backoff
- **WB4** GREEN rate-limit header extraction + accessor + onRateLimit?
- **WB5** GREEN non-chat-flow caller surface + key-file loader
- **WB6** GREEN live-API smoke + integration test + findings doc + followups

Total: **6 WBs**.

---

## HALT 0 surface

Operator: please mark up Q-MBT34-1 through Q-MBT34-11 + C-MBT34-1, C-MBT34-2 (ack tentatives or flip). After ack, WB1 starts.

**Critical confirmations needed:**
1. **Q-MBT34-1=(c)** — split into low-level `AnthropicAPIClient` + chat client composes
2. **Q-MBT34-3=(b)** — file-first key load with env-var fallback
3. **Q-MBT34-9** — defer cache-token enrichment to v3.1 vs do small additive in WB2
4. **C-MBT34-1** — IPC seam for Terminal B's `RateLimitState` consumption
5. **C-MBT34-2** — commit spike script or keep `/tmp`-only
