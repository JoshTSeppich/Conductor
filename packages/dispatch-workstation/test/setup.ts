// Vitest setup. Loaded for every test file regardless of `environment`.
// Lightweight — only registers @testing-library/jest-dom matchers (which
// are no-ops outside happy-dom) and an afterEach RTL cleanup. The cleanup
// is a no-op when no React tree was rendered, so it's safe to run for
// CONSOLE-T02 / COARCH-T0X pure-IPC tests as well.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
