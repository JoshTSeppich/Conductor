// @vitest-environment happy-dom
//
// MB-T08 Cluster 2 — Test 2/5: clicking Next on step 1 advances to step 2
// (API key entry). Step 2 has a password-style input for the key plus a
// Save button (disabled until something is typed) — same minimum-validation
// shape as the spawn modal's empty-input pattern.
//
// RED state: src/onboarding/onboarding-modal.tsx absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingModal } from '../../../src/onboarding/onboarding-modal.js';

describe('MB-T08 cluster 2 — OnboardingModal step 2 (API key)', () => {
  it('advances to the API key step when Next is clicked', () => {
    render(
      <OnboardingModal
        onSaveApiKey={async () => {}}
        onComplete={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('onboarding-next-button'));
    expect(screen.getByTestId('onboarding-step-api-key')).toBeInTheDocument();
  });

  it('renders a password-style API key input and a Save button on step 2', () => {
    render(
      <OnboardingModal
        onSaveApiKey={async () => {}}
        onComplete={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('onboarding-next-button'));

    const input = screen.getByTestId('onboarding-api-key-input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('password');

    const save = screen.getByTestId('onboarding-api-key-save');
    expect(save).toBeInTheDocument();
    // Disabled until something typed — mirrors MB-F-MB-T04-EMPTY-INPUT-UX
    // suggested pattern (button-disable-when-empty).
    expect(save).toBeDisabled();
  });

  it('enables Save once a non-empty key is typed', () => {
    render(
      <OnboardingModal
        onSaveApiKey={async () => {}}
        onComplete={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('onboarding-next-button'));
    const input = screen.getByTestId('onboarding-api-key-input');
    fireEvent.change(input, { target: { value: 'sk-ant-test' } });
    expect(screen.getByTestId('onboarding-api-key-save')).toBeEnabled();
  });
});
