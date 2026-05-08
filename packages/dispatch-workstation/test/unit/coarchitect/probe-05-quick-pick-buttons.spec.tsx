// @vitest-environment happy-dom
//
// MB-T21 WB1 (red) — QuickPickButtons + parseQuickPickMarker contract tests.
// Operator-acked Q-MBT21-2=b (sentinel-marker parse) + Q-MBT21-4=a (click →
// onSelect(optionText) → caller wires to sendAndStream) + Q-MBT21-7=a
// (duplicate UI; do not extract from dispatch-web).
//
// Contract asserted:
//   - QuickPickButtons:
//       * options=undefined or [] → renders nothing (no quick-pick-options
//         container in DOM)
//       * options=["a","b","c"] → renders <div data-testid="quick-pick-options">
//         containing 3 <button data-testid="quick-pick-option-${idx}"
//         type="button">
//       * Click fires onSelect(optionText) callback
//   - parseQuickPickMarker:
//       * Plain text → { stripped: <input>, options: null }
//       * Trailing 'QUICK_PICK: ["a","b"]' line → strips marker line,
//         options = ["a","b"]
//       * Marker before 2-option floor or above 4-option ceiling → options:
//         null (caller treats as no quick-pick)
//
// WB1 red: skeleton returns null + parse passes through → all "with options"
// + "parsed marker" assertions fail.
// WB3 green: implementation lands button.map + click handler + regex parse.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPickButtons } from '../../../src/coarchitect/quick-pick-buttons.js';
import { parseQuickPickMarker } from '../../../src/coarchitect/chat-content-markers.js';

describe('MB-T21 WB1 — QuickPickButtons render + click', () => {
  it('renders nothing when options is undefined', () => {
    const onSelect = vi.fn();
    const { container } = render(<QuickPickButtons onSelect={onSelect} />);
    expect(container.querySelector('[data-testid="quick-pick-options"]')).toBeNull();
  });

  it('renders nothing when options is empty array', () => {
    const onSelect = vi.fn();
    const { container } = render(<QuickPickButtons options={[]} onSelect={onSelect} />);
    expect(container.querySelector('[data-testid="quick-pick-options"]')).toBeNull();
  });

  it('renders quick-pick-options container with one button per option', () => {
    const onSelect = vi.fn();
    render(<QuickPickButtons options={['alpha', 'beta', 'gamma']} onSelect={onSelect} />);
    const container = screen.getByTestId('quick-pick-options');
    expect(container).toBeInTheDocument();
    expect(screen.getByTestId('quick-pick-option-0')).toHaveTextContent('alpha');
    expect(screen.getByTestId('quick-pick-option-1')).toHaveTextContent('beta');
    expect(screen.getByTestId('quick-pick-option-2')).toHaveTextContent('gamma');
  });

  it('option buttons have type="button" (no ambient form submit)', () => {
    const onSelect = vi.fn();
    render(<QuickPickButtons options={['a', 'b']} onSelect={onSelect} />);
    const btn = screen.getByTestId('quick-pick-option-0');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('clicking an option fires onSelect with that option text', () => {
    const onSelect = vi.fn();
    render(<QuickPickButtons options={['alpha', 'beta']} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('quick-pick-option-1'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('beta');
  });
});

describe('MB-T21 WB1 — parseQuickPickMarker', () => {
  it('returns null options for content with no QUICK_PICK marker', () => {
    const content = 'just regular assistant prose with no marker';
    const result = parseQuickPickMarker(content);
    expect(result.options).toBeNull();
    expect(result.stripped).toBe(content);
  });

  it('parses trailing QUICK_PICK marker into options + strips marker line', () => {
    const content =
      'Here are some routing choices.\n\nQUICK_PICK: ["spawn-a", "spawn-b", "skip"]';
    const result = parseQuickPickMarker(content);
    expect(result.options).toEqual(['spawn-a', 'spawn-b', 'skip']);
    expect(result.stripped).toBe('Here are some routing choices.');
  });

  it('rejects QUICK_PICK with fewer than 2 options', () => {
    const content = 'msg\n\nQUICK_PICK: ["only-one"]';
    const result = parseQuickPickMarker(content);
    expect(result.options).toBeNull();
  });

  it('rejects QUICK_PICK with more than 4 options', () => {
    const content =
      'msg\n\nQUICK_PICK: ["a", "b", "c", "d", "e"]';
    const result = parseQuickPickMarker(content);
    expect(result.options).toBeNull();
  });

  it('strips trailing whitespace from stripped content', () => {
    const content = 'body text  \n\n  QUICK_PICK: ["x", "y"]';
    const result = parseQuickPickMarker(content);
    expect(result.options).toEqual(['x', 'y']);
    expect(result.stripped).toBe('body text');
  });
});
