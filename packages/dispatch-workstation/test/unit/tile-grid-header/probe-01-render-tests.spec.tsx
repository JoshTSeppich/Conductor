// @vitest-environment happy-dom
//
// MB-T15 WB3 probe-01 — TileHeader chrome render tests.
//
// Replaces WB1's probe-00-module-loads.spec.tsx (deleted at WB3; the
// stub-attribute test was a RED-state marker that fails after WB3
// lands real chrome rendering). probe-01 covers all acceptance
// criteria from the operator brief:
//   - Per-tile header renders without overflow at min tile width (240px)
//   - Status dot color matches session state (Q-MBT15-5=b)
//   - Model chip uses fixed color palette (Q-MBT15-1=a)
//   - Token meter bar tints at >0.7 warn, >0.85 danger (Q-MBT15-6=a)
//   - Render structure: status dot, session name (truncated), branch,
//     repo, model chip, token meter
//   - Defaults applied per Q-MBT15-2 stubs

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileHeader } from '../../../src/tile-grid/tile-header.js';

describe('MB-T15 WB3 — TileHeader chrome rendering', () => {
  it('renders the tile-header-content root', () => {
    render(<TileHeader sessionName="sess-x" status="open" />);
    expect(screen.getByTestId('tile-header-content')).toBeInTheDocument();
  });

  it('renders without WB1 stub markers (data-mb-t15-stub no longer present)', () => {
    render(<TileHeader sessionName="sess-x" status="open" />);
    const root = screen.getByTestId('tile-header-content');
    expect(root.getAttribute('data-mb-t15-stub')).toBeNull();
  });

  it('renders the session name text content', () => {
    render(<TileHeader sessionName="sess-alpha" status="open" />);
    expect(screen.getByTestId('tile-header-session-name')).toHaveTextContent(
      'sess-alpha',
    );
  });

  it('session-name has title attribute = full name (overflow tooltip)', () => {
    const longName = 'a-very-long-session-name-that-might-truncate';
    render(<TileHeader sessionName={longName} status="open" />);
    expect(screen.getByTestId('tile-header-session-name').getAttribute('title')).toBe(
      longName,
    );
  });

  it('session-name has CSS overflow:hidden + textOverflow:ellipsis (truncation)', () => {
    render(<TileHeader sessionName="sess-x" status="open" />);
    const el = screen.getByTestId('tile-header-session-name');
    expect(el.style.overflow).toBe('hidden');
    expect(el.style.textOverflow).toBe('ellipsis');
    expect(el.style.whiteSpace).toBe('nowrap');
  });
});

describe('MB-T15 WB3 — status dot (Q-MBT15-5=b)', () => {
  it('open → green', () => {
    render(<TileHeader sessionName="x" status="open" />);
    expect(
      screen.getByTestId('tile-header-status-dot').getAttribute('data-status-color'),
    ).toBe('green');
  });

  it('killed → red', () => {
    render(<TileHeader sessionName="x" status="killed" />);
    expect(
      screen.getByTestId('tile-header-status-dot').getAttribute('data-status-color'),
    ).toBe('red');
  });

  it('idle → gray', () => {
    render(<TileHeader sessionName="x" status="idle" />);
    expect(
      screen.getByTestId('tile-header-status-dot').getAttribute('data-status-color'),
    ).toBe('gray');
  });

  it('detached → gray (Q-MBT15-5=b)', () => {
    render(<TileHeader sessionName="x" status="detached" />);
    expect(
      screen.getByTestId('tile-header-status-dot').getAttribute('data-status-color'),
    ).toBe('gray');
  });

  it('renders dot as a small fixed-size element (8x8 with border-radius)', () => {
    render(<TileHeader sessionName="x" status="open" />);
    const dot = screen.getByTestId('tile-header-status-dot');
    expect(dot.style.width).toBe('8px');
    expect(dot.style.height).toBe('8px');
    expect(dot.style.borderRadius).toBe('50%');
  });
});

