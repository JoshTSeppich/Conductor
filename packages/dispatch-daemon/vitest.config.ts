import { defineConfig } from 'vitest/config';

// MB-F-DAEMON-CONCURRENT-RACE: race probes spawn child processes
// (slow startup) and probe-03 is intentionally stochastic — kept out
// of the default suite. The `test:race` script sets RACE_TESTS=1 to
// flip the exclude rule; default `test` keeps fast path.
const RACE = process.env.RACE_TESTS === '1';

export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    exclude: RACE
      ? ['**/node_modules/**', '**/dist/**']
      : [
          '**/node_modules/**',
          '**/dist/**',
          'test/integration/concurrent-writer-race/**',
        ],
    reporters: ['default'],
    testTimeout: 10_000,
  },
});
