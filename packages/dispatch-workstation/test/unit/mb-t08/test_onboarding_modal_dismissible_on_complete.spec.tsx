// @vitest-environment happy-dom
//
// MB-T08 Cluster 2 — Test 5/5: clicking Done on step 3 fires onComplete (which
// production wires to markOnboardingComplete + modal unmount).
//
// Modal is NOT dismissible mid-flow — operator must finish onboarding before
// they can use the app (vision §8.1: "no CLI required at any step" depends
// on having an API key configured). The Done button is the only completion
// path.
//
// RED state: src/onboarding/onboarding-modal.tsx absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingModal } from '../../../src/onboarding/onboarding-modal.js';

describe('MB-T08 cluster 2 — OnboardingModal completion', () => {
  it('fires onComplete when Done is clicked on step 3', async () => {
    const onSaveApiKey = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    render(
      <OnboardingModal
        onSaveApiKey={onSaveApiKey}
        onComplete={onComplete}
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

    fireEvent.click(screen.getByTestId('onboarding-done-button'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not fire onComplete before the Done button is clicked', () => {
    const onSaveApiKey = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    render(
      <OnboardingModal
        onSaveApiKey={onSaveApiKey}
        onComplete={onComplete}
      />,
    );
    // Step 1 → step 2 transition should not fire onComplete.
    fireEvent.click(screen.getByTestId('onboarding-next-button'));
    expect(onComplete).not.toHaveBeenCalled();
  });
});
