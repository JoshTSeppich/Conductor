import { useState, type ReactNode } from 'react';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';
import { useUIStore } from '../store/ui.js';
import { useGetHandoff } from '../query/useGetHandoff.js';
import { CopyFallbackModal } from './CopyFallbackModal.js';

export interface PullButtonProps {
  // Accepted for symmetry with SendButton; unused here because the
  // re-pull is read-only against handoff history (no state-gating
  // per UI-S04 ADR + Decision 2). Including it keeps FocusedDetailPanel's
  // sibling-row API uniform.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  session: SessionResponseV2Type;
}

interface FallbackState {
  open: boolean;
  content: string;
}

// fetchAndParse throws Error("GET /path → <status>") on non-2xx.
// 404 is a normal pre-handoff_written outcome (Decision 5 — info
// toast, not error); other errors route to error toast (Decision 8).
function isNotFound(err: Error): boolean {
  return err.message.endsWith(' → 404');
}

// WEB-T16 — re-pull handoff into clipboard. Per UI-S04 ADR:
//   - §FM2 (success): toast "Copied handoff for <session>"
//   - §FM3 (gesture failure): CopyFallbackModal with pre-selected
//     text + Copy button (retry from fresh gesture)
//   - 404 (no handoff): info toast "No handoff written yet"
//   - other errors: error toast "Couldn't pull handoff"
//
// State-agnostic enable per Decision 2 — pull is orthogonal to the
// state machine; killed sessions still have pullable cached handoff
// from last write before kill.
export function PullButton(_props: PullButtonProps): ReactNode {
  const focusedName = useUIStore((s) => s.focusedSessionName);
  const pushBanner = useUIStore((s) => s.pushBanner);
  const mutation = useGetHandoff();
  const [fallback, setFallback] = useState<FallbackState>({
    open: false,
    content: '',
  });

  function pushSuccessToast(): void {
    pushBanner({
      kind: 'toast',
      severity: 'info',
      title: `Copied handoff for ${focusedName ?? ''}`,
    });
  }

  async function writeAndToast(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      pushSuccessToast();
    } catch {
      // FM3: surface fallback modal with pre-selected text so the
      // operator can Cmd+C or click Copy (fresh gesture per ADR).
      setFallback({ open: true, content });
    }
  }

  function handleClick(): void {
    if (!focusedName) return;
    mutation.mutate(
      { name: focusedName },
      {
        onSuccess: (data) => {
          void writeAndToast(data.content);
        },
        onError: (err: Error) => {
          if (isNotFound(err)) {
            pushBanner({
              kind: 'toast',
              severity: 'info',
              title: 'No handoff written yet',
            });
            return;
          }
          pushBanner({
            kind: 'toast',
            severity: 'error',
            title: "Couldn't pull handoff",
            body: err.message,
          });
        },
      },
    );
  }

  function handleCopyRetry(): void {
    void (async () => {
      try {
        await navigator.clipboard.writeText(fallback.content);
        setFallback({ open: false, content: '' });
        pushSuccessToast();
      } catch {
        // Stay open; operator can try Cmd+C or click Copy again.
      }
    })();
  }

  function handleClose(): void {
    setFallback({ open: false, content: '' });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={mutation.isPending}
        className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Pulling…' : 'Pull'}
      </button>
      <CopyFallbackModal
        open={fallback.open}
        sessionName={focusedName ?? ''}
        content={fallback.content}
        onCopy={handleCopyRetry}
        onClose={handleClose}
      />
    </>
  );
}
