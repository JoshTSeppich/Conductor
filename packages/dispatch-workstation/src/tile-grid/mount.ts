// MB-T12 tile-grid renderer entry point.
//
// WB1 (RED): placeholder. Subsequent WBs replace this with the real
// top-level tile-grid React tree mount, mirroring src/console-panel/mount.ts.
//   - WB2: src/tile-grid/tile-layout.ts (pure-fn grid-fit calculator)
//   - WB5: src/tile-grid/tile.tsx (per-tile wrapper)
//   - WB6: src/tile-grid/tile-grid.tsx (top-level grid component)
//   - WB12: workstation-shell.html wires <script src="../tile-grid/renderer.js">
//
// In v3.0 the tile-grid bundle is loaded by workstation-shell.html (after
// WB12) and auto-mounts into #tile-grid-root. This placeholder keeps the
// build pipeline green while the WB ladder fills in real content.

export const TILE_GRID_PLACEHOLDER = true;
