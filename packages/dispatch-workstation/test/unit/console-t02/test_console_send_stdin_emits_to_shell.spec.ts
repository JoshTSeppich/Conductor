// CONSOLE-T02 Cluster 1 — Test 3/5: console:send-stdin is webview→shell.
//
// Per vision §10.7 (frozen at eac381e):
//   `console:send-stdin` (webview → shell) — webview forwards operator-typed
//   prompt to shell, shell calls daemon POST /v3/sessions/:name/console/stdin.
//
// The ipcMain handler delegates to controller.handleSendStdin(...). This test
// drives the controller method directly so the assertion is independent of
// electron's ipcMain registration plumbing.
//
// RED state: src/main/console-ipc.ts absent → import fails → FAIL.
// GREEN state: handleSendStdin forwards to daemonClient.sendStdin → PASS.
import { describe, it, expect } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

describe('CONSOLE-T02 cluster 1 — console:send-stdin emits webview→shell', () => {
  it('handleSendStdin forwards (sessionName, bytes, encoding) to daemon POST /stdin', async () => {
    const sink = new EmitCaptureSink();
    const daemon = new MockDaemonClient();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: daemon,
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    daemon.stdinResponse = { accepted: true, stdin_seq: 7 };
    const ack = await controller.handleSendStdin('s1', 'hello\n', 'utf8');

    expect(daemon.stdinCalls).toHaveLength(1);
    expect(daemon.stdinCalls[0]).toEqual({ name: 's1', bytes: 'hello\n', encoding: 'utf8' });
    expect(ack).toEqual({ accepted: true, stdin_seq: 7 });
  });

  it('handleSendStdin defaults encoding to utf8 when omitted', async () => {
    const daemon = new MockDaemonClient();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: daemon,
      wsFactory: wsf.factory,
      emitToWebview: new EmitCaptureSink().emit,
    });

    await controller.handleSendStdin('s1', 'hi');

    expect(daemon.stdinCalls[0]?.encoding).toBe('utf8');
  });

  it('handleSendStdin propagates daemon errors to the caller', async () => {
    const daemon = new MockDaemonClient();
    daemon.stdinError = new Error('BackpressureRejected');
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: daemon,
      wsFactory: wsf.factory,
      emitToWebview: new EmitCaptureSink().emit,
    });

    await expect(controller.handleSendStdin('s1', 'x', 'utf8')).rejects.toThrow(
      'BackpressureRejected',
    );
  });
});
