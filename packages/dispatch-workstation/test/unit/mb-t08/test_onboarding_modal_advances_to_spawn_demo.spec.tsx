// @vitest-environment happy-dom
//
// MB-T08 Cluster 2 — Test 4/5: after Save returns, modal advances to step 3
// (spawn-first-session walkthrough). Step 3 explains the spawn flow and
// exposes a "Got it" / "Done" button that finalizes onboarding.
//
// RED state: src/onboarding/onboarding-modal.tsx absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingModal } from '../../../src/onboarding/onboarding-modal.js';

describe('MB-T08 cluster 2 — OnboardingModal step 3 (spawn walkthrough)', () => {
  it('advances to the spawn-walkthrough step after the API key is saved', async () => {
    const onSaveApiKey = vi.fn().mockResolvedValue(undefined);
    render(
      <OnboardingModal
        onSaveApiKey={onSaveApiKey}
        onComplete={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('onboarding-next-button'));
    fireEvent.change(screen.getByTestId('onboarding-api-key-input'), {
      target: { value: 'sk-ant-secret' },
    });
    fireEvent.click(screen.getByTestId('onboarding-api-key-save'));

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-step-spawn-walkthrough')).toBeInTheDocument();
    });
  });

  it('renders a Done button on step 3', async () => {
    const onSaveApiKey = vi.fn().mockResolvedValue(undefined);
    render(
      <OnboardingModal
        onSaveApiKey={onSaveApiKey}
        onComplete={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('onboarding-next-button'));
    fireEvent.change(screen.getByTestId('onboarding-api-key-input'), {
      target: { value: 'sk-ant-secret' },
    });
    fireEvent.click(screen.getByTestId('onboarding-api-key-save'));

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-done-button')).toBeInTheDocument();
    });
  });
});
