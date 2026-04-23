/**
 * UI-S03 workspace-type-flow proof. Same pattern as UI-S02 candidates:
 * type-only import from operator-published v2 schema to verify the
 * Electron menu bar's TS pipeline can consume workspace types.
 */
import type { State } from '../../../dispatch-core/src/v2/schema.js';

const examples: State[] = ['armed', 'paused', 'held', 'killed'];
void examples;
