import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
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
