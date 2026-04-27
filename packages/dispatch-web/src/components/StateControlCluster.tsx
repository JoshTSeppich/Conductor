import { useState, type ReactNode } from 'react';
import type {
  SessionResponseV2Type,
  State,
} from 'dispatch-core/src/v2/schema.js';
import { usePatchState } from '../query/usePatchState.js';
import { useUIStore } from '../store/ui.js';
import { canTransition } from '../transitions/valid-transitions.js';
import { KillConfirmModal } from './KillConfirmModal.js';

interface ButtonSpec {
  label: string;
  state: State;
}

// Imperative button labels per Decision 5; v1 TUI convention.
const BUTTONS: ButtonSpec[] = [
  { label: 'Arm', state: 'armed' },
  { label: 'Pause', state: 'paused' },
  { label: 'Hold', state: 'held' },
  { label: 'Kill', state: 'killed' },
];

export interface StateControlClusterProps {
  session: SessionResponseV2Type;
  name: string;
}

// Known limitation per operator race observation:
// Cancel-during-flight + new mutation race window. Server may execute
// original mutation between Cancel and new request. Single-in-flight
// design accepted as MVP compromise. Post-MVP refinement candidate:
// mutation-ID tracking + stale-response ignore if observed in
// practice.
export function StateControlCluster({
  session,
  name,
}: StateControlClusterProps): ReactNode {
  const mutation = usePatchState();
  const pushBanner = useUIStore((s) => s.pushBanner);
  const [confirming, setConfirming] = useState(false);

  function pushErrorBanner(err: Error): void {
    pushBanner({
      kind: 'toast',
      severity: 'error',
      title: 'Invalid transition',
      body: err.message,
    });
  }

  function handleClick(target: State): void {
    if (target === 'killed') {
      setConfirming(true);
      return;
    }
    mutation.mutate(
      { name, state: target },
      {
        onError: (err: Error) => pushErrorBanner(err),
      },
    );
  }

  function handleConfirm(): void {
    mutation.mutate(
      { name, state: 'killed' },
      {
        onSuccess: () => setConfirming(false),
        onError: (err: Error) => {
          pushErrorBanner(err);
          setConfirming(false);
        },
      },
    );
  }

  return (
    <div className="flex gap-2 mt-3">
      {BUTTONS.map(({ label, state }) => {
        const allowed = canTransition(session.state, state);
        const disabled = !allowed || mutation.isPending;
        return (
          <button
            key={state}
            type="button"
            disabled={disabled}
            onClick={() => handleClick(state)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        );
      })}
      <KillConfirmModal
        open={confirming}
        sessionName={name}
        pending={mutation.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
