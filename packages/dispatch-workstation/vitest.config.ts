import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    // happy-dom is enabled per-test-file with a // @vitest-environment happy-dom
    // pragma; the default 'node' environment keeps existing CONSOLE-T02 / COARCH
    // unit tests untouched (they are pure-IPC factory tests, no DOM needed).
    // CONSOLE-T03 component tests opt in via the per-file pragma to avoid the
    // happy-dom WebSocket polyfill quirk surfacing in non-DOM tests.
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    reporters: ['default'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: [
        'src/main/**/*.ts',
        'src/coarchitect/build-doc-state.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.html',
        'src/main/run-smoke.ts',
        'src/main/smoke-harness.ts',
      ],
      all: true,
    },
  },
});
