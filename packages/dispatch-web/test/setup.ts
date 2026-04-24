import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { WebSocket as NodeWebSocket } from 'ws';
import { server } from './msw/server.js';

// happy-dom 15's WebSocket implementation does not round-trip
// messages against a real Node `ws` server reliably (messages
// emitted from the server don't reach the client's 'message'
// listener). This polyfill swaps in Node `ws`'s WebSocket as
// globalThis.WebSocket for tests, which exactly matches browser
// WebSocket API surface. Production code paths are unaffected —
// browsers use their native WebSocket, which is well-tested
// against the same server spec. See UI-F18 for the methodology-
// evidence followup.
(globalThis as unknown as { WebSocket: typeof NodeWebSocket }).WebSocket =
  NodeWebSocket;

// 'bypass' (not 'error') so WEB-T03's real ws-server.ts fixture URLs
// (absolute http://127.0.0.1:<port>) pass through MSW untouched.
// Relative /v2/* URLs from T01/T02 tests still resolve against
// happy-dom's localhost origin and match MSW handlers.
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

afterEach(() => {
  // Explicit RTL cleanup: removes containers from document.body so
  // screen.* queries in the next test don't see prior renders. RTL
  // *should* auto-register this; observed behavior in T06 was that
  // multiple-render tests saw stale DOM, so adding belt-and-suspenders.
  cleanup();
  server.resetHandlers();
  // Clean cross-test state: localStorage may contain tokens from
  // happy-path tests that would leak into subsequent ones.
  try {
    localStorage.clear();
  } catch {
    // happy-dom may not have localStorage in some edge configs; ignore.
  }
});

afterAll(() => server.close());
