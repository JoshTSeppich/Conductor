// MB-T37 WB1 (red) — ConsoleIpcController.addStdoutObserver + addStreamCloseObserver
// tap probes. Additive scope ratified at HALT 1(a); authored in MB-T37 WB2 GREEN.
//
// Contract asserted (6 probes):
//   Probe 10: addStdoutObserver(fn) → WS line message fires → fn receives
//             (sessionName, bytes) AND emitToWebview still fires (non-redirecting)
//   Probe 11: two observers registered → single chunk → both receive (sessionName, bytes)
//   Probe 12: observer registered → chunk fires fn → disposer called → subsequent chunk
//             does NOT reach removed observer; remaining route unaffected
//   Probe 13: two observers, one disposed → chunk → only surviving observer receives;
//             emitToWebview still fires
//   Probe 14: addStreamCloseObserver(fn) → non-operator WS close → fn receives sessionName
//             AND scheduleReconnect still fires (non-redirecting)
//   Probe 15: stream-close observer → close fires fn → disposer called → subsequent close
//             does NOT reach removed observer
//
// WB1 RED: addStdoutObserver + addStreamCloseObserver are no-op stubs that return a
// no-op disposer and never fire observers. All pre-assertions that observers WERE called
// fail, making every probe RED.
// WB2 GREEN: stubs replaced with real fan-out implementation.
//
// Cross-session note: Terminal Y (MB-T39) consumes addStdoutObserver post-WB2 merge.
// Do NOT use the real implementation until Terminal X WB2 GREEN ships.

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import {
  makeMockSocketFactory,
  MockDaemonClient,
  EmitCaptureSink,
} from '../console-t02/test-helpers.js';

// console-ipc.ts imports ipcMain from electron; mock so module loads in node env.
import { vi } from 'vitest';
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

// ── Helper ────────────────────────────────────────────────────────────────────

function makeController() {
  const sink = new EmitCaptureSink();
  const wsf = makeMockSocketFactory();
  const controller = new ConsoleIpcController({
    daemonClient: new MockDaemonClient(),
    wsFactory: wsf.factory,
    emitToWebview: sink.emit,
  });
  return { controller, sink, wsf };
}

async function openAndSubscribe(controller: ConsoleIpcController, wsf: ReturnType<typeof makeMockSocketFactory>, sessionName: string) {
  await controller.openConsolePanel(sessionName);
  const sock = wsf.lastSocket();
  sock.simulateOpen();
  sock.simulateMessage({ type: 'backfill_meta', current_seq: 0, available_from_seq: 0, backfill_complete: true });
  return sock;
}

// ── Probes ────────────────────────────────────────────────────────────────────

