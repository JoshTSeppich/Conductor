// @vitest-environment happy-dom
//
// MB-T-MVP-W1-EXPANSION-2 WB6 probe-06 — TmuxPaneBody styling.
//
// Asserts the design-handoff tmux-pane.jsx:5-11 TMUX_COLORS + :86-97
// rendering contract WITHIN the existing src/orchestrator-focus-pane/
// territory. NEW component `tmux-pane-body.tsx` renders:
//
//   - ORCH_BANNER (5-line ASCII box, banner-class colored) — mirrors
//     design tmux-content.jsx:163-170
//   - visibleLines (TmuxLine[]) color-mapped per TMUX_COLORS by t-class
//     (sys/ok/warn/err/banner)
//   - Blinking cwd cursor line when status='running' (design jsx:91-97)
//
// NOT in WB6 scope: paneIn/paneOut keyframe animation (W1.5 deferred
// per scope-arbitration §5.6).

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  TmuxPaneBody,
  ORCH_BANNER,
  TMUX_COLORS,
} from '../../../src/orchestrator-focus-pane/tmux-pane-body.js';

describe('MB-T-MVP-W1-EXPANSION-2 WB6 — TmuxPaneBody styling', () => {
  describe('TMUX_COLORS module export (design tmux-pane.jsx:5-11)', () => {
    it('exports 5-class color map (sys/ok/warn/err/banner)', () => {
      expect(TMUX_COLORS.sys).toBeDefined();
      expect(TMUX_COLORS.ok).toBeDefined();
      expect(TMUX_COLORS.warn).toBeDefined();
      expect(TMUX_COLORS.err).toBeDefined();
      expect(TMUX_COLORS.banner).toBeDefined();
    });

    it('banner color resolves to --accent literal (design line 10 banner: var(--accent))', () => {
      expect(TMUX_COLORS.banner).toBe('#f0a062');
    });

    it('ok color resolves to --ok literal (design line 7 ok: var(--ok))', () => {
      expect(TMUX_COLORS.ok).toBe('#6ad4b8');
    });

    it('err color resolves to --err literal (design line 9 err: var(--err))', () => {
      expect(TMUX_COLORS.err).toBe('#e07472');
    });

    it('warn color resolves to --warn literal', () => {
      expect(TMUX_COLORS.warn).toBe('#f0a062');
    });

    it('sys color resolves to --mono literal', () => {
      expect(TMUX_COLORS.sys).toBe('#c8c8cc');
    });
  });

  describe('ORCH_BANNER constant (design tmux-content.jsx:163-170)', () => {
    it('exports 6-entry banner array (5 box lines + trailing blank)', () => {
      expect(ORCH_BANNER).toHaveLength(6);
    });

    it('first 5 entries carry t="banner" class', () => {
      for (let i = 0; i < 5; i++) {
        expect(ORCH_BANNER[i].t).toBe('banner');
      }
    });

    it('first entry is top-edge ┌ box character (design line 164)', () => {
      expect(ORCH_BANNER[0].s).toContain('┌');
    });

    it('last box entry (index 4) is bottom-edge └ box character (design line 168)', () => {
      expect(ORCH_BANNER[4].s).toContain('└');
    });

    it('trailing entry (index 5) is sys-class blank line (design line 169)', () => {
      expect(ORCH_BANNER[5].t).toBe('sys');
      expect(ORCH_BANNER[5].s).toBe('');
    });
  });

  describe('TmuxPaneBody render', () => {
    it('renders root anchor at data-testid="tmux-body"', () => {
      render(<TmuxPaneBody lines={[]} status="starting" />);
      expect(screen.getByTestId('tmux-body')).toBeInTheDocument();
    });

    it('renders ORCH_BANNER ABOVE provided lines when showBanner=true', () => {
      render(
        <TmuxPaneBody
          lines={[{ t: 'sys', s: 'first user line' }]}
          status="starting"
          showBanner
        />,
      );
      const banner = screen.getByTestId('tmux-banner');
      expect(banner).toBeInTheDocument();
      // Banner contains all 6 ORCH_BANNER entries.
      const bannerLines = banner.querySelectorAll('[data-testid^="tmux-line-banner-"]');
      expect(bannerLines).toHaveLength(6);
    });

    it('does NOT render banner when showBanner=false (default)', () => {
      render(<TmuxPaneBody lines={[]} status="starting" />);
      expect(screen.queryByTestId('tmux-banner')).toBeNull();
    });

    it('color-maps each line by t-class per TMUX_COLORS', () => {
      render(
        <TmuxPaneBody
          lines={[
            { t: 'sys', s: 'sys line' },
            { t: 'ok', s: 'ok line' },
            { t: 'warn', s: 'warn line' },
            { t: 'err', s: 'err line' },
            { t: 'banner', s: 'banner line' },
          ]}
          status="starting"
        />,
      );
      const sysLine = screen.getByTestId('tmux-line-0');
      const okLine = screen.getByTestId('tmux-line-1');
      const warnLine = screen.getByTestId('tmux-line-2');
      const errLine = screen.getByTestId('tmux-line-3');
      const bannerLine = screen.getByTestId('tmux-line-4');
      expect((sysLine as HTMLElement).style.color).toBe('rgb(200, 200, 204)');
      expect((okLine as HTMLElement).style.color).toBe('rgb(106, 212, 184)');
      expect((warnLine as HTMLElement).style.color).toBe('rgb(240, 160, 98)');
      expect((errLine as HTMLElement).style.color).toBe('rgb(224, 116, 114)');
      expect((bannerLine as HTMLElement).style.color).toBe('rgb(240, 160, 98)');
    });

    it('renders blinking cwd cursor line when status="running"', () => {
      render(<TmuxPaneBody lines={[]} status="running" cwd="~/workspace" />);
      const prompt = screen.getByTestId('tmux-prompt');
      expect(prompt).toBeInTheDocument();
      expect(prompt.textContent).toContain('~/workspace');
      const cursor = screen.getByTestId('tmux-cursor');
      expect(cursor).toBeInTheDocument();
    });

    it('does NOT render cwd cursor when status != "running"', () => {
      render(<TmuxPaneBody lines={[]} status="starting" cwd="~/workspace" />);
      expect(screen.queryByTestId('tmux-prompt')).toBeNull();
      expect(screen.queryByTestId('tmux-cursor')).toBeNull();
    });

    it('renders cursor with default cwd when prop unset', () => {
      render(<TmuxPaneBody lines={[]} status="running" />);
      const prompt = screen.getByTestId('tmux-prompt');
      // Default cwd renders em-dash or "cwd" placeholder; verify SOME text present.
      expect(prompt.textContent).not.toBe('');
    });

    it('renders done-state footer line when status="done"', () => {
      render(<TmuxPaneBody lines={[]} status="done" />);
      const done = screen.getByTestId('tmux-done');
      expect(done.textContent).toContain('[process exited 0');
    });

    it('renders error-state footer line when status="error"', () => {
      render(<TmuxPaneBody lines={[]} status="error" />);
      const err = screen.getByTestId('tmux-error');
      expect(err.textContent).toContain('[process exited 1');
    });
  });
});
