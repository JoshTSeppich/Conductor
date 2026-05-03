// CONSOLE-T02 Cluster 1 — Test 4/5: console:signal is webview→shell.
//
// Per vision §10.7 (frozen at eac381e):
//   `console:signal` (webview → shell) — webview requests shell to send a
//   signal to a session's CC process.
//
// Per CONDUCTOR_API_CONTRACT.md §4.7.4 (frozen at a7e8d4f / v2.2.0): allowed
// signal names are SIGINT | SIGTERM | SIGHUP. Unknown names are rejected
// daemon-side with SignalNotSupported; the workstation forwards opaquely.
//
// RED state: src/main/console-ipc.ts absent → import fails → FAIL.
// GREEN state: handleSignal forwards to daemonClient.sendSignal → PASS.
import { describe, it, expect } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

describe('CONSOLE-T02 cluster 1 — console:signal emits webview→shell', () => {
  it('handleSignal forwards (sessionName, signalName) to daemon POST /signal', async () => {
    const daemon = new MockDaemonClient();
    daemon.signalResponse = { accepted: true, dispatch_method: 'pty_byte' };
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: daemon,
      wsFactory: wsf.factory,
      emitToWebview: new EmitCaptureSink().emit,
    });

    const ack = await controller.handleSignal('s1', 'SIGINT');

    expect(daemon.signalCalls).toHaveLength(1);
    expect(daemon.signalCalls[0]).toEqual({ name: 's1', signal: 'SIGINT' });
    expect(ack).toEqual({ accepted: true, dispatch_method: 'pty_byte' });
  });

  it('handleSignal supports SIGTERM and SIGHUP without local filtering', async () => {
    const daemon = new MockDaemonClient();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: daemon,
      wsFactory: wsf.factory,
      emitToWebview: new EmitCaptureSink().emit,
    });

    await controller.handleSignal('s1', 'SIGTERM');
    await controller.handleSignal('s1', 'SIGHUP');

    expect(daemon.signalCalls.map((c) => c.signal)).toEqual(['SIGTERM', 'SIGHUP']);
  });

  it('handleSignal propagates daemon errors to the caller', async () => {
    const daemon = new MockDaemonClient();
    daemon.signalError = new Error('SignalNotSupported');
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: daemon,
      wsFactory: wsf.factory,
      emitToWebview: new EmitCaptureSink().emit,
    });

    await expect(controller.handleSignal('s1', 'SIGINT')).rejects.toThrow('SignalNotSupported');
  });
});
