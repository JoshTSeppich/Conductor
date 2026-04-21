import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    reporters: ['default'],
    // Integration + e2e tests will opt in to longer timeouts individually;
    // keep the default tight to surface hangs fast.
    testTimeout: 10_000,
  },
});
