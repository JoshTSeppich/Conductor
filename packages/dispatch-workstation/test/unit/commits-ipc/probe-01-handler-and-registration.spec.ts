// MB-T22 WB3 GREEN — commits:list IPC handler probe.
//
// Exercises the dep-injected handleCommitsList directly + verifies
// registerCommitsIpc registers the expected channel name with a
// thin handler wrapper.
//
// No Electron boot required — the production registerHandler is the
// real ipcMain.handle, but the test seam injects a fake. Mirrors the
// dep-inject pattern at src/main/audit-modal-ipc.ts +
// src/main/session-kill-ipc.ts.

import { describe, it, expect, vi } from 'vitest';
import {
  handleCommitsList,
  registerCommitsIpc,
  type CommitsListResponse,
} from '../../../src/main/commits-ipc.js';
import type {
  CommitEntry,
  CommitGroup,
} from '../../../src/chat-shell/commits-reader.js';

function commit(overrides: Partial<CommitEntry> = {}): CommitEntry {
  return {
    sha: 'a'.repeat(40),
    shortSha: 'a'.repeat(7),
    subject: 'green(MB-T22): WB3 — impl',
    body: '',
    author: 'Tester',
    authoredAt: '2026-05-07T09:30:00.000-07:00',
    filesChanged: 1,
    insertions: 1,
    deletions: 0,
    sessionAttribution: 'MB-T22',
    ...overrides,
  };
}

describe('MB-T22 WB3 — handleCommitsList: build-doc-config gating', () => {
  it('returns { groups: [], error: ... } when build-doc config is unset', async () => {
    const res = await handleCommitsList(
      { limit: 50 },
      {
        readBuildDocConfig: () => null,
        readCommits: vi.fn(),
      },
    );
    expect(res.groups).toEqual([]);
    expect(res.error).toBeTruthy();
    expect(res.error).toMatch(/build-doc/i);
  });

  it('returns { groups: [], error: ... } when repoRoot is empty', async () => {
    const res = await handleCommitsList(
      { limit: 50 },
      {
        readBuildDocConfig: () => ({
          repoRoot: '',
          relativePath: 'BUILD.md',
          allowedScopes: [],
        }),
        readCommits: vi.fn(),
      },
    );
    expect(res.groups).toEqual([]);
    expect(res.error).toBeTruthy();
  });

  it('does NOT call readCommits when config is unset', async () => {
    const readCommitsSpy = vi.fn();
    await handleCommitsList(
      { limit: 50 },
      {
        readBuildDocConfig: () => null,
        readCommits: readCommitsSpy,
      },
    );
    expect(readCommitsSpy).not.toHaveBeenCalled();
  });
});

describe('MB-T22 WB3 — handleCommitsList: happy path', () => {
  it('passes repoRoot from build-doc config to readCommits', async () => {
    const readCommitsSpy = vi.fn().mockResolvedValue([]);
    await handleCommitsList(
      { limit: 50 },
      {
        readBuildDocConfig: () => ({
          repoRoot: '/some/repo/path',
          relativePath: 'BUILD.md',
          allowedScopes: [],
        }),
        readCommits: readCommitsSpy,
      },
    );
    expect(readCommitsSpy).toHaveBeenCalledTimes(1);
    expect(readCommitsSpy).toHaveBeenCalledWith({
      repoRoot: '/some/repo/path',
      limit: 50,
    });
  });

  it('defaults limit to 50 when omitted from request', async () => {
    const readCommitsSpy = vi.fn().mockResolvedValue([]);
    await handleCommitsList(
      {},
      {
        readBuildDocConfig: () => ({
          repoRoot: '/some/repo/path',
          relativePath: 'BUILD.md',
          allowedScopes: [],
        }),
        readCommits: readCommitsSpy,
      },
    );
    expect(readCommitsSpy).toHaveBeenCalledWith({
      repoRoot: '/some/repo/path',
      limit: 50,
    });
  });

  it('honors caller-supplied limit', async () => {
    const readCommitsSpy = vi.fn().mockResolvedValue([]);
    await handleCommitsList(
      { limit: 10 },
      {
        readBuildDocConfig: () => ({
          repoRoot: '/some/repo/path',
          relativePath: 'BUILD.md',
          allowedScopes: [],
        }),
        readCommits: readCommitsSpy,
      },
    );
    expect(readCommitsSpy).toHaveBeenCalledWith({
      repoRoot: '/some/repo/path',
      limit: 10,
    });
  });

  it('returns { groups } envelope with no error when readCommits resolves', async () => {
    const fixture: readonly CommitGroup[] = [
      {
        label: 'Today',
        commits: [commit({ shortSha: 'aaaaaaa' })],
      },
    ];
    const res = await handleCommitsList(
      { limit: 50 },
      {
        readBuildDocConfig: () => ({
          repoRoot: '/repo',
          relativePath: 'BUILD.md',
          allowedScopes: [],
        }),
        readCommits: vi.fn().mockResolvedValue(fixture),
      },
    );
    expect(res.groups).toEqual(fixture);
    expect(res.error).toBeUndefined();
  });
});

describe('MB-T22 WB3 — registerCommitsIpc: channel registration', () => {
  it('registers a single handler under the "commits:list" channel name', () => {
    const registered = new Map<
      string,
      (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => Promise<CommitsListResponse>
    >();
    const registerHandler = vi.fn(
      (
        channel: string,
        handler: (
          event: Electron.IpcMainInvokeEvent,
          ...args: unknown[]
        ) => Promise<CommitsListResponse>,
      ) => {
        registered.set(channel, handler);
      },
    );
    registerCommitsIpc({
      readBuildDocConfig: () => null,
      readCommits: vi.fn().mockResolvedValue([]),
      registerHandler,
    });
    expect(registerHandler).toHaveBeenCalledTimes(1);
    expect(registered.has('commits:list')).toBe(true);
  });

  it('the registered handler delegates to handleCommitsList with injected deps', async () => {
    const readBuildDocConfig = vi.fn().mockReturnValue({
      repoRoot: '/repo',
      relativePath: 'BUILD.md',
      allowedScopes: [],
    });
    const readCommitsSpy = vi.fn().mockResolvedValue([]);
    let registered:
      | ((
          event: Electron.IpcMainInvokeEvent,
          ...args: unknown[]
        ) => Promise<CommitsListResponse>)
      | undefined;
    registerCommitsIpc({
      readBuildDocConfig,
      readCommits: readCommitsSpy,
      registerHandler: (_channel, h) => {
        registered = h;
      },
    });
    expect(registered).toBeDefined();
    const res = await registered!(
      {} as Electron.IpcMainInvokeEvent,
      { limit: 25 },
    );
    expect(res.groups).toEqual([]);
    expect(res.error).toBeUndefined();
    expect(readCommitsSpy).toHaveBeenCalledWith({
      repoRoot: '/repo',
      limit: 25,
    });
  });
});
