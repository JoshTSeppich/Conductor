import { createHttpClient, type HttpClient } from '../http-client.js';
import { readToken } from '../auth/token-storage.js';

// Default HTTP client for query hooks: reads token from localStorage
// (the store used by WEB-T02's TokenPrompt). Each call constructs a
// fresh client so token rotation during a session is reflected on
// the next fetch without needing a provider.
export function defaultClient(): HttpClient {
  return createHttpClient(() => readToken());
}

// Structural interface matching the shape of Zod schemas we consume.
// Using a local interface instead of importing `z` from 'zod' keeps
// dispatch-web's dependency surface tight — zod is transitively
// available via dispatch-core but we don't declare a direct dep.
interface Parseable<T> {
  parse: (input: unknown) => T;
}

// Fetch + runtime schema parse in one call. Always-on parse per
// gate-4 arbitration (override of TICKETS.md dev-only recommendation).
export async function fetchAndParse<T>(
  client: HttpClient,
  path: string,
  schema: Parseable<T>,
  init?: RequestInit,
): Promise<T> {
  const r = await client.fetch(path, init);
  if (!r.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${r.status}`);
  }
  return schema.parse(await r.json());
}
