import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useUIStore } from '../store/ui.js';
import { usePostPrompt } from '../query/usePostPrompt.js';

// Native <dialog>-based modal mounted at Layout level. Opens when
// Zustand sendModalOpen is true; closes on success / Cancel /
// Escape. 422 surfaces inline (decision 2 — retry-in-place vs
// T13's toast pattern; "form errors → inline, action errors →
// banner"). Success pushes toast banner; T21 enriches auto-dismiss
// timing.
//
// Known limitations:
//   - body.trim() === '' disables Send (stricter than server
//     schema; MODELED UX choice to block whitespace-only prompts
//     that aren't useful CC inputs)
//   - Cancel-during-pending race per T13 precedent
//   - Network failure folded into inline error path (no separate
//     retry/cancel UX for MVP; WEB-F-send-modal-error-
//     differentiation followup if needed)
export function SendModal(): ReactNode {
  const open = useUIStore((s) => s.sendModalOpen);
  const close = useUIStore((s) => s.closeSendModal);
  const focusedName = useUIStore((s) => s.focusedSessionName);
  const pushBanner = useUIStore((s) => s.pushBanner);
  const mutation = usePostPrompt();
  const [body, setBody] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync parent's `open` prop with native dialog state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Reset form state on each open transition. Decouples close-action
  // from reset-action: 422 stays open + preserves body; close+reopen
  // resets cleanly per Decision 7.
  useEffect(() => {
    if (open) {
      setBody('');
      setErrorMsg(null);
    }
  }, [open]);

  function handleEscape(e: KeyboardEvent<HTMLDialogElement>): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function handleSend(): void {
    if (!focusedName || body.trim() === '') return;
    setErrorMsg(null);
    mutation.mutate(
      { name: focusedName, body },
      {
        onSuccess: () => {
          pushBanner({
            kind: 'toast',
            severity: 'info',
            title: `Prompt sent to ${focusedName}`,
          });
          close();
        },
        onError: (err: Error) => {
          // Both 422 and network failures surface here per Decision 4
          // (folded into single inline-error path for MVP).
          setErrorMsg(err.message);
        },
      },
    );
  }

  if (!focusedName) {
    // Defensive: render an inactive dialog stub. Effect won't open
    // it (open is also false by SendButton-disabled-when-no-focus
    // contract).
    return <dialog ref={dialogRef} aria-hidden />;
  }

  const sendDisabled = body.trim() === '' || mutation.isPending;
  const cancelDisabled = false; // Decision 6: Cancel functional during pending

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-labelledby="send-modal-title"
      onKeyDown={handleEscape}
      className="p-4 rounded shadow-lg max-w-lg w-full font-sans bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"
    >
      <h2 id="send-modal-title" className="text-lg font-bold mb-2">
        Send prompt to {focusedName}
      </h2>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        autoFocus
        spellCheck={false}
        className="block w-full font-mono p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 rounded resize-y mb-2"
        aria-label="Prompt body"
      />
      {errorMsg ? (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400 mb-2"
        >
          {errorMsg}
        </p>
      ) : null}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={close}
          disabled={cancelDisabled}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={sendDisabled}
          className="px-3 py-1 border rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {mutation.isPending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </dialog>
  );
}
