// MB-T17 WB1 probe-00 — autopilot-ipc module loads + exports stub fns.
//
// WB1 RED state: implementations throw 'MB-T17 WB1 stub: ... lands at WB2'.
// This probe verifies the module imports correctly + exports are
// present, without invoking the throw paths beyond the explicit
// "stubs throw" guard. WB2 ADDS probe-01..N with real assertions when
// the implementations land.

import { describe, it, expect } from 'vitest';
import {
  getSessionAutopilotEnabled,
  setSessionAutopilotEnabled,
  AutopilotIpcController,
  createDefaultAutopilotIpcController,
} from '../../../src/main/autopilot-ipc.js';

describe('MB-T17 WB1 — autopilot-ipc module loads', () => {
  it('exports getSessionAutopilotEnabled as a function', () => {
    expect(typeof getSessionAutopilotEnabled).toBe('function');
  });

  it('exports setSessionAutopilotEnabled as a function', () => {
    expect(typeof setSessionAutopilotEnabled).toBe('function');
  });

  it('exports AutopilotIpcController as a class (constructor function)', () => {
    expect(typeof AutopilotIpcController).toBe('function');
  });

  it('exports createDefaultAutopilotIpcController as a function', () => {
    expect(typeof createDefaultAutopilotIpcController).toBe('function');
  });

  it('AutopilotIpcController constructor accepts options without throwing (WB1 no-op)', () => {
    expect(() => {
      new AutopilotIpcController({});
    }).not.toThrow();
    // Empty options ({}) accepted because Q-MBT17-9=a allows the
    // controller to instantiate its own AutopilotLoop on demand.
    expect(() => {
      new AutopilotIpcController();
    }).not.toThrow();
  });

  it('WB1 stubs throw with WB2 deferral message (RED state guard)', async () => {
    await expect(
      getSessionAutopilotEnabled('sess-x'),
    ).rejects.toThrow(/WB2/);
    await expect(
      setSessionAutopilotEnabled('sess-x', true),
    ).rejects.toThrow(/WB2/);
  });

  it('AutopilotIpcController.registerHandlers throws with WB2 deferral message', () => {
    const ctl = new AutopilotIpcController({});
    expect(() => {
      ctl.registerHandlers({ handle: () => {} });
    }).toThrow(/WB2/);
  });

  it('createDefaultAutopilotIpcController throws with WB2 deferral message (RED state guard)', () => {
    expect(() => {
      createDefaultAutopilotIpcController();
    }).toThrow(/WB2/);
  });
});
