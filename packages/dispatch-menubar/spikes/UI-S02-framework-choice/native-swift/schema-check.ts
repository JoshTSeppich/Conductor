/**
 * UI-S02 workspace-type-flow proof for native-swift+Node-bridge.
 *
 * The Swift binary handles tray + notifications; a companion Node
 * child process handles TypeScript business logic + daemon HTTP/WS
 * consumption. IPC between them is stdin/stdout (line-delimited JSON)
 * or a Unix domain socket — to be decided in MB-T01 if this candidate
 * is chosen.
 *
 * This TS file proves: the Node side of the pair can import workspace
 * types the same way the Electron candidate does. Swift is orthogonal
 * to the TS type-flow question.
 */
import type { State } from '../../../../dispatch-core/src/v2/schema.js';

const examples: State[] = ['armed', 'paused', 'held', 'killed'];
void examples;
