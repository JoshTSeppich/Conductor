// MB-F-CONSOLE-T03-SHELL-INTEGRATION — Cluster 1 RED.
//
// Vision §10.10 ship-gate: "operator selects 'CC Console > [session]' from
// native menu → panel mounts in webview". CONSOLE-T03's menu surface and
// ConsoleIpcController.openConsolePanel ship at HEAD; what's missing is
// that the running workstation-shell.html has no #console-tile-region
// (and therefore no #console-root and no script tag for the bundled
// renderer), so console:open IPC reaches the shell but renders nowhere
// visible. This RED spec reads the source-of-truth shell HTML and asserts
// the region is present + correctly placed.
//
// Acceptance criterion (followup body): "RED: test asserts #console-tile-grid
// not present in shell OR mountConsoleTileGrid not called."
//
// RED state: workstation-shell.html does not yet contain #console-tile-region
// or #console-tile-grid → assertion fails.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHELL_HTML = resolve(
  __dirname,
  '../../../src/main/workstation-shell.html',
);

describe('MB-F-CONSOLE-T03 — workstation-shell.html exposes the console tile region', () => {
  const html = readFileSync(SHELL_HTML, 'utf8');

  it('contains a #console-tile-region container', () => {
    expect(html).toMatch(/id\s*=\s*['"]console-tile-region['"]/);
  });

  it('contains a #console-tile-grid container nested inside the region', () => {
    expect(html).toMatch(/id\s*=\s*['"]console-tile-grid['"]/);
  });

  it('starts the tile region hidden (display:none) so an unselected session does not steal layout', () => {
    // Cheap heuristic: the tile region's inline style or initial CSS
    // should mention display:none so the operator's first paint is
    // identical to today's shell (kanban + chat only). Once a console
    // is opened, the inline script flips visibility.
    const regionMatch = html.match(
      /id\s*=\s*['"]console-tile-region['"][^>]*style\s*=\s*['"][^'"]*display\s*:\s*none/i,
    );
    expect(regionMatch).not.toBeNull();
  });

  it('places the tile region between #kanban-region and #splitter (operator-arbitrated layout)', () => {
    // Per coord scaffold §1, Session-C's placement decision (operator-
    // baked-in) is option (a) — embedded alongside chat panel as a new
    // region between kanban and splitter. Asserting source-order so a
    // future drift towards (b)/(c) re-arbitrates with operator first.
    const kanbanIdx = html.indexOf('id="kanban-region"');
    const tileIdx = html.indexOf('id="console-tile-region"');
    const splitterIdx = html.indexOf('id="splitter"');

    expect(kanbanIdx, 'kanban-region not found in shell').toBeGreaterThan(-1);
    expect(tileIdx, 'console-tile-region not found in shell').toBeGreaterThan(-1);
    expect(splitterIdx, 'splitter not found in shell').toBeGreaterThan(-1);

    expect(kanbanIdx).toBeLessThan(tileIdx);
    expect(tileIdx).toBeLessThan(splitterIdx);
  });

  it('loads the bundled console-panel renderer so #console-root auto-mounts when the bridge fires', () => {
    // The console-panel/mount.ts auto-mount path looks for window.consoleBridge
    // (already exposed by preload.mts) + #console-root in the DOM. The shell
    // must therefore (a) include a #console-root element somewhere inside
    // the tile region and (b) load ../console-panel/renderer.js so the
    // auto-mount fires on shell-load.
    expect(html).toMatch(/id\s*=\s*['"]console-root['"]/);
    expect(html).toMatch(/console-panel\/renderer\.js/);
  });
});
