/**
 * v3 namespace re-exports. The freeze anchor is `./schema.ts`; this file
 * exists to give consumers a single import surface for the v3 namespace
 * (`import { ... } from 'dispatch-core/src/v3/index.js'`).
 *
 * Per Cairn finding #52 (workspace-public-surface vs source-tree reach-in),
 * production consumers reaching into `dispatch-core/src/v3/schema.js` is
 * the existing convention until the workspace-package exports map ships
 * (deferred). This file does not change that convention; it simply
 * collocates the v3 surface for callers that prefer a namespace import.
 */

export * from './schema.js';
