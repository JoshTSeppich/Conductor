// CONSOLE-T02 Cluster 2 — Test 3/4: WS reconnection + gap propagation.
//
// Per CONDUCTOR_API_CONTRACT.md §4.7.3 (frozen at a7e8d4f / v2.2.0):
//   "Subscriber-side reconnection. Client reconnects with new `subscribe`
//    message including the `last_seq` it had received before disconnect.
//    ... If `backfill_complete: false`, the client SHOULD surface the gap
//    to the operator. Specific UI rendering of the gap-warning is
//    CONSOLE-T03 territory; this contract specifies only the signal."
//
// CONSOLE-T02's responsibility per the resume prompt: propagate the gap as
// a console:gap-detected IPC event to the webview. UI rendering is
// CONSOLE-T03.
//
// On unexpected close (close code != 1000 normal), the controller schedules
// a reconnect attempt; the test runs the scheduled reconnect synchronously
// via the controller's testReconnectNow() seam.
import { describe, it, expect } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

describe('CONSOLE-T02 cluster 2 — WS reconnection + gap propagation', () => {
  it('on unexpected close, controller reconnects with last_seq carrying highest stdout_seq seen', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-recon');
    const sock1 = wsf.lastSocket();
    sock1.simulateOpen();
    sock1.simulateMessage({
      type: 'backfill_meta',
      current_seq: 0,
      available_from_seq: 0,
      backfill_complete: true,
    });
    sock1.simulateMessage({ type: 'line', stdout_seq: 5, bytes: 'a', encoding: 'utf8' });
    sock1.simulateMessage({ type: 'line', stdout_seq: 11, bytes: 'b', encoding: 'utf8' });

    // Daemon-side disconnect (simulated by close code != 1000).
    sock1.simulateClose(1006, 'abnormal');

    // The controller should have scheduled a reconnect; force it now.
    controller.testReconnectNow('s-recon');

    expect(wsf.sockets.length).toBeGreaterThanOrEqual(2);
    const sock2 = wsf.sockets[1]!;
    sock2.simulateOpen();
    expect(sock2.sent).toEqual([{ type: 'subscribe', last_seq: 11 }]);
  });

  it('backfill_meta with backfill_complete:false emits console:gap-detected to webview', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-gap');
    const sock = wsf.lastSocket();
    sock.simulateOpen();
    sock.simulateMessage({
      type: 'backfill_meta',
      current_seq: 250,
      available_from_seq: 100,
      backfill_complete: false,
    });

    const gaps = sink.byChannel('console:gap-detected');
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.payload).toEqual({
      sessionName: 's-gap',
      availableFromSeq: 100,
      currentSeq: 250,
    });
  });

  it('backfill_meta with backfill_complete:true does NOT emit console:gap-detected', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-nogap');
    const sock = wsf.lastSocket();
    sock.simulateOpen();
    sock.simulateMessage({
      type: 'backfill_meta',
      current_seq: 5,
      available_from_seq: 0,
      backfill_complete: true,
    });

    expect(sink.byChannel('console:gap-detected')).toHaveLength(0);
  });

  it('after closeConsolePanel, the controller does NOT reconnect on subsequent close events', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-quit');
    const sock = wsf.lastSocket();
    sock.simulateOpen();
    await controller.closeConsolePanel('s-quit');

    // Even if a stray close fires (race condition), there should be no
    // reconnect because the panel state was deleted on close.
    sock.simulateClose(1006);
    controller.testReconnectNow('s-quit');

    expect(wsf.sockets).toHaveLength(1);
  });
});
