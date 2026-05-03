// CONSOLE-T02 Cluster 1 — Test 5/5: console:stdout-chunk is shell→webview.
//
// Per vision §10.7 (frozen at eac381e):
//   `console:stdout-chunk` (shell → webview) — shell forwards a chunk of
//   STDOUT bytes from the daemon WS stream to the webview for rendering.
//
// Per CONDUCTOR_API_CONTRACT.md §4.7.3 (frozen at a7e8d4f / v2.2.0): the WS
// emits {type:'line', stdout_seq, bytes, encoding}. The shell unwraps these
// and forwards to the webview as console:stdout-chunk events keyed to the
// session that the WS is bound to.
//
// RED state: src/main/console-ipc.ts absent → import fails → FAIL.
// GREEN state: WS line message → emitToWebview console:stdout-chunk → PASS.
import { describe, it, expect } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

describe('CONSOLE-T02 cluster 1 — console:stdout-chunk emits shell→webview', () => {
  it('a daemon WS line message is forwarded as console:stdout-chunk with bytes', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('stream-test');
    const sock = wsf.lastSocket();
    sock.simulateOpen();
    sock.simulateMessage({
      type: 'backfill_meta',
      current_seq: 0,
      available_from_seq: 0,
      backfill_complete: true,
    });

    sock.simulateMessage({
      type: 'line',
      stdout_seq: 1,
      bytes: 'hello world\n',
      encoding: 'utf8',
    });

    const chunks = sink.byChannel('console:stdout-chunk');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.payload).toEqual({
      sessionName: 'stream-test',
      stdoutSeq: 1,
      bytes: 'hello world\n',
      encoding: 'utf8',
    });
  });

  it('multiple daemon WS line messages emit one console:stdout-chunk each in order', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('s-multi');
    const sock = wsf.lastSocket();
    sock.simulateOpen();
    sock.simulateMessage({
      type: 'backfill_meta',
      current_seq: 0,
      available_from_seq: 0,
      backfill_complete: true,
    });

    for (const seq of [1, 2, 3]) {
      sock.simulateMessage({
        type: 'line',
        stdout_seq: seq,
        bytes: `line-${seq}`,
        encoding: 'utf8',
      });
    }

    const chunks = sink.byChannel('console:stdout-chunk');
    expect(chunks.map((c) => (c.payload as { stdoutSeq: number }).stdoutSeq)).toEqual([1, 2, 3]);
  });
});
