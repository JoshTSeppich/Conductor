// MB-T12 WB12 — workstation-shell.html exposes the tile-grid mount region.
//
// Pre-WB12 (WB1-era / Session C / Batch 6 / wiring-mounts): the shell had
// `#console-tile-region` containing `#console-tile-grid` containing
// `#console-root`. A single ConsolePanel auto-mounted into #console-root.
// The region was hidden by default (display:none) and toggled via inline
// JS that subscribed to consoleBridge.onConsoleOpen.
//
// Post-WB12: the inner DOM is replaced with `#tile-grid-root` and the
// inline visibility toggle is deleted. The tile-grid renderer bundle
// auto-mounts <TileGridApp> into `#tile-grid-root`; TileGridApp returns
// null when sessions.length===0, so the region collapses naturally
// (flex-grow + min-height:0). The console-panel renderer bundle is
// still loaded so the WB11 detached-window path
// (console-panel.html?session=<name>) keeps working.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHELL_HTML = resolve(
  __dirname,
  '../../../src/main/workstation-shell.html',
);

describe('MB-T12 WB12 — workstation-shell.html tile-grid mount region', () => {
  const html = readFileSync(SHELL_HTML, 'utf8');

  it('retains the #console-tile-region wrapper (renamed-inner only)', () => {
    expect(html).toMatch(/id\s*=\s*['"]console-tile-region['"]/);
  });

  it('contains the #tile-grid-root mount target (WB12 replaces #console-tile-grid + #console-root)', () => {
    expect(html).toMatch(/id\s*=\s*['"]tile-grid-root['"]/);
  });

  it('does NOT contain the legacy single-panel markers #console-tile-grid or #console-root', () => {
    expect(html).not.toMatch(/id\s*=\s*['"]console-tile-grid['"]/);
    expect(html).not.toMatch(/id\s*=\s*['"]console-root['"]/);
  });

  it('region is no longer hidden by inline display:none (WB12 uses flex-grow flow)', () => {
    // WB12 removes the WB1-era `style="height: 240px; display: none;"`
    // inline attribute. TileGridApp manages its own visibility (returns
    // null on N=0); flex layout reclaims the space.
    const inlineNoneMatch = html.match(
      /id\s*=\s*['"]console-tile-region['"][^>]*style\s*=\s*['"][^'"]*display\s*:\s*none/i,
    );
    expect(inlineNoneMatch).toBeNull();
  });

  it('places the tile region between #kanban-region and #splitter (layout order unchanged)', () => {
    // Operator-baked-in placement (option (a) embedded alongside chat
    // panel as a new region between kanban and splitter). Asserts source
    // order so a future drift to a different layout re-arbitrates with
    // operator.
    const kanbanIdx = html.indexOf('id="kanban-region"');
    const tileIdx = html.indexOf('id="console-tile-region"');
    const splitterIdx = html.indexOf('id="splitter"');

    expect(kanbanIdx, 'kanban-region not found in shell').toBeGreaterThan(-1);
    expect(tileIdx, 'console-tile-region not found in shell').toBeGreaterThan(-1);
    expect(splitterIdx, 'splitter not found in shell').toBeGreaterThan(-1);

    expect(kanbanIdx).toBeLessThan(tileIdx);
    expect(tileIdx).toBeLessThan(splitterIdx);
  });

  it('loads the tile-grid renderer bundle so TileGridApp auto-mounts on shell-load', () => {
    expect(html).toMatch(/tile-grid\/renderer\.js/);
  });

  it('still loads console-panel renderer (used by the WB11 detached-window standalone path)', () => {
    expect(html).toMatch(/console-panel\/renderer\.js/);
  });

  it('does NOT contain the legacy onConsoleOpen → display:block inline toggle (WB12 deleted it)', () => {
    // Pre-WB12 shell had:
    //   window.consoleBridge.onConsoleOpen(() => {
    //     consoleTileRegion.style.display = 'block';
    //   });
    // WB12 deletes this — TileGridApp manages visibility, the bridge
    // subscription happens inside React state.
    expect(html).not.toMatch(/onConsoleOpen[^)]*\)\s*=>\s*\{[^}]*style\.display\s*=\s*['"]block/i);
  });
});
