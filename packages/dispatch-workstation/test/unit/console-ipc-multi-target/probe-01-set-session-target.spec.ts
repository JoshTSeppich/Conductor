// MB-T12 WB11a probe-01 — ConsoleIpcController.setSessionTarget routing.
//
// Verifies the multi-target emitToWebview refactor (WB11) — events with a
// payload-attached sessionName route to a per-session target if registered,
// else fall back to the default emit (the original constructor option).
//
// This refactor enables WB11b's main-process detach-tile-ipc.ts to route
// console:* events for a detached session to the detached BrowserWindow's
// webContents instead of the main window.

import { describe, it, expect, vi } from 'vitest';
import { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import {
  EmitCaptureSink,
  MockDaemonClient,
  makeMockSocketFactory,
} from '../console-t02/test-helpers.js';

describe('MB-T12 WB11a — ConsoleIpcController.setSessionTarget routing', () => {
  it('default routing: events go to defaultEmit when no per-session target set', async () => {
    const sink = new EmitCaptureSink();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    await controller.openConsolePanel('default-session');

    const opens = sink.byChannel('console:open');
    expect(opens).toHaveLength(1);
    expect(opens[0].payload).toEqual({ sessionName: 'default-session' });
  });

  it('per-session target routing: events for sess-X go to target, NOT defaultEmit', async () => {
    const sink = new EmitCaptureSink();
    const sessionTarget = vi.fn();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    controller.setSessionTarget('detached-sess', sessionTarget);
    await controller.openConsolePanel('detached-sess');

    expect(sessionTarget).toHaveBeenCalledTimes(1);
    expect(sessionTarget).toHaveBeenCalledWith('console:open', {
      sessionName: 'detached-sess',
    });
    expect(sink.byChannel('console:open')).toHaveLength(0);
  });

  it('mixed routing: target-registered session routes to target; other sessions route to default', async () => {
    const sink = new EmitCaptureSink();
    const sessionTarget = vi.fn();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    controller.setSessionTarget('detached-sess', sessionTarget);
    await controller.openConsolePanel('detached-sess');
    await controller.openConsolePanel('default-sess');

    expect(sessionTarget).toHaveBeenCalledWith('console:open', {
      sessionName: 'detached-sess',
    });
    const defaultOpens = sink.byChannel('console:open');
    expect(defaultOpens).toHaveLength(1);
    expect(defaultOpens[0].payload).toEqual({ sessionName: 'default-sess' });
  });

  it('clearing target: setSessionTarget(name, null) reverts to default routing', async () => {
    const sink = new EmitCaptureSink();
    const sessionTarget = vi.fn();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    controller.setSessionTarget('toggle-sess', sessionTarget);
    controller.setSessionTarget('toggle-sess', null);
    await controller.openConsolePanel('toggle-sess');

    expect(sessionTarget).not.toHaveBeenCalled();
    expect(sink.byChannel('console:open')).toHaveLength(1);
  });

  it('stdout-chunk events route via the same per-session target', async () => {
    const sink = new EmitCaptureSink();
    const sessionTarget = vi.fn();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    controller.setSessionTarget('streaming-sess', sessionTarget);
    await controller.openConsolePanel('streaming-sess');
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
      bytes: 'hello',
      encoding: 'utf8',
    });

    expect(sessionTarget).toHaveBeenCalledWith('console:open', {
      sessionName: 'streaming-sess',
    });
    expect(sessionTarget).toHaveBeenCalledWith(
      'console:stdout-chunk',
      expect.objectContaining({
        sessionName: 'streaming-sess',
        stdoutSeq: 1,
        bytes: 'hello',
      }),
    );
    expect(sink.byChannel('console:open')).toHaveLength(0);
    expect(sink.byChannel('console:stdout-chunk')).toHaveLength(0);
  });

  it('console:close also routes via the per-session target', async () => {
    const sink = new EmitCaptureSink();
    const sessionTarget = vi.fn();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    controller.setSessionTarget('close-sess', sessionTarget);
    await controller.openConsolePanel('close-sess');
    await controller.closeConsolePanel('close-sess');

    expect(sessionTarget).toHaveBeenCalledWith('console:open', {
      sessionName: 'close-sess',
    });
    expect(sessionTarget).toHaveBeenCalledWith('console:close', {
      sessionName: 'close-sess',
    });
    expect(sink.byChannel('console:close')).toHaveLength(0);
  });

  it('registering a target for an unused session does NOT affect other sessions', async () => {
    const sink = new EmitCaptureSink();
    const unusedTarget = vi.fn();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    controller.setSessionTarget('unused', unusedTarget);
    await controller.openConsolePanel('different-sess');

    expect(unusedTarget).not.toHaveBeenCalled();
    expect(sink.byChannel('console:open')).toHaveLength(1);
  });

  it('replacing an existing target overwrites, does not duplicate', async () => {
    const sink = new EmitCaptureSink();
    const target1 = vi.fn();
    const target2 = vi.fn();
    const wsf = makeMockSocketFactory();
    const controller = new ConsoleIpcController({
      daemonClient: new MockDaemonClient(),
      wsFactory: wsf.factory,
      emitToWebview: sink.emit,
    });

    controller.setSessionTarget('replace-sess', target1);
    controller.setSessionTarget('replace-sess', target2);
    await controller.openConsolePanel('replace-sess');

    expect(target1).not.toHaveBeenCalled();
    expect(target2).toHaveBeenCalledTimes(1);
    expect(sink.byChannel('console:open')).toHaveLength(0);
  });
});
