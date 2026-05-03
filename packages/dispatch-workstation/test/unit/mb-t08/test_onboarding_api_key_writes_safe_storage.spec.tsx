// @vitest-environment happy-dom
//
// MB-T08 Cluster 2 — Test 3/5: clicking Save on step 2 invokes onSaveApiKey
// with the entered plaintext. Production wiring encrypts via Electron
// safeStorage per WORKSTATION_CONTRACT.md §8.3 and writes the encrypted
// buffer; the React component is decoupled from Electron via an injected
// callback (mirrors fake-bridge pattern at console-t03/fake-console-bridge.ts:47).
//
// RED state: src/onboarding/onboarding-modal.tsx absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingModal } from '../../../src/onboarding/onboarding-modal.js';

describe('MB-T08 cluster 2 — OnboardingModal saves API key via injected callback', () => {
  it('invokes onSaveApiKey with the plaintext when Save is clicked', async () => {
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
      expect(onSaveApiKey).toHaveBeenCalledWith('sk-ant-secret');
    });
  });

  it('does not invoke onSaveApiKey when Save is clicked with empty input', () => {
    const onSaveApiKey = vi.fn().mockResolvedValue(undefined);
    render(
      <OnboardingModal
        onSaveApiKey={onSaveApiKey}
        onComplete={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('onboarding-next-button'));
    // Save is disabled when input is empty; clicking it should be a no-op.
    fireEvent.click(screen.getByTestId('onboarding-api-key-save'));
    expect(onSaveApiKey).not.toHaveBeenCalled();
  });
});
