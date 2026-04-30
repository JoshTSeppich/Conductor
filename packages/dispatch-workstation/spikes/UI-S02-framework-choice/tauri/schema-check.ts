/**
 * UI-S02 workspace-type-flow proof for Tauri. Same shape as Electron /
 * menubar-npm — Tauri uses TypeScript on the frontend side (or vanilla
 * JS), and the TS build pipeline is whatever the operator configures
 * (Vite is the default scaffold). This file proves that TSC resolution
 * of workspace imports works for a Tauri project's frontend.
 */
import type { State } from '../../../../dispatch-core/src/v2/schema.js';

const examples: State[] = ['armed', 'paused', 'held', 'killed'];
void examples;
