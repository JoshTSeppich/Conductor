# MB-S01 spike — Anthropic SDK validation

Validates that Claude Sonnet 4.6 (`claude-sonnet-4-6` per Anthropic SDK) can serve as the Workstation orchestrator per `packages/dispatch-menubar/coarchitect/system-prompt.md` and the seven cairn-Sonnet primitives in `docs/cairn-sonnet-extensions.md`.

This is throwaway evidence — the spike harness, fixtures, and proposed schema do not ship in v3.0. The deliverable is `docs/adr/MB-S01-anthropic-sdk-validation.md` with KNOWN/MODELED/SPECULATIVE labels per cairn §10.1.

## Validation targets (from MB-S01 brief)

1. Stateless context-injection round-trip across all four output types (action, card, multi-choice-card, escape-block).
2. Schema validation rate against the proposed Zod schema at `packages/dispatch-core/spikes/MB-S01/proposed-output-schema.ts`.
3. Cost projection across 100/200/500 calls/day at posted Sonnet 4.6 pricing.
4. First-token latency p50/p95 against ratified P-0.2 Q6 hard bar (chat first-token < 2s p50).
5. 9-question self-check block reliability per ratified P-0.3 Q5 — block must appear in card `payload`, NOT `rationale`.
6. Ratcheted no-arbitration per P-0.6 Q2 KEEP — escape rate on ambiguous-but-not-pre-marked scenarios.

## Layout

```
spikes/MB-S01/
├── README.md                         (this file)
├── run.sh                            entrypoint; halts without ANTHROPIC_API_KEY
├── fixtures/
│   ├── build-doc.build.md            schema-conformant synthetic build doc
│   ├── daemon-state.json             synthetic 5-session snapshot
│   ├── chat-history.json             10-turn synthetic history
│   └── scenarios/
│       ├── 01-normal-actions.json    10 happy-path scenarios
│       ├── 02-escape-blocks.json     5 escape-block scenarios
│       ├── 03-multi-choice.json      5 multi-choice-card scenarios
│       ├── 04-ambiguity-escapes.json 5 no-arbitration ratchet tests
│       └── 05-self-check.json        10 self-check-in-payload tests
├── src/
│   ├── compose-context.ts            tier-1..6 composition per P-0.4 Q4
│   ├── invoke.ts                     SDK streaming call + JSON parse
│   ├── schema-validate.ts            runs proposed Zod schema
│   ├── self-check-detect.ts          locates 9-q block in payload
│   ├── measure.ts                    p50/p95 + cost projection
│   └── harness.ts                    entrypoint
└── results/                          per-run artifacts (one dir per ISO timestamp)
```

## Run

```bash
export ANTHROPIC_API_KEY=sk-ant-...
./packages/dispatch-menubar/spikes/MB-S01/run.sh
```

The harness writes:

- `results/<ISO-timestamp>/raw/<scenario-id>.json` — per-scenario context, invocation, parse, schema, pass result
- `results/<ISO-timestamp>/summary.json` — aggregate metrics + projections
- `results/<ISO-timestamp>/summary.md` — human-readable rollup cited by the ADR

## Optional env overrides

| Var | Default | Purpose |
|---|---|---|
| `MB_S01_MODEL` | `claude-sonnet-4-6` | Model string passed to SDK. Override only if the SDK errors with `NotFoundError`. |
| `MB_S01_MAX_TOKENS` | `4096` | `max_tokens` per call. |
| `MB_S01_INTER_CALL_DELAY_MS` | `500` | Sleep between calls (rate-limit politeness). |
| `MB_S01_PRICE_INPUT_USD_PER_M` | `3.00` | Sonnet 4.6 posted input price per 1M tokens. Verify on run date. |
| `MB_S01_PRICE_OUTPUT_USD_PER_M` | `15.00` | Sonnet 4.6 posted output price per 1M tokens. Verify on run date. |

## Halt behavior

The harness halts on:

- Missing `ANTHROPIC_API_KEY` (exit 1).
- SDK `NotFoundError` on the model string (exit 2). Operator overrides via `MB_S01_MODEL` and re-runs.

The harness does NOT halt on per-scenario failures — it records and continues so the run produces a complete metric set even when individual scenarios fail.

## Confidence labels in the ADR

KNOWN claims cite specific scenario raw-result files and the summary JSON. MODELED claims (e.g., monthly cost projections) cite the pricing inputs the operator must verify. SPECULATIVE is reserved for forecasts beyond the measured surface (e.g., behavior under high concurrent load).