describe('MB-T15 WB3 — branch name', () => {
  it('default branch is "main" (Q-MBT15-2 stub)', () => {
    render(<TileHeader sessionName="x" status="open" />);
    expect(screen.getByTestId('tile-header-branch-name')).toHaveTextContent('main');
  });

  it('custom branch name renders', () => {
    render(<TileHeader sessionName="x" status="open" branchName="feat/abc" />);
    expect(screen.getByTestId('tile-header-branch-name')).toHaveTextContent(
      'feat/abc',
    );
  });

  it('branch name has truncation styles (overflow + ellipsis)', () => {
    render(<TileHeader sessionName="x" status="open" />);
    const el = screen.getByTestId('tile-header-branch-name');
    expect(el.style.overflow).toBe('hidden');
    expect(el.style.textOverflow).toBe('ellipsis');
    expect(el.style.whiteSpace).toBe('nowrap');
  });
});

describe('MB-T15 WB3 — repo name', () => {
  it('renders when repoName non-empty', () => {
    render(
      <TileHeader sessionName="x" status="open" repoName="foxworks-dispatch" />,
    );
    expect(screen.getByTestId('tile-header-repo-name')).toHaveTextContent(
      'foxworks-dispatch',
    );
  });

  it('NOT rendered when repoName is empty (default)', () => {
    render(<TileHeader sessionName="x" status="open" />);
    expect(screen.queryByTestId('tile-header-repo-name')).not.toBeInTheDocument();
  });

  it('NOT rendered when repoName is explicit empty string', () => {
    render(<TileHeader sessionName="x" status="open" repoName="" />);
    expect(screen.queryByTestId('tile-header-repo-name')).not.toBeInTheDocument();
  });
});

describe('MB-T15 WB3 — model chip (Q-MBT15-1=a)', () => {
  it('default model "claude-sonnet-4-6" → S4.6 chip', () => {
    render(<TileHeader sessionName="x" status="open" />);
    const chip = screen.getByTestId('tile-header-model-chip');
    expect(chip.getAttribute('data-chip')).toBe('S4.6');
    expect(chip).toHaveTextContent('S4.6');
  });

  it('claude-opus-4-7 → O4.7·1M chip', () => {
    render(
      <TileHeader sessionName="x" status="open" model="claude-opus-4-7" />,
    );
    expect(
      screen.getByTestId('tile-header-model-chip').getAttribute('data-chip'),
    ).toBe('O4.7·1M');
  });

  it('claude-haiku-4-5-* → H chip', () => {
    render(
      <TileHeader
        sessionName="x"
        status="open"
        model="claude-haiku-4-5-20251001"
      />,
    );
    expect(
      screen.getByTestId('tile-header-model-chip').getAttribute('data-chip'),
    ).toBe('H');
  });

  it('unknown model SDK name → no chip rendered', () => {
    render(<TileHeader sessionName="x" status="open" model="gpt-4" />);
    expect(screen.queryByTestId('tile-header-model-chip')).not.toBeInTheDocument();
  });

  it('chip has hex backgroundColor from modelChipColor', () => {
    render(<TileHeader sessionName="x" status="open" />);
    const chip = screen.getByTestId('tile-header-model-chip');
    expect(chip.style.backgroundColor).not.toBe('');
  });
});

