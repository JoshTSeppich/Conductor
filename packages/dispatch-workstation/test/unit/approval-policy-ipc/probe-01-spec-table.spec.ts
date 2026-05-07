// MB-T16 WB2 probe-01 — approval-policy-ipc spec table.
//
// Replaces WB1's probe-00-module-loads.spec.ts (deleted at WB2; the
// throw-guard tests were RED-state markers that fail after WB2 lands
// real implementations). probe-01 is the full assertion suite for:
//   - fetchSessionApprovalPolicy (HTTP GET helper)
//   - putSessionApprovalPolicy (HTTP PUT helper)
//   - ApprovalPolicyIpcController.registerHandlers (IPC dispatch)
//   - createDefaultApprovalPolicyIpcController (production factory)

import { describe, it, expect, vi } from 'vitest';
import {
  fetchSessionApprovalPolicy,
  putSessionApprovalPolicy,
  ApprovalPolicyIpcController,
  createDefaultApprovalPolicyIpcController,
  type ApprovalPolicyIpcMain,
  type ApprovalPolicyIpcOptions,
} from '../../../src/main/approval-policy-ipc.js';

function makeFetchImpl(
  responses: Array<{
    ok?: boolean;
    status?: number;
    statusText?: string;
    body?: unknown;
    rejectWith?: Error;
  }>,
): typeof fetch {
  let call = 0;
  return (async (input: unknown, init?: unknown) => {
    const r = responses[call++];
    if (r.rejectWith) throw r.rejectWith;
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      statusText: r.statusText ?? 'OK',
      json: async () => r.body,
      // capture for assertions
      _capturedInput: input,
      _capturedInit: init,
    } as unknown;
  }) as typeof fetch;
}

const VALID_GET_BODY = {
  session_name: 'sess-x',
  approval_policy: 'medium',
  updated_at: '2026-05-07T12:00:00.000Z',
};

const NO_ROW_BODY = {
  session_name: 'sess-fresh',
  approval_policy: 'medium',
  updated_at: null,
};

describe('MB-T16 WB2 — fetchSessionApprovalPolicy', () => {
  it('happy path: returns parsed GetResponse', async () => {
    const result = await fetchSessionApprovalPolicy(
      'sess-x',
      'http://localhost:7878',
      'token-abc',
      makeFetchImpl([{ body: VALID_GET_BODY }]),
    );
    expect(result).toEqual(VALID_GET_BODY);
  });

  it('parses no-row response (updated_at: null) per Q-MBT13-4=c', async () => {
    const result = await fetchSessionApprovalPolicy(
      'sess-fresh',
      'http://localhost:7878',
      'token-abc',
      makeFetchImpl([{ body: NO_ROW_BODY }]),
    );
    expect(result.approval_policy).toBe('medium');
    expect(result.updated_at).toBeNull();
  });

  it('null token → throws "daemon token unavailable"', async () => {
    await expect(
      fetchSessionApprovalPolicy(
        'sess-x',
        'http://localhost:7878',
        null,
        makeFetchImpl([]),
      ),
    ).rejects.toThrow(/token unavailable/);
  });

  it('non-2xx HTTP → throws with status + statusText', async () => {
    await expect(
      fetchSessionApprovalPolicy(
        'sess-x',
        'http://localhost:7878',
        'token',
        makeFetchImpl([{ ok: false, status: 500, statusText: 'Internal Server Error' }]),
      ),
    ).rejects.toThrow(/500 Internal Server Error/);
  });

  it('400 from daemon → throws with status code', async () => {
    await expect(
      fetchSessionApprovalPolicy(
        '',
        'http://localhost:7878',
        'token',
        makeFetchImpl([{ ok: false, status: 400, statusText: 'Bad Request' }]),
      ),
    ).rejects.toThrow(/400/);
  });

  it('response shape drift → throws "shape invalid"', async () => {
    await expect(
      fetchSessionApprovalPolicy(
        'sess-x',
        'http://localhost:7878',
        'token',
        makeFetchImpl([{ body: { unexpected: 'shape' } }]),
      ),
    ).rejects.toThrow(/shape invalid/);
  });

  it('invalid policy enum value in response → throws', async () => {
    await expect(
      fetchSessionApprovalPolicy(
        'sess-x',
        'http://localhost:7878',
        'token',
        makeFetchImpl([
          {
            body: {
              session_name: 'sess-x',
              approval_policy: 'banana',
              updated_at: null,
            },
          },
        ]),
      ),
    ).rejects.toThrow(/shape invalid/);
  });

  it('network error (fetch rejects) → throws underlying error', async () => {
    await expect(
      fetchSessionApprovalPolicy(
        'sess-x',
        'http://localhost:7878',
        'token',
        makeFetchImpl([{ rejectWith: new Error('ECONNREFUSED') }]),
      ),
    ).rejects.toThrow(/ECONNREFUSED/);
  });

  it('URL encodes special chars in session name', async () => {
    let capturedUrl = '';
    const fetchImpl = (async (input: unknown) => {
      capturedUrl = String(input);
      return { ok: true, status: 200, statusText: 'OK', json: async () => VALID_GET_BODY } as unknown;
    }) as typeof fetch;
    await fetchSessionApprovalPolicy(
      'sess with spaces & ?',
      'http://localhost:7878',
      'token',
      fetchImpl,
    );
    expect(capturedUrl).toBe(
      'http://localhost:7878/v3/sessions/sess%20with%20spaces%20%26%20%3F/approval-policy',
    );
  });

  it('sends X-Conductor-Token header', async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetchImpl = (async (_input: unknown, init?: unknown) => {
      const i = init as { headers?: Record<string, string> };
      capturedHeaders = i.headers ?? {};
      return { ok: true, status: 200, statusText: 'OK', json: async () => VALID_GET_BODY } as unknown;
    }) as typeof fetch;
    await fetchSessionApprovalPolicy(
      'sess-x',
      'http://localhost:7878',
      'tok-xyz',
      fetchImpl,
    );
    expect(capturedHeaders['X-Conductor-Token']).toBe('tok-xyz');
  });
});

