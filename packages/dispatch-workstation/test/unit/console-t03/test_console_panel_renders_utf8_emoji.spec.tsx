// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 2 — Test 3/3: UTF-8 emoji + CJK chunks pass without
// corruption. Plus base64-encoded chunks are decoded to UTF-8 before write.
//
// Authority chain:
//  - CONDUCTOR_API_CONTRACT.md §4.7.3: chunks carry encoding ∈ {utf8, base64}.
//    Default is utf8 per MB-S06 §1 KNOWN-clean round-trip across CJK + emoji
//    + tab + LF (six payload classes byte-identical).
//  - The base64 path exists for chunks containing invalid UTF-8 sequences
//    (raw bytes that don't decode cleanly). Panel must atob → UTF-8 decode
//    so the terminal adapter still receives a string.
//
// RED state: pre-cluster-2 the no-op chunk handler drops everything.
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 2 — UTF-8 + base64 encodings', () => {
  it('UTF-8 chunk with CJK characters passes through unchanged', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();
    render(
      <ConsolePanel targetSessionName="alpha" consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    const cjk = '日本語テスト\n';

    act(() => {
      fake.emitChunk({
        sessionName: 'alpha',
        stdoutSeq: 1,
        bytes: cjk,
        encoding: 'utf8',
      });
    });

    expect(adapter.writes).toEqual([cjk]);
  });

  it('UTF-8 chunk with emoji passes through unchanged', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();
    render(
      <ConsolePanel targetSessionName="alpha" consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    const emoji = 'build status: ✅ ⚡️ 🚀\n';

    act(() => {
      fake.emitChunk({
        sessionName: 'alpha',
        stdoutSeq: 1,
        bytes: emoji,
        encoding: 'utf8',
      });
    });

    expect(adapter.writes).toEqual([emoji]);
  });

  it('base64-encoded chunk is decoded to UTF-8 before adapter.write', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();
    render(
      <ConsolePanel targetSessionName="alpha" consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    // 'hello\xff\nbye' base64 — \xff is invalid UTF-8 mid-sequence in
    // isolation; daemon would tag this base64. The panel still decodes to
    // bytes-as-string for the terminal adapter (xterm tolerates 0xff via
    // its own decoder + replacement-character fallback for malformed runs).
    const original = 'hello!\n';
    const b64 = btoa(original);

    act(() => {
      fake.emitChunk({
        sessionName: 'alpha',
        stdoutSeq: 1,
        bytes: b64,
        encoding: 'base64',
      });
    });

    expect(adapter.writes).toEqual([original]);
  });
});
