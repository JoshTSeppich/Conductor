// MB-T08 Cluster 2 GREEN — OnboardingModal React component.
//
// Three-step flow per V3_TICKETS.md MB-T08 + vision §8.1:
//   1. Welcome — introduces the modal, single Next button.
//   2. API key entry — password input + Save (disabled until typed).
//   3. Spawn walkthrough — explains the spawn flow + Done button.
//
// Decoupled from Electron via injected callbacks (mirrors fake-bridge pattern
// at console-t03/fake-console-bridge.ts:47). Production wires:
//   - onSaveApiKey → encrypt via safeStorage + persist via api-key-storage.ts
//   - onComplete  → markOnboardingComplete + close onboarding window
import { useState, type FormEvent } from 'react';

type Step = 'welcome' | 'api-key' | 'spawn-walkthrough';

export interface OnboardingModalProps {
  /** Called with plaintext API key. Production wraps with safeStorage. */
  onSaveApiKey: (plaintextKey: string) => Promise<void>;
  /** Called when operator finishes onboarding. Production wires markOnboardingComplete. */
  onComplete: () => void;
}

export function OnboardingModal({ onSaveApiKey, onComplete }: OnboardingModalProps): JSX.Element {
  const [step, setStep] = useState<Step>('welcome');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSaveKey(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!apiKey.trim() || saving) return;
    setSaving(true);
    try {
      await onSaveApiKey(apiKey);
      setStep('spawn-walkthrough');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-testid="onboarding-modal-root" className="onboarding-modal">
      <div className="onboarding-modal-overlay" />
      <div className="onboarding-modal-content">
        {step === 'welcome' && (
          <div data-testid="onboarding-step-welcome">
            <h2>Welcome to Foxworks Workstation</h2>
            <p>
              Workstation orchestrates Claude Code sessions through a build cycle.
              We&apos;ll set up your Anthropic API key and walk you through opening
              your first session.
            </p>
            <button
              data-testid="onboarding-next-button"
              onClick={() => setStep('api-key')}
            >
              Next
            </button>
          </div>
        )}

        {step === 'api-key' && (
          <form data-testid="onboarding-step-api-key" onSubmit={handleSaveKey}>
            <h2>Anthropic API key</h2>
            <p>
              Workstation calls the Anthropic API on your behalf to run the
              orchestrator. Your key is stored encrypted via your OS keychain
              and never leaves your machine.
            </p>
            <input
              data-testid="onboarding-api-key-input"
              type="password"
              placeholder="sk-ant-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoFocus
            />
            <button
              data-testid="onboarding-api-key-save"
              type="submit"
              disabled={apiKey.trim().length === 0 || saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}

        {step === 'spawn-walkthrough' && (
          <div data-testid="onboarding-step-spawn-walkthrough">
            <h2>Open your first session</h2>
            <p>
              Click the green <strong>+ Spawn Session</strong> button in the
              header bar to open a new Claude Code session. Pick a repository
              path and give the session a name. Workstation will spawn the
              session and register it with the daemon.
            </p>
            <button data-testid="onboarding-done-button" onClick={onComplete}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
