// CONSOLE-T02 Cluster 1 — Test 1/5: console:open is shell→webview.
//
// Per vision §10.7 (frozen at eac381e):
//   `console:open` (shell → webview) — instruct webview to open a CC-console
//   panel bound to a specified session.
//
// Shell calls openConsolePanel(sessionName); the controller emits a
// `console:open` IPC event to the webview with payload {sessionName}.
// The trigger source for this call (menu item, native shortcut, etc.) is
// CONSOLE-T03's design decision and out of scope here.
//
// RED state: src/main/console-ipc.ts absent → import fails → FAIL.
// GREEN state: ConsoleIpcController emits via the injected webview sink → PASS.
import { describe, it, expect } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

describe('CONSOLE-T02 cluster 1 — console:open emits shell→webview', () => {
  it('openConsolePanel emits a single console:open event with {sessionName}', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('session-alpha');

    const opens = sink.byChannel('console:open');
    expect(opens).toHaveLength(1);
    expect(opens[0]?.payload).toEqual({ sessionName: 'session-alpha' });
  });

  it('openConsolePanel for two distinct sessions emits two console:open events', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s1');
    await controller.openConsolePanel('s2');

    const opens = sink.byChannel('console:open');
    expect(opens.map((e) => e.payload)).toEqual([
      { sessionName: 's1' },
      { sessionName: 's2' },
    ]);
  });
});