describe('MB-T16 WB2 — putSessionApprovalPolicy', () => {
  it('happy path: returns parsed GetResponse', async () => {
    const result = await putSessionApprovalPolicy(
      'sess-x',
      'medium',
      'http://localhost:7878',
      'token',
      makeFetchImpl([{ body: VALID_GET_BODY }]),
    );
    expect(result).toEqual(VALID_GET_BODY);
  });

  it('null token → throws', async () => {
    await expect(
      putSessionApprovalPolicy(
        'sess-x',
        'medium',
        'http://localhost:7878',
        null,
        makeFetchImpl([]),
      ),
    ).rejects.toThrow(/token unavailable/);
  });

  it('non-2xx HTTP → throws with status', async () => {
    await expect(
      putSessionApprovalPolicy(
        'sess-x',
        'medium',
        'http://localhost:7878',
        'token',
        makeFetchImpl([{ ok: false, status: 422, statusText: 'Unprocessable Entity' }]),
      ),
    ).rejects.toThrow(/422/);
  });

  it('shape drift in PUT response → throws', async () => {
    await expect(
      putSessionApprovalPolicy(
        'sess-x',
        'medium',
        'http://localhost:7878',
        'token',
        makeFetchImpl([{ body: { wrong: 'shape' } }]),
      ),
    ).rejects.toThrow(/shape invalid/);
  });

  it('PUT body is { approval_policy: <policy> } JSON-serialized', async () => {
    let capturedInit: { method?: string; body?: string; headers?: Record<string, string> } = {};
    const fetchImpl = (async (_input: unknown, init?: unknown) => {
      capturedInit = (init as typeof capturedInit) ?? {};
      return { ok: true, status: 200, statusText: 'OK', json: async () => VALID_GET_BODY } as unknown;
    }) as typeof fetch;
    await putSessionApprovalPolicy(
      'sess-x',
      'tight',
      'http://localhost:7878',
      'token',
      fetchImpl,
    );
    expect(capturedInit.method).toBe('PUT');
    expect(capturedInit.body).toBe(JSON.stringify({ approval_policy: 'tight' }));
    expect(capturedInit.headers?.['Content-Type']).toBe('application/json');
    expect(capturedInit.headers?.['X-Conductor-Token']).toBe('token');
  });

  it('all 3 enum values round-trip through PUT', async () => {
    for (const policy of ['tight', 'medium', 'loose'] as const) {
      const fetchImpl = makeFetchImpl([
        {
          body: {
            session_name: 'sess-x',
            approval_policy: policy,
            updated_at: '2026-05-07T12:00:00.000Z',
          },
        },
      ]);
      const result = await putSessionApprovalPolicy(
        'sess-x',
        policy,
        'http://localhost:7878',
        'token',
        fetchImpl,
      );
      expect(result.approval_policy).toBe(policy);
    }
  });
});

function makeFakeIpcMain(): {
  ipcMain: ApprovalPolicyIpcMain;
  handlers: Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >;
} {
  const handlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >();
  return {
    ipcMain: {
      handle: (channel, fn) => {
        handlers.set(channel, fn);
      },
    },
    handlers,
  };
}

function makeOptions(
  fetchImpl: typeof fetch,
  token: string | null = 'tok',
): ApprovalPolicyIpcOptions {
  return {
    daemonUrl: 'http://localhost:7878',
    readToken: () => token,
    fetchImpl,
  };
}

