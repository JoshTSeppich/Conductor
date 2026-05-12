// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB2 GREEN ·
// build-md/index.ts — barrel export.

export {
  loadBuildMd,
  computeReadySet,
  computeBuildMdStatus,
} from './service.js';

export { createDispatchLoop } from './dispatch-loop.js';

export type {
  BuildMdLoadResult,
  BuildMdLoadSuccess,
  BuildMdLoadError,
  BuildMdStatus,
  SerializableTaskDAG,
} from './types.js';

export type {
  DispatchLoop,
  DispatchLoopDeps,
  DispatchLoopTickResult,
  DispatchSpawnRequest,
  DispatchSpawnResult,
} from './dispatch-loop.js';
