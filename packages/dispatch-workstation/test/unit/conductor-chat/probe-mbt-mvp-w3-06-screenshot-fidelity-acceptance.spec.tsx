// @vitest-environment happy-dom
//
// MB-T-MVP-W3-CONDUCTOR-CHAT WB5 (gen-7 lane, renumbered) probe-06 —
// screenshot-fidelity acceptance probe (HARD GATE per §5.5 NORMATIVE).
//
// Q-W3-1 = (a) qualitative operator review (NO pixel-diff library in
// 7-WB scope). This probe is a STRUCTURAL FIDELITY oracle that asserts
// the rendered DOM matches the idle-state screenshots from
// docs/design-handoff/conductor-v-mvp/project/screenshots/*.png — a
// machine-checkable subset of "pixel-perfect" matching what is
// reasonably automatable without a rasterizer + diff library.
//
// Q-W3-2 = (a) idle-only WB6 coverage. The 6 screenshots (check.png,
// check2.png, progress.png, progress2.png, progress3.png, progress4.png)
// all show ConductorChat in the same IDLE state:
//   - Header: "C" mark + "Conductor" text only (no filename pill,
//     no pause/resume/cancel chrome — attached=null)
//   - Thread: single assistant intro bubble with the canonical text
//     from design app.jsx:86 ("Conductor ready. Attach a build.md
//     and I'll plan it into ordered steps, hand them to the
//     Orchestrator one at a time, and watch the agent panes for
//     failures.")
//   - Composer: paperclip icon + textarea with the "Drop a build.md…"
//     placeholder + send button DISABLED (empty draft)
//   - NO BuildMdChip in the composer (attached=null)
//   - NO "dispatch next" button (queue empty)
//   - NO typing indicator (running=0)
//
// Attached-state oracle is DEFERRED per Tier-2 followup
// MB-F-W3-WB6-ATTACHED-STATE-SCREENSHOT-COVERAGE-PENDING (operator
// gen-7 HALT-0 ACK ~19:50 MDT; capture missing from design oracle).
//
// Production wiring per Path-B Tier-1 followup
// MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED — this probe mounts via
// tryAutoMountConductorChat with NO bridge (production default) and
// passes operator-CC's Header (6c0686d) via renderHeader render-prop.
// Composer (operator-CC f46649d) is wired internally by mount.ts.

import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import * as React from 'react';
import { tryAutoMountConductorChat } from '../../../src/conductor-chat/mount.js';
import { Header } from '../../../src/conductor-chat/header.js';

// The CANONICAL intro message — verbatim from design app.jsx:86.
// Any drift here would break screenshot fidelity.
const CANONICAL_INTRO =
  "Conductor ready. Attach a build.md and I'll plan it into ordered steps, " +
  'hand them to the Orchestrator one at a time, and watch the agent panes for failures.';

const IDLE_COMPOSER_PLACEHOLDER =
  'Drop a build.md or ask the Conductor to do something…';

function clearMountRoots(): void {
  document
    .querySelectorAll('[id^="conductor-chat-mount-root"]')
    .forEach((n) => n.remove());
  delete (window as unknown as { conductorChatBridge?: unknown })
    .conductorChatBridge;
}

afterEach(() => {
  clearMountRoots();
});