describe('MB-T16 WB2 — ApprovalPolicyIpcController.registerHandlers', () => {
  it('registers both workstation:approval-policy-get and -put handlers', () => {
    const ctl = new ApprovalPolicyIpcController(makeOptions(makeFetchImpl([])));
    const fake = makeFakeIpcMain();
    ctl.registerHandlers(fake.ipcMain);
    expect(fake.handlers.has('workstation:approval-policy-get')).toBe(true);
    expect(fake.handlers.has('workstation:approval-policy-put')).toBe(true);
  });

  it('GET handler delegates to fetchSessionApprovalPolicy with controller deps', async () => {
    const ctl = new ApprovalPolicyIpcController(
      makeOptions(makeFetchImpl([{ body: VALID_GET_BODY }])),
    );
    const fake = makeFakeIpcMain();
    ctl.registerHandlers(fake.ipcMain);
    const handler = fake.handlers.get('workstation:approval-policy-get')!;
    const result = await handler({}, { sessionName: 'sess-x' });
    expect(result).toEqual(VALID_GET_BODY);
  });

  it('GET handler throws on missing sessionName', async () => {
    const ctl = new ApprovalPolicyIpcController(makeOptions(makeFetchImpl([])));
    const fake = makeFakeIpcMain();
    ctl.registerHandlers(fake.ipcMain);
    const handler = fake.handlers.get('workstation:approval-policy-get')!;
    await expect(handler({}, {})).rejects.toThrow(/sessionName/);
    await expect(handler({}, { sessionName: '' })).rejects.toThrow(/sessionName/);
    await expect(handler({}, undefined)).rejects.toThrow(/sessionName/);
  });

  it('PUT handler delegates with sessionName + policy', async () => {
    const ctl = new ApprovalPolicyIpcController(
      makeOptions(
        makeFetchImpl([
          {
            body: {
              session_name: 'sess-x',
              approval_policy: 'loose',
              updated_at: '2026-05-07T12:00:00.000Z',
            },
          },
        ]),
      ),
    );
    const fake = makeFakeIpcMain();
    ctl.registerHandlers(fake.ipcMain);
    const handler = fake.handlers.get('workstation:approval-policy-put')!;
    const result = await handler({}, { sessionName: 'sess-x', policy: 'loose' });
    expect((result as { approval_policy: string }).approval_policy).toBe('loose');
  });

  it('PUT handler throws on missing sessionName', async () => {
    const ctl = new ApprovalPolicyIpcController(makeOptions(makeFetchImpl([])));
    const fake = makeFakeIpcMain();
    ctl.registerHandlers(fake.ipcMain);
    const handler = fake.handlers.get('workstation:approval-policy-put')!;
    await expect(handler({}, { policy: 'medium' })).rejects.toThrow(/sessionName/);
    await expect(
      handler({}, { sessionName: '', policy: 'medium' }),
    ).rejects.toThrow(/sessionName/);
  });

  it('PUT handler throws on invalid policy enum value', async () => {
    const ctl = new ApprovalPolicyIpcController(makeOptions(makeFetchImpl([])));
    const fake = makeFakeIpcMain();
    ctl.registerHandlers(fake.ipcMain);
    const handler = fake.handlers.get('workstation:approval-policy-put')!;
    await expect(
      handler({}, { sessionName: 'sess-x', policy: 'banana' }),
    ).rejects.toThrow(/invalid policy/);
    await expect(
      handler({}, { sessionName: 'sess-x', policy: 42 }),
    ).rejects.toThrow(/invalid policy/);
    await expect(
      handler({}, { sessionName: 'sess-x' }),
    ).rejects.toThrow(/invalid policy/);
  });

  it('PUT handler throws on null/non-object payload', async () => {
    const ctl = new ApprovalPolicyIpcController(makeOptions(makeFetchImpl([])));
    const fake = makeFakeIpcMain();
    ctl.registerHandlers(fake.ipcMain);
    const handler = fake.handlers.get('workstation:approval-policy-put')!;
    await expect(handler({}, null)).rejects.toThrow();
    await expect(handler({}, 'string')).rejects.toThrow();
    await expect(handler({}, undefined)).rejects.toThrow();
  });

  it('GET handler reads token via opts.readToken on each call (rotatable)', async () => {
    let tokenCalls = 0;
    const ctl = new ApprovalPolicyIpcController({
      daemonUrl: 'http://localhost:7878',
      readToken: () => {
        tokenCalls++;
        return `tok-${tokenCalls}`;
      },
      fetchImpl: makeFetchImpl([{ body: VALID_GET_BODY }, { body: VALID_GET_BODY }]),
    });
    const fake = makeFakeIpcMain();
    ctl.registerHandlers(fake.ipcMain);
    const handler = fake.handlers.get('workstation:approval-policy-get')!;
    await handler({}, { sessionName: 'sess-1' });
    await handler({}, { sessionName: 'sess-2' });
    expect(tokenCalls).toBe(2);
  });
});

describe('MB-T16 WB2 — createDefaultApprovalPolicyIpcController', () => {
  it('returns an ApprovalPolicyIpcController instance', () => {
    const ctl = createDefaultApprovalPolicyIpcController();
    expect(ctl).toBeInstanceOf(ApprovalPolicyIpcController);
  });

  it('production-factory controller can registerHandlers without throwing', () => {
    const ctl = createDefaultApprovalPolicyIpcController();
    const fake = makeFakeIpcMain();
    expect(() => ctl.registerHandlers(fake.ipcMain)).not.toThrow();
    expect(fake.handlers.size).toBe(2);
  });
});
