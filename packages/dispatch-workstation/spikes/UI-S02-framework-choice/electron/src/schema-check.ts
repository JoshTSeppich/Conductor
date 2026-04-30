/**
 * UI-S02 workspace-type-flow proof for Electron. Type-only import
 * from the operator-published v2 schema via relative path into the
 * workspace.
 *
 * A successful `tsc` run proves: Electron project's TS pipeline can
 * consume types from `packages/dispatch-core/src/v2/schema.ts`. Runtime
 * zod is needed transitively (schema.ts imports it) — this hello-world
 * installs zod as a devDep to keep the proof self-contained. In
 * production (MB-T01), dispatch-menubar will be in the workspace and
 * import path becomes `from "dispatch-core"`.
 */
import type { State } from '../../../../../dispatch-core/src/v2/schema.js';

const examples: State[] = ['armed', 'paused', 'held', 'killed'];
void examples;
