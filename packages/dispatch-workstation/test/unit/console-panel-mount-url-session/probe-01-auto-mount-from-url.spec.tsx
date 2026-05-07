// @vitest-environment happy-dom
//
// MB-T12 WB11a probe-01 — console-panel mount.ts URL-query auto-mount:
//   - URL with ?session=X + bridge + #console-root → ConsolePanel mounts
//     bound to session X
//   - URL without ?session= → no mount, returns reason='no-session'
//   - URL with empty ?session= → no mount
//   - No bridge → "no bridge" placeholder text rendered, returns 'no-bridge'
//   - No #console-root → returns 'no-root' (parent absent)
//
// The auto-mount is exposed as `tryAutoMountStandalone()` for testability;
// the bundle's load-time call invokes it with no overrides (production path).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import {
  tryAutoMountStandalone,
} from '../../../src/console-panel/mount.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('MB-T12 WB11a — tryAutoMountStandalone URL-query auto-mount', () => {
  it('URL with ?session=X + bridge + #console-root → ConsolePanel mounts for session X', () => {
    const root = document.createElement('div');
    root.id = 'console-root';
    document.body.appendChild(root);

    const fake = makeFakeConsoleBridge();
    let result!: ReturnType<typeof tryAutoMountStandalone>;
    act(() => {
      result = tryAutoMountStandalone({
        urlString: 'http://localhost/console-panel.html?session=detached-sess',
        bridge: fake.bridge,
        createTerminal: () => makeFakeTerminalAdapter(),
      });
    });

    expect(result.mounted).toBe(true);
    if (result.mounted) {
      expect(result.sessionName).toBe('detached-sess');
    }
    expect(screen.getByTestId('console-panel-root')).toBeInTheDocument();

    // Verify the panel is bound to "detached-sess" by emitting an open
    // event for that session and asserting the header surfaces.
    act(() => {
      fake.emitOpen({ sessionName: 'detached-sess' });
    });
    expect(screen.getByTestId('console-panel-header')).toHaveTextContent(
      'detached-sess',
    );
  });

  it('URL without ?session= query param → no mount; returns reason="no-session"', () => {
    const root = document.createElement('div');
    root.id = 'console-root';
    document.body.appendChild(root);

    const fake = makeFakeConsoleBridge();
    const result = tryAutoMountStandalone({
      urlString: 'http://localhost/console-panel.html',
      bridge: fake.bridge,
    });

    expect(result.mounted).toBe(false);
    if (!result.mounted) {
      expect(result.reason).toBe('no-session');
    }
    expect(screen.queryByTestId('console-panel-root')).not.toBeInTheDocument();
  });

  it('URL with empty ?session= → no mount; returns reason="no-session"', () => {
    const root = document.createElement('div');
    root.id = 'console-root';
    document.body.appendChild(root);

    const fake = makeFakeConsoleBridge();
    const result = tryAutoMountStandalone({
      urlString: 'http://localhost/console-panel.html?session=',
      bridge: fake.bridge,
    });

    expect(result.mounted).toBe(false);
    if (!result.mounted) {
      expect(result.reason).toBe('no-session');
    }
  });

  it('No bridge + #console-root → "no bridge" placeholder text; returns reason="no-bridge"', () => {
    const root = document.createElement('div');
    root.id = 'console-root';
    document.body.appendChild(root);

    const result = tryAutoMountStandalone({
      urlString: 'http://localhost/console-panel.html?session=foo',
      bridge: null,
    });

    expect(result.mounted).toBe(false);
    if (!result.mounted) {
      expect(result.reason).toBe('no-bridge');
    }
    expect(root.textContent).toContain('window.consoleBridge not available');
  });

  it('No #console-root in DOM → returns reason="no-root"', () => {
    const fake = makeFakeConsoleBridge();
    const result = tryAutoMountStandalone({
      urlString: 'http://localhost/console-panel.html?session=foo',
      bridge: fake.bridge,
    });
    expect(result.mounted).toBe(false);
    if (!result.mounted) {
      expect(result.reason).toBe('no-root');
    }
  });

  it('Auto-mounted ConsolePanel filters bridge events by the URL-derived sessionName', () => {
    const root = document.createElement('div');
    root.id = 'console-root';
    document.body.appendChild(root);

    const fake = makeFakeConsoleBridge();
    act(() => {
      tryAutoMountStandalone({
        urlString: 'http://localhost/console-panel.html?session=alpha',
        bridge: fake.bridge,
        createTerminal: () => makeFakeTerminalAdapter(),
      });
    });

    // Event for the wrong session is filtered out.
    act(() => {
      fake.emitOpen({ sessionName: 'beta' });
    });
    expect(screen.queryByTestId('console-panel-header')).not.toBeInTheDocument();

    // Event for the right session opens the panel.
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });
    expect(screen.getByTestId('console-panel-header')).toHaveTextContent('alpha');
  });

  it('createTerminal seam is plumbed through to ConsolePanel', () => {
    const root = document.createElement('div');
    root.id = 'console-root';
    document.body.appendChild(root);

    const fake = makeFakeConsoleBridge();
    const customAdapter = makeFakeTerminalAdapter();
    const createTerminal = vi.fn(() => customAdapter);

    act(() => {
      tryAutoMountStandalone({
        urlString: 'http://localhost/console-panel.html?session=adapter-test',
        bridge: fake.bridge,
        createTerminal,
      });
    });

    act(() => {
      fake.emitOpen({ sessionName: 'adapter-test' });
    });
    // After open, the panel mounts the adapter via createTerminal.
    expect(createTerminal).toHaveBeenCalled();
    expect(customAdapter.openedOn).toBeDefined();
  });

  it('URL with multiple query params still extracts session correctly', () => {
    const root = document.createElement('div');
    root.id = 'console-root';
    document.body.appendChild(root);

    const fake = makeFakeConsoleBridge();
    const result = tryAutoMountStandalone({
      urlString:
        'http://localhost/console-panel.html?theme=dark&session=multi-q&debug=1',
      bridge: fake.bridge,
      createTerminal: () => makeFakeTerminalAdapter(),
    });

    expect(result.mounted).toBe(true);
    if (result.mounted) {
      expect(result.sessionName).toBe('multi-q');
    }
  });
});
