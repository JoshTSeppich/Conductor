// @vitest-environment happy-dom
//
// §C.1′ WB3 red — FrameShellHeader component
//
// Probes:
//   - renders frame-shell-header-root container
//   - renders A and C tab buttons (data-testid: frame-shell-tab-A, frame-shell-tab-C)
//   - initialMode='C' marks C tab as active (aria-pressed or data-active)
//   - initialMode='A' marks A tab as active
//   - clicking A tab fires onModeChange('A')
//   - clicking C tab fires onModeChange('C')
//   - MixIndicator slot present (mix-indicator-root)
//   - PlanRing slot present (frame-shell-plan-ring)

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  FrameShellHeader,
  type FrameShellHeaderProps,
} from '../../../src/tile-grid/frame-shell-header.js';

function makeProps(overrides: Partial<FrameShellHeaderProps> = {}): FrameShellHeaderProps {
  return {
    initialMode: 'C',
    workstationBridge: null,
    coarchitectBridge: null,
    ...overrides,
  };
}

describe('§C.1′ FrameShellHeader — structure', () => {
  it('renders frame-shell-header-root', () => {
    render(<FrameShellHeader {...makeProps()} />);
    expect(screen.getByTestId('frame-shell-header-root')).toBeInTheDocument();
  });

  it('renders Frame A tab button', () => {
    render(<FrameShellHeader {...makeProps()} />);
    expect(screen.getByTestId('frame-shell-tab-A')).toBeInTheDocument();
  });

  it('renders Frame C tab button', () => {
    render(<FrameShellHeader {...makeProps()} />);
    expect(screen.getByTestId('frame-shell-tab-C')).toBeInTheDocument();
  });

  it('renders MixIndicator slot (mix-indicator-root)', () => {
    render(<FrameShellHeader {...makeProps()} />);
    expect(screen.getByTestId('mix-indicator-root')).toBeInTheDocument();
  });

  it('renders PlanRing slot (frame-shell-plan-ring)', () => {
    render(<FrameShellHeader {...makeProps()} />);
    expect(screen.getByTestId('frame-shell-plan-ring')).toBeInTheDocument();
  });
});

describe('§C.1′ FrameShellHeader — active tab state', () => {
  it('initialMode=C marks C tab active (aria-pressed)', () => {
    render(<FrameShellHeader {...makeProps({ initialMode: 'C' })} />);
    expect(screen.getByTestId('frame-shell-tab-C')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('frame-shell-tab-A')).toHaveAttribute('aria-pressed', 'false');
  });

  it('initialMode=A marks A tab active (aria-pressed)', () => {
    render(<FrameShellHeader {...makeProps({ initialMode: 'A' })} />);
    expect(screen.getByTestId('frame-shell-tab-A')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('frame-shell-tab-C')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('§C.1′ FrameShellHeader — tab switching', () => {
  it('clicking A tab fires onModeChange("A")', () => {
    const onModeChange = vi.fn();
    render(<FrameShellHeader {...makeProps({ initialMode: 'C', onModeChange })} />);
    fireEvent.click(screen.getByTestId('frame-shell-tab-A'));
    expect(onModeChange).toHaveBeenCalledWith('A');
  });

  it('clicking C tab fires onModeChange("C")', () => {
    const onModeChange = vi.fn();
    render(<FrameShellHeader {...makeProps({ initialMode: 'A', onModeChange })} />);
    fireEvent.click(screen.getByTestId('frame-shell-tab-C'));
    expect(onModeChange).toHaveBeenCalledWith('C');
  });

  it('clicking A tab flips aria-pressed to active', () => {
    render(<FrameShellHeader {...makeProps({ initialMode: 'C' })} />);
    fireEvent.click(screen.getByTestId('frame-shell-tab-A'));
    expect(screen.getByTestId('frame-shell-tab-A')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('frame-shell-tab-C')).toHaveAttribute('aria-pressed', 'false');
  });
});