describe('MB-T15 WB3 — token meter (Q-MBT15-6=a)', () => {
  it('renders the meter outer + fill elements', () => {
    render(<TileHeader sessionName="x" status="open" />);
    expect(screen.getByTestId('tile-header-token-meter')).toBeInTheDocument();
    expect(screen.getByTestId('tile-header-token-meter-fill')).toBeInTheDocument();
  });

  it('default tokensUsed=0 / tokenBudget=200_000 → tint=normal, fill width 0%', () => {
    render(<TileHeader sessionName="x" status="open" />);
    expect(
      screen.getByTestId('tile-header-token-meter').getAttribute('data-tint'),
    ).toBe('normal');
    expect(
      screen.getByTestId('tile-header-token-meter-fill').style.width,
    ).toBe('0%');
  });

  it('ratio 0.5 → tint=normal, fill width=50%', () => {
    render(
      <TileHeader
        sessionName="x"
        status="open"
        tokensUsed={100_000}
        tokenBudget={200_000}
      />,
    );
    expect(
      screen.getByTestId('tile-header-token-meter').getAttribute('data-tint'),
    ).toBe('normal');
    expect(
      screen.getByTestId('tile-header-token-meter-fill').style.width,
    ).toBe('50%');
  });

  it('ratio > 0.7 → tint=warn (Q-MBT15-6=a)', () => {
    render(
      <TileHeader
        sessionName="x"
        status="open"
        tokensUsed={150_000}
        tokenBudget={200_000}
      />,
    );
    expect(
      screen.getByTestId('tile-header-token-meter').getAttribute('data-tint'),
    ).toBe('warn');
  });

  it('ratio > 0.85 → tint=danger (Q-MBT15-6=a)', () => {
    render(
      <TileHeader
        sessionName="x"
        status="open"
        tokensUsed={180_000}
        tokenBudget={200_000}
      />,
    );
    expect(
      screen.getByTestId('tile-header-token-meter').getAttribute('data-tint'),
    ).toBe('danger');
  });

  it('overshoot (tokensUsed > tokenBudget) clamps fill width to 100%', () => {
    render(
      <TileHeader
        sessionName="x"
        status="open"
        tokensUsed={300_000}
        tokenBudget={200_000}
      />,
    );
    expect(
      screen.getByTestId('tile-header-token-meter-fill').style.width,
    ).toBe('100%');
    expect(
      screen.getByTestId('tile-header-token-meter').getAttribute('data-tint'),
    ).toBe('danger');
  });

  it('meter has title attribute showing tokensUsed / tokenBudget', () => {
    render(
      <TileHeader
        sessionName="x"
        status="open"
        tokensUsed={42_000}
        tokenBudget={200_000}
      />,
    );
    const title = screen.getByTestId('tile-header-token-meter').getAttribute('title');
    expect(title).toContain('42,000');
    expect(title).toContain('200,000');
  });
});

describe('MB-T15 WB3 — render at 240px min-width (acceptance)', () => {
  it('header root has overflow:hidden so 240px width truncates rather than breaks', () => {
    const { container } = render(
      <div style={{ width: '240px', maxWidth: '240px' }}>
        <TileHeader
          sessionName="extremely-long-session-name-for-truncation-test"
          status="open"
          branchName="feat/very-long-branch-name-also"
          repoName="foxworks-dispatch-very-long-repo-name"
        />
      </div>,
    );
    const root = container.querySelector('[data-testid="tile-header-content"]');
    expect(root).not.toBeNull();
    if (root) {
      const style = (root as HTMLElement).style;
      expect(style.overflow).toBe('hidden');
      expect(style.display).toBe('flex');
      // happy-dom serializes `minWidth: 0` (number) as '0' without unit;
      // jsdom returns '0px'. Accept both forms.
      expect(['0', '0px']).toContain(style.minWidth);
    }
  });

  it('header chrome flex children have flexShrink set so truncation kicks in', () => {
    render(
      <TileHeader
        sessionName="long-session"
        status="open"
        branchName="long-branch"
        repoName="long-repo"
      />,
    );
    // session-name + branch-name + repo-name should all have flexShrink: 1
    expect(screen.getByTestId('tile-header-session-name').style.flexShrink).toBe(
      '1',
    );
    expect(screen.getByTestId('tile-header-branch-name').style.flexShrink).toBe(
      '1',
    );
    expect(screen.getByTestId('tile-header-repo-name').style.flexShrink).toBe('1');
    // dot + chip + meter should NOT shrink (flexShrink: 0)
    expect(screen.getByTestId('tile-header-status-dot').style.flexShrink).toBe(
      '0',
    );
    expect(screen.getByTestId('tile-header-model-chip').style.flexShrink).toBe(
      '0',
    );
    expect(screen.getByTestId('tile-header-token-meter').style.flexShrink).toBe(
      '0',
    );
  });
});
