export type TokenProvider = () => string | null;

export interface HttpClient {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
}

// Thin wrapper that injects the X-Conductor-Token header per contract
// §3.1 when the provider returns a non-null token. Consumers that
// need unauth (e.g., /v2/health) pass () => null.
export function createHttpClient(tokenProvider: TokenProvider): HttpClient {
  return {
    async fetch(url, init) {
      const token = tokenProvider();
      const headers = new Headers(init?.headers);
      if (token) headers.set('X-Conductor-Token', token);
      return fetch(url, { ...init, headers });
    },
  };
}
