// CONSOLE-T02 Cluster 4 — Multi-panel concurrency cap.
//
// Per ratified vision §10.11 Q3: cap = 4 simultaneous CC-console panels in
// v3.0. Configurable in a future settings UI (MB-T11/W-T19). The Workstation
// throws a WorkstationError of type 'PanelCapExceeded' when the operator
// attempts to open beyond the cap. Webview-side rendering of this error
// (toast, modal, etc.) is CONSOLE-T03 territory; this test only asserts the
// shell-side enforcement.
import { describe, it, expect } from 'vitest';
import {
  ConsoleIpcController,
  WorkstationError,
  DEFAULT_PANEL_CAP,
} from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

function makeController(panelCap?: number): {
  controller: ConsoleIpcController;
  sink: EmitCaptureSink;
} {
  const sink = new EmitCaptureSink();
  const wsf = makeMockSocketFactory();
  const controller = new ConsoleIpcController({
    daemonClient: new MockDaemonClient(),
    wsFactory: wsf.factory,
    emitToWebview: sink.emit,
    panelCap,
  });
  return { controller, sink };
}

describe('CONSOLE-T02 cluster 4 — multi-panel concurrency cap', () => {
  it('default cap is 4 per ratified vision §10.11 Q3', () => {
    expect(DEFAULT_PANEL_CAP).toBe(4);
  });

  it('opens 4 panels successfully (at the cap)', async () => {
    const { controller } = makeController();

    await controller.openConsolePanel('s1');
    await controller.openConsolePanel('s2');
    await controller.openConsolePanel('s3');
    await controller.openConsolePanel('s4');

    expect(controller.panelCount()).toBe(4);
  });

  it('throws WorkstationError type=PanelCapExceeded on the 5th open', async () => {
    const { controller } = makeController();

    for (const name of ['s1', 's2', 's3', 's4']) {
      await controller.openConsolePanel(name);
    }

    let caught: unknown = null;
    try {
      await controller.openConsolePanel('s5');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(WorkstationError);
    expect((caught as WorkstationError).type).toBe('PanelCapExceeded');
    expect(controller.panelCount()).toBe(4);
  });

  it('after closing one panel, a new panel can be opened (cap reasserts)', async () => {
    const { controller } = makeController();

    for (const name of ['s1', 's2', 's3', 's4']) {
      await controller.openConsolePanel(name);
    }
    await controller.closeConsolePanel('s2');
    expect(controller.panelCount()).toBe(3);

    await expect(controller.openConsolePanel('s5')).resolves.toBeUndefined();
    expect(controller.panelCount()).toBe(4);
  });

  it('cap is configurable per controller (test seam for MB-T11/W-T19 settings UI)', async () => {
    const { controller } = makeController(2);

    await controller.openConsolePanel('s1');
    await controller.openConsolePanel('s2');

    await expect(controller.openConsolePanel('s3')).rejects.toThrow(WorkstationError);
  });
});
