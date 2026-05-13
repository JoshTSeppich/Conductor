// MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG — WB3 GREEN.
//
// Common header-parser pure-fn for Anthropic API rate-limit response
// headers. Consumed by `coarchitect-rate-limit-source.ts` (WB5 GREEN)
// inside its `fetch` response-handler path; isolated here so the
// parser is unit-testable without HTTP infrastructure.
//
// Header shape per Anthropic API documentation [MODELED — operator
// runtime-spike pending per ticket body §5 risk register row 1]:
//
//   anthropic-ratelimit-requests-limit
//   anthropic-ratelimit-requests-remaining
//   anthropic-ratelimit-requests-reset          (ISO 8601 datetime)
//   anthropic-ratelimit-tokens-limit
//   anthropic-ratelimit-tokens-remaining
//   anthropic-ratelimit-tokens-reset
//   anthropic-ratelimit-input-tokens-limit
//   anthropic-ratelimit-input-tokens-remaining
//   anthropic-ratelimit-input-tokens-reset
//   anthropic-ratelimit-output-tokens-limit
//   anthropic-ratelimit-output-tokens-remaining
//   anthropic-ratelimit-output-tokens-reset
//
// Maps to RateLimitState (chat-shell/ring-helpers.ts:38-43) with each
// dimension `null` when the corresponding three headers are absent or
// malformed.

import type {
  RateLimitState,
  RateLimitDimension,
} from '../chat-shell/ring-helpers.js';

type DimensionKey = 'requests' | 'tokens' | 'inputTokens' | 'outputTokens';

interface HeaderTriple {
  readonly limit: string;
  readonly remaining: string;
  readonly reset: string;
}

const DIMENSION_HEADER_TRIPLES: Record<DimensionKey, HeaderTriple> = {
  requests: {
    limit: 'anthropic-ratelimit-requests-limit',
    remaining: 'anthropic-ratelimit-requests-remaining',
    reset: 'anthropic-ratelimit-requests-reset',
  },
  tokens: {
    limit: 'anthropic-ratelimit-tokens-limit',
    remaining: 'anthropic-ratelimit-tokens-remaining',
    reset: 'anthropic-ratelimit-tokens-reset',
  },
  inputTokens: {
    limit: 'anthropic-ratelimit-input-tokens-limit',
    remaining: 'anthropic-ratelimit-input-tokens-remaining',
    reset: 'anthropic-ratelimit-input-tokens-reset',
  },
  outputTokens: {
    limit: 'anthropic-ratelimit-output-tokens-limit',
    remaining: 'anthropic-ratelimit-output-tokens-remaining',
    reset: 'anthropic-ratelimit-output-tokens-reset',
  },
};

function readDimension(
  headers: Headers,
  triple: HeaderTriple,
): RateLimitDimension | null {
  const limitRaw = headers.get(triple.limit);
  const remainingRaw = headers.get(triple.remaining);
  const reset = headers.get(triple.reset);
  if (limitRaw === null || remainingRaw === null || reset === null) return null;
  const limit = Number(limitRaw);
  const remaining = Number(remainingRaw);
  if (!Number.isFinite(limit) || !Number.isFinite(remaining)) return null;
  return { limit, remaining, reset };
}

export function parseAnthropicRateLimitHeaders(
  headers: Headers,
): RateLimitState | null {
  const requests = readDimension(headers, DIMENSION_HEADER_TRIPLES.requests);
  const tokens = readDimension(headers, DIMENSION_HEADER_TRIPLES.tokens);
  const inputTokens = readDimension(
    headers,
    DIMENSION_HEADER_TRIPLES.inputTokens,
  );
  const outputTokens = readDimension(
    headers,
    DIMENSION_HEADER_TRIPLES.outputTokens,
  );
  if (
    requests === null &&
    tokens === null &&
    inputTokens === null &&
    outputTokens === null
  ) {
    return null;
  }
  return { requests, tokens, inputTokens, outputTokens };
}
