// @vitest-environment happy-dom
//
// MB-T08 Cluster 2 — Test 1/5: OnboardingModal step 1 (welcome) renders.
//
// Per V3_TICKETS.md MB-T08 + vision §8.1, the modal walks the operator through
// API key entry and first session. Step 1 is a welcome screen that introduces
// the flow and exposes a Next button to advance.
//
// RED state: src/onboarding/onboarding-modal.tsx absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingModal } from '../../../src/onboarding/onboarding-modal.js';

describe('MB-T08 cluster 2 — OnboardingModal step 1 (welcome)', () => {
  it('mounts at step 1 by default and renders a welcome heading', () => {
    render(
      <OnboardingModal
        onSaveApiKey={async () => {}}
        onComplete={() => {}}
      />,
    );
    expect(screen.getByTestId('onboarding-modal-root')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-step-welcome')).toBeInTheDocument();
  });

  it('renders a Next button on step 1', () => {
    render(
      <OnboardingModal
        onSaveApiKey={async () => {}}
        onComplete={() => {}}
      />,
    );
    const next = screen.getByTestId('onboarding-next-button');
    expect(next).toBeInTheDocument();
    expect(next).toBeEnabled();
  });
});
