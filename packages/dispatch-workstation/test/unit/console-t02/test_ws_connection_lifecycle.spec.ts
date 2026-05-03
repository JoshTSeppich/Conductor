// CONSOLE-T02 Cluster 2 — Test 1/4: WS connection lifecycle.
//
// Vision §10.7: shell process owns the WS to daemon stream endpoint.
// CONDUCTOR_API_CONTRACT.md §4.7.3: client subscribes with `{type:'subscribe',
// last_seq}` after WS open. CONSOLE-T01 daemon-side validated the handshake.
//
// Per CONDUCTOR_API_CONTRACT.md §4.7.1 / §4.7.3: WS auth uses ?token= query
// param (browser WebSocket cannot send custom headers).
//
// RED state: cluster 1 GREEN treats subscribe as fire-and-forget; cluster 2
// asserts the URL carries the token, the subscribe payload reaches the
// daemon, and closeConsolePanel actually closes the underlying socket.
import { describe, it, expect } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

describe('CONSOLE-T02 cluster 2 — WS connection lifecycle', () => {
  it('openConsolePanel constructs WS at the daemon stream URL with token query', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const daemon = new MockDaemonClient();
    const controller = new ConsoleIpcController({
      daemonClient: daemon,
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('session-x');

    expect(wsf.sockets).toHaveLength(1);
    expect(wsf.lastSocket().url).toBe(daemon.streamUrl('session-x'));
    expect(wsf.lastSocket().url).toContain('token=');
    expect(wsf.lastSocket().url).toContain('/v3/sessions/session-x/console/stream');
  });

  it('on WS open, subscribe message {type:"subscribe", last_seq:0} is sent', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-sub');
    wsf.lastSocket().simulateOpen();

    expect(wsf.lastSocket().sent).toEqual([{ type: 'subscribe', last_seq: 0 }]);
  });

  it('closeConsolePanel triggers WS close with code 1000 (normal)', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-close');
    const sock = wsf.lastSocket();
    expect(sock.closed).toBe(false);

    await controller.closeConsolePanel('s-close');

    expect(sock.closed).toBe(true);
    expect(sock.closeCode).toBe(1000);
  });
});
