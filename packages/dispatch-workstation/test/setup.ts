// Vitest setup. Loaded for every test file regardless of `environment`.
// Lightweight — registers @testing-library/jest-dom matchers (no-ops outside
// happy-dom), an afterEach RTL cleanup (no-op when no React tree rendered),
// and the electron-process-cleanup helper's afterEach + afterAll hooks.
//
// The cleanup helper is a no-op for tests that don't spawn Electron:
//   - afterEach short-circuits when no children were tracked via trackChild().
//   - afterAll runs pgrep -P from this fork's PID and only matches
//     /[Ee]lectron|Code Helper/ — fork's afterAll is cheap (~5-20ms) for
//     non-Electron specs since pgrep returns no matching descendants.
//
// Closes MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK (FOLLOWUPS:153, Tier 1):
// global registration here means every spec fork in the workstation suite
// (28 Electron-spawning files + the unit/IPC files) gets defensive cleanup
// without per-suite amend files.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { registerElectronCleanup } from './integration/_helpers/electron-process-cleanup.js';

afterEach(() => {
  cleanup();
});

registerElectronCleanup();
