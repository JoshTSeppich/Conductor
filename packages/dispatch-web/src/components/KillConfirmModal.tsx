import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

export interface KillConfirmModalProps {
  open: boolean;
  sessionName: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Native <dialog> element: free focus trap + Escape + ARIA when
// shown via showModal(). happy-dom 15 supports the basics. Modal
// body text matches TICKETS.md verbatim per Decision 4.
//
// MODELED assumption: body references `fd init` (fd v1 command).
// Verify v2 CLI ships an equivalent recovery command when Session A's
// CLI cluster lands; update body text via TICKETS.md amendment if
// v2 CLI naming diverges.
export function KillConfirmModal({
  open,
  sessionName,
  pending,
  onCancel,
  onConfirm,
}: KillConfirmModalProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync the parent's `open` prop with the native dialog's open state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // showModal() opens with backdrop + focus trap (native).
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Explicit Escape handler. Native <dialog> fires `close` event on
  // Escape in real browsers; happy-dom may not emulate fully. Handling
  // keydown directly + preventDefault() works in both environments.
  function handleKeyDown(e: KeyboardEvent<HTMLDialogElement>): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-labelledby="kill-confirm-title"
      onKeyDown={handleKeyDown}
      className="p-4 rounded shadow-lg max-w-md font-sans bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"
    >
      <h2 id="kill-confirm-title" className="text-lg font-bold mb-2">
        Kill session {sessionName}?
      </h2>
      <p className="mb-4">
        This is terminal — you'll need <code>fd init</code> to create a
        new session with the same name.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="px-3 py-1 border rounded bg-red-600 text-white disabled:opacity-50"
        >
          {pending ? 'Killing…' : 'Confirm'}
        </button>
      </div>
    </dialog>
  );
}
