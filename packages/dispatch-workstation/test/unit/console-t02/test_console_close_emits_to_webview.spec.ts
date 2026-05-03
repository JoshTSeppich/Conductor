// CONSOLE-T02 Cluster 1 — Test 2/5: console:close is shell→webview.
//
// Per vision §10.7 (frozen at eac381e):
//   `console:close` (shell → webview) — instruct webview to close a
//   CC-console panel.
//
// Shell calls closeConsolePanel(sessionName); the controller emits a
// `console:close` IPC event to the webview with payload {sessionName}.
//
// RED state: src/main/console-ipc.ts absent → import fails → FAIL.
// GREEN state: ConsoleIpcController emits via the injected webview sink → PASS.
import { describe, it, expect } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

describe('CONSOLE-T02 cluster 1 — console:close emits shell→webview', () => {
  it('closeConsolePanel emits a single console:close event with {sessionName}', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-close');
    sink.reset();
    await controller.closeConsolePanel('s-close');

    const closes = sink.byChannel('console:close');
    expect(closes).toHaveLength(1);
    expect(closes[0]?.payload).toEqual({ sessionName: 's-close' });
  });

  it('closeConsolePanel on a non-open session is a no-op (no console:close emitted)', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.closeConsolePanel('never-opened');

    expect(sink.byChannel('console:close')).toHaveLength(0);
  });
});
