/**
 * UI-S02 workspace-type-flow proof for menubar npm. Same shape as
 * Electron's schema-check.ts — menubar is Electron-under-the-hood, so
 * TS resolution behavior is identical to raw Electron.
 */
import type { State } from '../../../../dispatch-core/src/v2/schema.js';

const examples: State[] = ['armed', 'paused', 'held', 'killed'];
void examples;
