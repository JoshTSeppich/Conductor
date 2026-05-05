// Probe-92 observability infrastructure — gating-helper unit tests.
//
// Verifies the defense-in-depth assertion (operator-arbitrated, scout-
// phase Q3 + Q4): MB_TEST_HOOKS_DAEMON_TOKEN_PATH and MB_USER_DATA_DIR
// MUST require MB_TEST_HOOKS=1 to take effect. Without it, production
// builds ignore the override even if accidentally passed.
//
// Table-driven across the gating combinations:
//   - MB_TEST_HOOKS unset       → override ignored
//   - MB_TEST_HOOKS = ''         → override ignored
//   - MB_TEST_HOOKS = '0'        → override ignored
//   - MB_TEST_HOOKS = '1', no override → undefined (no override to apply)
//   - MB_TEST_HOOKS = '1', empty override → undefined (empty-string treated as unset)
//   - MB_TEST_HOOKS = '1', valid override → returns override
import { describe, it, expect } from 'vitest';
import {
  getDaemonTokenPathOverride,
  getUserDataDirOverride,
} from '../../../src/main/test-hooks-env.js';

describe('Probe-92 obs-infra — getDaemonTokenPathOverride', () => {
  it('returns undefined when MB_TEST_HOOKS is unset (production default)', () => {
    expect(
      getDaemonTokenPathOverride({
        MB_TEST_HOOKS_DAEMON_TOKEN_PATH: '/tmp/probe-92-fake-token',
      }),
    ).toBeUndefined();
  });

  it("returns undefined when MB_TEST_HOOKS=''", () => {
    expect(
      getDaemonTokenPathOverride({
        MB_TEST_HOOKS: '',
        MB_TEST_HOOKS_DAEMON_TOKEN_PATH: '/tmp/probe-92-fake-token',
      }),
    ).toBeUndefined();
  });

  it("returns undefined when MB_TEST_HOOKS='0'", () => {
    expect(
      getDaemonTokenPathOverride({
        MB_TEST_HOOKS: '0',
        MB_TEST_HOOKS_DAEMON_TOKEN_PATH: '/tmp/probe-92-fake-token',
      }),
    ).toBeUndefined();
  });

  it("returns undefined when MB_TEST_HOOKS='1' but override is unset", () => {
    expect(getDaemonTokenPathOverride({ MB_TEST_HOOKS: '1' })).toBeUndefined();
  });

  it("returns undefined when MB_TEST_HOOKS='1' and override is empty string", () => {
    expect(
      getDaemonTokenPathOverride({
        MB_TEST_HOOKS: '1',
        MB_TEST_HOOKS_DAEMON_TOKEN_PATH: '',
      }),
    ).toBeUndefined();
  });

  it("returns the override path when MB_TEST_HOOKS='1' and override set", () => {
    expect(
      getDaemonTokenPathOverride({
        MB_TEST_HOOKS: '1',
        MB_TEST_HOOKS_DAEMON_TOKEN_PATH: '/tmp/probe-92-fake-token',
      }),
    ).toBe('/tmp/probe-92-fake-token');
  });
});

describe('Probe-92 obs-infra — getUserDataDirOverride', () => {
  it('returns undefined when MB_TEST_HOOKS is unset (production default)', () => {
    expect(
      getUserDataDirOverride({
        MB_USER_DATA_DIR: '/tmp/probe-92-fake-userdata',
      }),
    ).toBeUndefined();
  });

  it("returns undefined when MB_TEST_HOOKS=''", () => {
    expect(
      getUserDataDirOverride({
        MB_TEST_HOOKS: '',
        MB_USER_DATA_DIR: '/tmp/probe-92-fake-userdata',
      }),
    ).toBeUndefined();
  });

  it("returns undefined when MB_TEST_HOOKS='0'", () => {
    expect(
      getUserDataDirOverride({
        MB_TEST_HOOKS: '0',
        MB_USER_DATA_DIR: '/tmp/probe-92-fake-userdata',
      }),
    ).toBeUndefined();
  });

  it("returns undefined when MB_TEST_HOOKS='1' but override is unset", () => {
    expect(getUserDataDirOverride({ MB_TEST_HOOKS: '1' })).toBeUndefined();
  });

  it("returns undefined when MB_TEST_HOOKS='1' and override is empty string", () => {
    expect(
      getUserDataDirOverride({
        MB_TEST_HOOKS: '1',
        MB_USER_DATA_DIR: '',
      }),
    ).toBeUndefined();
  });

  it("returns the override path when MB_TEST_HOOKS='1' and override set", () => {
    expect(
      getUserDataDirOverride({
        MB_TEST_HOOKS: '1',
        MB_USER_DATA_DIR: '/tmp/probe-92-fake-userdata',
      }),
    ).toBe('/tmp/probe-92-fake-userdata');
  });
});
