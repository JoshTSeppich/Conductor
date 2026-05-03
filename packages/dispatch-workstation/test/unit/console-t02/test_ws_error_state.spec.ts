// CONSOLE-T02 Cluster 2 — Test 4/4: WS error state propagation.
//
// Per CONDUCTOR_API_CONTRACT.md §4.7.3: daemon-side may close with codes:
//   4404 SessionNotFound
//   4422 SessionNotRunning
//   1011 internal error
//   1006 abnormal (network failure)
//
// And/or send {type:'error', error:string, error_type?:string} before close.
//
// CONSOLE-T02 forwards both surfaces to console:error so CONSOLE-T03 can
// render the error in the panel; UI rendering of specific error types is
// CONSOLE-T03 territory.
import { describe, it, expect } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

describe('CONSOLE-T02 cluster 2 — WS error state propagation', () => {
  it('socket-level error event emits console:error to webview with error message', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-err');
    const sock = wsf.lastSocket();
    sock.simulateError(new Error('ECONNREFUSED'));

    const errors = sink.byChannel('console:error');
    expect(errors).toHaveLength(1);
    const p = errors[0]?.payload as { sessionName: string; message: string };
    expect(p.sessionName).toBe('s-err');
    expect(p.message).toContain('ECONNREFUSED');
  });

  it('daemon-sent {type:"error"} message emits console:error with error_type passed through', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-daemon-err');
    const sock = wsf.lastSocket();
    sock.simulateOpen();
    sock.simulateMessage({
      type: 'error',
      error: 'no session registered as "s-daemon-err"',
      error_type: 'SessionNotFound',
    });

    const errors = sink.byChannel('console:error');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.payload).toEqual({
      sessionName: 's-daemon-err',
      message: 'no session registered as "s-daemon-err"',
      errorType: 'SessionNotFound',
    });
  });

  it('errors do NOT trigger automatic reconnect when accompanied by close codes 4404/4422 (terminal)', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-terminal');
    const sock = wsf.lastSocket();
    sock.simulateOpen();
    sock.simulateMessage({
      type: 'error',
      error: 'no session',
      error_type: 'SessionNotFound',
    });
    sock.simulateClose(4404, 'SessionNotFound');
    controller.testReconnectNow('s-terminal');

    // Terminal close codes are not retried; the socket count stays at 1.
    expect(wsf.sockets).toHaveLength(1);
  });
});
