/* eslint-disable */
// =============================================================================
// MB-T34 Phase 1 Live-API Spike — rate-limit header exposure verification
// =============================================================================
//
// SCOPE: One-off reproducibility artifact, NOT production code. This script
// produced the [KNOWN] evidence underlying MB-T34 Phase 1 diagnose
// (docs/coordination/mb-t34-diagnose-2026-05-08.md §III). Committed at
// operator's request (HALT 0 ack, C-MBT34-2) so the spike is operator-
// rerunnable for verification.
//
// This script is NOT imported anywhere in production. It does NOT belong
// in the build pipeline. It exists solely to let the operator (or a
// future contributor) re-confirm the load-bearing claim that
// @anthropic-ai/sdk@0.92.0 exposes anthropic-ratelimit-* headers via
// APIPromise.withResponse().
//
// API key loading mirrors production client (file-first, env fallback);
// no script-internal hardcoding per operator directive.
//
// Usage:
//   node packages/dispatch-workstation/scripts/mb-t34-spike-rate-limit-headers.cjs
//
// Side effects:
//   - 1 request to /v1/messages (~16 output tokens cost; minimal)
//   - Writes /tmp/mb-t34-spike-result.json
//   - Prints summary JSON to stdout (no API key, no full response text
//     beyond what the model returned to a "hi" prompt)
// =============================================================================

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

async function loadApiKey() {
  const filePath = path.join(os.homedir(), '.foxworks-dispatch', 'api-key');
  try {
    const contents = fs.readFileSync(filePath, 'utf-8').trim();
    if (contents.length > 0) return contents;
  } catch (_err) {
    // File missing or unreadable — fall through to env var.
  }
  const envKey = process.env['ANTHROPIC_API_KEY'];
  return envKey && envKey.trim().length > 0 ? envKey.trim() : null;
}

(async () => {
  const result = {
    sdkVersion: null,
    headersCaptured: null,
    rateLimitHeaders: {},
    rateLimitHeaderCount: 0,
    requestId: null,
    streamEventTypes: [],
    streamEventCount: 0,
    inputTokens: null,
    outputTokens: null,
    cacheReadInputTokens: null,
    cacheCreationInputTokens: null,
    modelObserved: null,
    finalText: null,
    error: null,
  };

  try {
    // Standard module resolution (must run from a context where
    // @anthropic-ai/sdk resolves — e.g., from packages/dispatch-workstation
    // after pnpm install, or any directory under the workspace).
    const Anthropic = require('@anthropic-ai/sdk').default;
    // SDK's exports field blocks `require('@anthropic-ai/sdk/package.json')`;
    // resolve the entry path and read package.json from its parent dir.
    const sdkEntry = require.resolve('@anthropic-ai/sdk');
    const sdkPkgPath = path.join(path.dirname(sdkEntry), 'package.json');
    const sdkPkg = JSON.parse(fs.readFileSync(sdkPkgPath, 'utf-8'));
    result.sdkVersion = sdkPkg.version;

    const apiKey = await loadApiKey();
    if (!apiKey) {
      throw new Error(
        'API key not found at ~/.foxworks-dispatch/api-key and ' +
          'ANTHROPIC_API_KEY env var unset. Cannot run spike.',
      );
    }

    const client = new Anthropic({ apiKey });

    // Header capture seam: APIPromise.withResponse() returns
    // { data, response, request_id }. Per @anthropic-ai/sdk@0.92.0
    // core/api-promise.d.ts:39.
    const apiPromise = client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
    });

    const { data: stream, response, request_id } = await apiPromise.withResponse();
    result.requestId = request_id ?? null;
    result.headersCaptured = true;

    const allHeaders = {};
    for (const [k, v] of response.headers.entries()) {
      allHeaders[k] = v;
    }
    const interestingPrefixes = [
      'anthropic-ratelimit-',
      'anthropic-priority-',
      'retry-after',
      'request-id',
      'anthropic-organization-',
    ];
    for (const [k, v] of Object.entries(allHeaders)) {
      const lk = k.toLowerCase();
      if (interestingPrefixes.some((p) => lk.startsWith(p))) {
        result.rateLimitHeaders[lk] = v;
      }
    }
    result.rateLimitHeaderCount = Object.keys(result.rateLimitHeaders).length;
    result.allHeaderKeys = Object.keys(allHeaders).sort();

    const textParts = [];
    for await (const event of stream) {
      result.streamEventTypes.push(event.type);
      result.streamEventCount += 1;
      if (event.type === 'message_start') {
        result.inputTokens = event.message.usage.input_tokens ?? null;
        result.cacheReadInputTokens = event.message.usage.cache_read_input_tokens ?? null;
        result.cacheCreationInputTokens = event.message.usage.cache_creation_input_tokens ?? null;
        result.modelObserved = event.message.model ?? null;
      } else if (event.type === 'message_delta') {
        result.outputTokens = event.usage.output_tokens ?? null;
        if (event.usage.cache_read_input_tokens != null) {
          result.cacheReadInputTokens = event.usage.cache_read_input_tokens;
        }
        if (event.usage.cache_creation_input_tokens != null) {
          result.cacheCreationInputTokens = event.usage.cache_creation_input_tokens;
        }
      } else if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        textParts.push(event.delta.text);
      }
    }
    result.finalText = textParts.join('');
  } catch (err) {
    result.error = {
      name: err && err.name ? err.name : 'unknown',
      message: err && err.message ? err.message : String(err),
      status: err && err.status ? err.status : null,
      stack: err && err.stack ? err.stack.split('\n').slice(0, 6).join('\n') : null,
    };
  }

  fs.writeFileSync('/tmp/mb-t34-spike-result.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})();