describe('MB-T-MVP-W3 WB5 (gen-7 lane) — screenshot-fidelity acceptance (idle state)', () => {
  it('mounts the surface with NO bridge (production default) and renders the idle shell', () => {
    delete (window as unknown as { conductorChatBridge?: unknown })
      .conductorChatBridge;
    const result = tryAutoMountConductorChat({
      renderHeader: () => React.createElement(Header, { attached: null }),
    });
    expect(result.mounted).toBe(true);
    // The three structural row anchors must be present per the FROZEN
    // testid contract w3-testid-contract-2026-05-17.md §SHELL.
    expect(screen.getByTestId('conductor-chat-root')).toBeInTheDocument();
    expect(screen.getByTestId('conductor-chat-header')).toBeInTheDocument();
    expect(screen.getByTestId('conductor-chat-thread')).toBeInTheDocument();
    expect(screen.getByTestId('conductor-chat-composer')).toBeInTheDocument();
    if (result.mounted) result.dispose();
  });

  it('header renders ONLY the brand (C-mark + "Conductor") when attached=null', () => {
    const result = tryAutoMountConductorChat({
      renderHeader: () => React.createElement(Header, { attached: null }),
    });
    expect(result.mounted).toBe(true);
    const brand = screen.getByTestId('conductor-header-brand');
    expect(brand).toBeInTheDocument();
    expect(brand.textContent).toBe('CConductor');
    // No filename pill / no pause/resume/cancel chrome at idle.
    expect(screen.queryByTestId('conductor-header-filename-pill')).toBeNull();
    expect(screen.queryByTestId('conductor-header-pause')).toBeNull();
    expect(screen.queryByTestId('conductor-header-resume')).toBeNull();
    expect(screen.queryByTestId('conductor-header-cancel')).toBeNull();
    if (result.mounted) result.dispose();
  });

  it('thread shows the canonical assistant intro bubble at idle (matches design app.jsx:86)', () => {
    const result = tryAutoMountConductorChat({
      renderHeader: () => React.createElement(Header, { attached: null }),
    });
    expect(result.mounted).toBe(true);
    const assistant = screen.getByTestId('conductor-message-assistant');
    expect(assistant).toBeInTheDocument();
    // The assistant body holds the intro text. ConductorMessage splits
    // on '\n' into <p>s; the intro is a single line so .textContent
    // matches verbatim.
    const body = screen.getByTestId('conductor-message-assistant-body');
    expect(body.textContent).toBe(CANONICAL_INTRO);
    // Exactly ONE assistant message in the thread (no dispatch / user
    // / system / typing variants at idle).
    expect(
      screen.queryAllByTestId('conductor-message-assistant'),
    ).toHaveLength(1);
    expect(screen.queryByTestId('conductor-message-user')).toBeNull();
    expect(screen.queryByTestId('conductor-message-dispatch')).toBeNull();
    expect(screen.queryByTestId('conductor-message-system')).toBeNull();
    expect(screen.queryByTestId('conductor-message-typing')).toBeNull();
    if (result.mounted) result.dispose();
  });

  it('composer renders paperclip + idle textarea placeholder + DISABLED send', () => {
    const result = tryAutoMountConductorChat({
      renderHeader: () => React.createElement(Header, { attached: null }),
    });
    expect(result.mounted).toBe(true);
    const paperclip = screen.getByTestId('conductor-composer-paperclip');
    expect(paperclip).toBeInTheDocument();
    expect(paperclip.tagName).toBe('BUTTON');
    const textarea = screen.getByTestId('conductor-composer-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
    expect((textarea as HTMLTextAreaElement).placeholder).toBe(
      IDLE_COMPOSER_PLACEHOLDER,
    );
    expect((textarea as HTMLTextAreaElement).value).toBe('');
    const send = screen.getByTestId('conductor-composer-send');
    expect(send).toBeInTheDocument();
    expect((send as HTMLButtonElement).disabled).toBe(true);
    if (result.mounted) result.dispose();
  });

  it('composer omits BuildMdChip and dispatch-next button when nothing is attached', () => {
    const result = tryAutoMountConductorChat({
      renderHeader: () => React.createElement(Header, { attached: null }),
    });
    expect(result.mounted).toBe(true);
    expect(screen.queryByTestId('conductor-composer-buildmd-chip')).toBeNull();
    expect(screen.queryByTestId('conductor-composer-dispatch-next')).toBeNull();
    if (result.mounted) result.dispose();
  });

  it('DOM order matches the design column (header → thread → composer)', () => {
    const result = tryAutoMountConductorChat({
      renderHeader: () => React.createElement(Header, { attached: null }),
    });
    expect(result.mounted).toBe(true);
    const root = screen.getByTestId('conductor-chat-root');
    expect(root.children).toHaveLength(3);
    expect(root.children[0]).toBe(screen.getByTestId('conductor-chat-header'));
    expect(root.children[1]).toBe(screen.getByTestId('conductor-chat-thread'));
    expect(root.children[2]).toBe(screen.getByTestId('conductor-chat-composer'));
    if (result.mounted) result.dispose();
  });

  it('design tokens applied: C-mark uses warm accent color (#f0a062) on dark bg', () => {
    const result = tryAutoMountConductorChat({
      renderHeader: () => React.createElement(Header, { attached: null }),
    });
    expect(result.mounted).toBe(true);
    // The assistant C-mark is from WB2 ConductorMessage which inlines the
    // accent token. Verify inline style matches the design palette.
    const mark = screen.getByTestId('conductor-message-assistant-mark');
    const inlineBg = (mark as HTMLElement).style.background;
    // Browsers may normalize hex to rgb; happy-dom keeps the literal.
    expect(inlineBg.toLowerCase()).toContain('#f0a062');
    expect(mark.textContent).toBe('C');
    if (result.mounted) result.dispose();
  });
});
