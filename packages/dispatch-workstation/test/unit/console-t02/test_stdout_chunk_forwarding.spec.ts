// CONSOLE-T02 Cluster 2 — Test 2/4: stdout chunk byte-faithful forwarding.
//
// Per CONDUCTOR_API_CONTRACT.md §4.7.3: WS line message bytes carry either
// utf8 (default) or base64 (for invalid-UTF-8 sequences). The shell forwards
// the bytes payload AS-IS to the webview without re-encoding; CONSOLE-T03
// renderer is responsible for decoding base64 if encoding=='base64'.
//
// Contract reference: §4.7.3 line message shape:
//   { type:'line', stdout_seq:int, bytes:string, encoding:'utf8'|'base64' }
import { describe, it, expect } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import { EmitCaptureSink, MockDaemonClient, makeMockSocketFactory } from './test-helpers.js';

async function openWithBackfillComplete(
  controller: ConsoleIpcController,
  wsf: ReturnType<typeof makeMockSocketFactory>,
  name: string,
): Promise<ReturnType<typeof wsf.lastSocket>> {
  await controller.openConsolePanel(name);
  const sock = wsf.lastSocket();
  sock.simulateOpen();
  sock.simulateMessage({
    type: 'backfill_meta',
    current_seq: 0,
    available_from_seq: 0,
    backfill_complete: true,
  });
  return sock;
}

describe('CONSOLE-T02 cluster 2 — stdout chunk forwarding (byte-faithful)', () => {
  it('utf8 line bytes pass through unmodified to console:stdout-chunk', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    const sock = await openWithBackfillComplete(controller, wsf, 'sx');
    sock.simulateMessage({
      type: 'line',
      stdout_seq: 7,
      bytes: 'こんにちは 🎉\n',
      encoding: 'utf8',
    });

    const chunks = sink.byChannel('console:stdout-chunk');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.payload).toEqual({
      sessionName: 'sx',
      stdoutSeq: 7,
      bytes: 'こんにちは 🎉\n',
      encoding: 'utf8',
    });
  });

  it('base64-encoded bytes are forwarded with encoding="base64" preserved', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    const sock = await openWithBackfillComplete(controller, wsf, 'sb');
    const b64 = Buffer.from([0xff, 0xfe, 0x00, 0x01]).toString('base64');
    sock.simulateMessage({
      type: 'line',
      stdout_seq: 12,
      bytes: b64,
      encoding: 'base64',
    });

    const chunks = sink.byChannel('console:stdout-chunk');
    expect(chunks[0]?.payload).toEqual({
      sessionName: 'sb',
      stdoutSeq: 12,
      bytes: b64,
      encoding: 'base64',
    });
  });

  it('two open panels for distinct sessions never cross-talk on chunk forwarding', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    const sa = await openWithBackfillComplete(controller, wsf, 'a');
    const sb = await openWithBackfillComplete(controller, wsf, 'b');

    sa.simulateMessage({ type: 'line', stdout_seq: 1, bytes: 'A1', encoding: 'utf8' });
    sb.simulateMessage({ type: 'line', stdout_seq: 1, bytes: 'B1', encoding: 'utf8' });
    sa.simulateMessage({ type: 'line', stdout_seq: 2, bytes: 'A2', encoding: 'utf8' });

    const chunks = sink.byChannel('console:stdout-chunk');
    const summary = chunks.map((c) => {
      const p = c.payload as { sessionName: string; bytes: string };
      return `${p.sessionName}:${p.bytes}`;
    });
    expect(summary).toEqual(['a:A1', 'b:B1', 'a:A2']);
  });
});
