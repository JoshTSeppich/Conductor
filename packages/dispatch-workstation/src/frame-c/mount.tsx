// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB2 (green) — Frame C mount factory.
//
// Per ticket body a1f7a03 §4 WB2:
//   - Exports `mountFrameC(container, props): { dispose(): void }`
//     mirroring `tile-grid/mount.ts` + `chat-shell/mount.ts` factory
//     convention.
//   - Renders FrameCRoot into the supplied container via React 19's
//     `createRoot` (same as tile-grid/mount.ts pattern).
//   - WB10 invokes this factory from `tile-grid/mount.ts`'s
//     `tryAutoMountFrameC()` auto-mount block (mirroring
//     tryAutoMountFrameShellHeader at tile-grid/mount.ts:131-148).
//
// Build-pipeline disposition: Frame C is bundled INTO the tile-grid
// renderer bundle (per ticket body §4 WB10 — `tile-grid/mount.ts`
// imports this mount factory). NO new `scripts/build-frame-c.mjs`
// needed — Frame C is a sub-mount of the tile-grid surface, not a
// top-level renderer. CLAUDE.md §3.7 still honored: each top-level
// renderer surface has its own script; sub-mounts within a renderer
// are bundled in their parent.

import { createRoot, type Root } from 'react-dom/client';
import { FrameCRoot, type FrameCRootProps } from './frame-c-root.js';

export type FrameCMountProps = FrameCRootProps;

export interface FrameCMountHandle {
  /** Unmounts the React tree from the container. Idempotent. */
  dispose(): void;
}

/**
 * Mount Frame C into the supplied container. Returns a handle whose
 * `dispose()` unmounts the React tree.
 *
 * Idempotency: calling `dispose()` more than once is a no-op (mirrors
 * tile-grid/mount.ts pattern).
 */
export function mountFrameC(
  container: HTMLElement,
  props: FrameCMountProps,
): FrameCMountHandle {
  const root: Root = createRoot(container);
  root.render(<FrameCRoot {...props} />);

  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
    },
  };
}
