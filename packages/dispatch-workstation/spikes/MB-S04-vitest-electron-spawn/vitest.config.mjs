// MB-S04 spike-local vitest config. Matches only this spike's tests.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mjs'],
    reporters: ['default'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
