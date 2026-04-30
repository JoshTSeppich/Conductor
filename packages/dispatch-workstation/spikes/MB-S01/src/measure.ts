// SPIKE: MB-S01 metrics aggregator. Computes p50/p95 latencies, token
// totals/averages, and monthly cost projections from raw per-call results.
//
// Pricing inputs are MODELED — operator must verify against current
// Anthropic pricing for Sonnet 4.6 at run time. The harness reads pricing
// from env (MB_S01_PRICE_INPUT_USD_PER_M / MB_S01_PRICE_OUTPUT_USD_PER_M)
// with reasonable defaults; the ADR cites the specific values used.

export interface RawResult {
  scenario_id: string;
  scenario_file: string;
  expected_output_type: string;
  ttft_ms: number | null;
  total_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  parse_ok: boolean;
  parse_stripped_fences: boolean;
  schema_ok: boolean;
  detected_type: string | null;
  pass: boolean;
  pass_detail: string;
  error: string | null;
}

export interface Summary {
  call_count: number;
  pass_count: number;
  parse_ok_rate: number;
  parse_strict_ok_rate: number;
  schema_ok_rate: number;
  ttft_p50_ms: number | null;
  ttft_p95_ms: number | null;
  total_p50_ms: number | null;
  total_p95_ms: number | null;
  input_tokens_avg: number;
  output_tokens_avg: number;
  input_tokens_total: number;
  output_tokens_total: number;
}

export function summarize(results: RawResult[]): Summary {
  const ttfts = results
    .map((r) => r.ttft_ms)
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const totals = results.map((r) => r.total_ms).sort((a, b) => a - b);
  const inputTokens = results.map((r) => r.input_tokens).filter((x): x is number => x !== null);
  const outputTokens = results.map((r) => r.output_tokens).filter((x): x is number => x !== null);

  const inputTotal = inputTokens.reduce((s, x) => s + x, 0);
  const outputTotal = outputTokens.reduce((s, x) => s + x, 0);
  const callCount = results.length;
  const inputAvg = inputTokens.length > 0 ? inputTotal / inputTokens.length : 0;
  const outputAvg = outputTokens.length > 0 ? outputTotal / outputTokens.length : 0;

  return {
    call_count: callCount,
    pass_count: results.filter((r) => r.pass).length,
    parse_ok_rate: callCount > 0 ? results.filter((r) => r.parse_ok).length / callCount : 0,
    parse_strict_ok_rate:
      callCount > 0 ? results.filter((r) => r.parse_ok && !r.parse_stripped_fences).length / callCount : 0,
    schema_ok_rate: callCount > 0 ? results.filter((r) => r.schema_ok).length / callCount : 0,
    ttft_p50_ms: percentile(ttfts, 0.5),
    ttft_p95_ms: percentile(ttfts, 0.95),
    total_p50_ms: percentile(totals, 0.5),
    total_p95_ms: percentile(totals, 0.95),
    input_tokens_avg: Math.round(inputAvg),
    output_tokens_avg: Math.round(outputAvg),
    input_tokens_total: inputTotal,
    output_tokens_total: outputTotal,
  };
}

function percentile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[idx];
}

export interface CostProjection {
  calls_per_month: number;
  input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
}

export function projectMonthlyCost(args: {
  input_tokens_avg: number;
  output_tokens_avg: number;
  input_price_per_million_usd: number;
  output_price_per_million_usd: number;
  calls_per_day: number;
}): CostProjection {
  const callsPerMonth = args.calls_per_day * 30;
  const inputCost =
    ((args.input_tokens_avg * callsPerMonth) / 1_000_000) * args.input_price_per_million_usd;
  const outputCost =
    ((args.output_tokens_avg * callsPerMonth) / 1_000_000) * args.output_price_per_million_usd;
  return {
    calls_per_month: callsPerMonth,
    input_cost_usd: round2(inputCost),
    output_cost_usd: round2(outputCost),
    total_cost_usd: round2(inputCost + outputCost),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