describe('MB-T37 WB1 — ConsoleIpcController.addStdoutObserver tap', () => {

  it('probe-10: observer receives (sessionName, bytes) on WS line message AND emitToWebview also fires (non-redirecting)', async () => {
    const { controller, sink, wsf } = makeController();
    const fn = vi.fn();
    controller.addStdoutObserver(fn);

    const sock = await openAndSubscribe(controller, wsf, 'sess-alpha');
    sock.simulateMessage({ type: 'line', stdout_seq: 1, bytes: 'hello', encoding: 'utf8' });

    // Observer must have been called
    expect(fn).toHaveBeenCalledWith('sess-alpha', 'hello');
    // emitToWebview must also have fired (non-redirecting)
    expect(sink.byChannel('console:stdout-chunk')).toHaveLength(1);
  });

  it('probe-11: two observers registered → single chunk → both receive (sessionName, bytes)', async () => {
    const { controller, wsf } = makeController();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    controller.addStdoutObserver(fn1);
    controller.addStdoutObserver(fn2);

    const sock = await openAndSubscribe(controller, wsf, 'sess-beta');
    sock.simulateMessage({ type: 'line', stdout_seq: 1, bytes: 'multi', encoding: 'utf8' });

    expect(fn1).toHaveBeenCalledWith('sess-beta', 'multi');
    expect(fn2).toHaveBeenCalledWith('sess-beta', 'multi');
  });

  it('probe-12: disposer removes observer; subsequent chunk does not reach removed observer', async () => {
    const { controller, wsf, sink } = makeController();
    const fn = vi.fn();
    const dispose = controller.addStdoutObserver(fn);

    const sock = await openAndSubscribe(controller, wsf, 'sess-gamma');

    // Pre-assert: observer IS called before disposal
    sock.simulateMessage({ type: 'line', stdout_seq: 1, bytes: 'before-dispose', encoding: 'utf8' });
    expect(fn).toHaveBeenCalledWith('sess-gamma', 'before-dispose');

    fn.mockClear();
    dispose();

    // Post-assert: observer is NOT called after disposal
    sock.simulateMessage({ type: 'line', stdout_seq: 2, bytes: 'after-dispose', encoding: 'utf8' });
    expect(fn).not.toHaveBeenCalled();
    // emitToWebview still fires
    expect(sink.byChannel('console:stdout-chunk')).toHaveLength(2);
  });

  it('probe-13: two observers, one disposed → surviving observer still receives; emitToWebview fires', async () => {
    const { controller, wsf, sink } = makeController();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    controller.addStdoutObserver(fn1);
    const dispose2 = controller.addStdoutObserver(fn2);

    const sock = await openAndSubscribe(controller, wsf, 'sess-delta');

    // Pre-assert: both called before disposal
    sock.simulateMessage({ type: 'line', stdout_seq: 1, bytes: 'pre', encoding: 'utf8' });
    expect(fn1).toHaveBeenCalledWith('sess-delta', 'pre');
    expect(fn2).toHaveBeenCalledWith('sess-delta', 'pre');

    fn1.mockClear();
    fn2.mockClear();
    dispose2();

    sock.simulateMessage({ type: 'line', stdout_seq: 2, bytes: 'post', encoding: 'utf8' });
    // fn1 still receives
    expect(fn1).toHaveBeenCalledWith('sess-delta', 'post');
    // fn2 disposed — must NOT receive
    expect(fn2).not.toHaveBeenCalled();
    // emitToWebview still fires
    expect(sink.byChannel('console:stdout-chunk')).toHaveLength(2);
  });
});

describe('MB-T37 WB1 — ConsoleIpcController.addStreamCloseObserver tap', () => {

  it('probe-14: non-operator stream close → fn receives sessionName AND scheduleReconnect still fires (non-redirecting)', async () => {
    const { controller, wsf } = makeController();
    const fn = vi.fn();
    controller.addStreamCloseObserver(fn);

    const sock = await openAndSubscribe(controller, wsf, 'sess-epsilon');

    // Simulate non-operator close (code 1006 = abnormal, retryable → scheduleReconnect)
    sock.simulateClose(1006, 'abnormal close');

    // Observer must have been called with sessionName
    expect(fn).toHaveBeenCalledWith('sess-epsilon');
    // reconnectPending should be set (scheduleReconnect fired) — verify via testReconnectNow
    // If scheduleReconnect didn't fire, testReconnectNow would be a no-op.
    // We verify by opening a second socket (reconnect would create one).
    controller.testReconnectNow('sess-epsilon');
    expect(wsf.sockets).toHaveLength(2); // reconnect created second socket
  });

  it('probe-15: stream-close observer disposer removes observer; subsequent close does not reach removed observer', async () => {
    const { controller, wsf } = makeController();
    const fn = vi.fn();
    const dispose = controller.addStreamCloseObserver(fn);

    const sock = await openAndSubscribe(controller, wsf, 'sess-zeta');

    // Pre-assert: observer IS called before disposal
    sock.simulateClose(1006, 'first close');
    expect(fn).toHaveBeenCalledWith('sess-zeta');

    fn.mockClear();
    dispose();

    // Trigger reconnect so a new socket opens
    controller.testReconnectNow('sess-zeta');
    const sock2 = wsf.lastSocket();
    sock2.simulateOpen();

    // Post-assert: second close does NOT reach disposed observer
    sock2.simulateClose(1006, 'second close');
    expect(fn).not.toHaveBeenCalled();
  });
});
