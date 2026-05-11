// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB2 (green) — Frame C public surface
// barrel.
//
// Per ticket body a1f7a03 §4 WB2: re-export mount factory + types for
// consumption by `tile-grid/mount.ts`'s WB10 `tryAutoMountFrameC()`
// auto-mount block.

export { mountFrameC, type FrameCMountProps, type FrameCMountHandle } from './mount.js';
export { FrameCRoot, type FrameCRootProps } from './frame-c-root.js';
