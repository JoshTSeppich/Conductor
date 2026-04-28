import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

export interface CopyFallbackModalProps {
  open: boolean;
  sessionName: string;
  content: string;
  onCopy: () => void;
  onClose: () => void;
}

// UI-S04 §FM3 gesture-establishment fallback. Opens when the auto
// writeText() rejected (typically Chrome/Safari NotAllowedError when
// the gesture context is exhausted). Pre-selects the textarea so the
// operator can Cmd+C as a manual escape; the "Copy" button retries
// writeText() — fresh user gesture per ADR §FM3.
export function CopyFallbackModal({
  open,
  sessionName,
  content,
  onCopy,
  onClose,
}: CopyFallbackModalProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Pre-select the handoff text on open so Cmd+C works without
  // additional interaction (ADR §FM3 "pre-selected" requirement).
  useEffect(() => {
    if (open) {
      textareaRef.current?.select();
    }
  }, [open]);

  function handleKeyDown(e: KeyboardEvent<HTMLDialogElement>): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-labelledby="copy-fallback-title"
      onKeyDown={handleKeyDown}
      className="p-4 rounded shadow-lg max-w-lg w-full font-sans bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"
    >
      <h2 id="copy-fallback-title" className="text-lg font-bold mb-2">
        Copy handoff for {sessionName}
      </h2>
      <p className="text-sm mb-2 text-gray-700 dark:text-gray-300">
        Browser blocked the automatic clipboard write. Press the Copy
        button or Cmd+C to copy the pre-selected text.
      </p>
      <textarea
        ref={textareaRef}
        value={content}
        readOnly
        rows={8}
        autoFocus
        className="block w-full font-mono p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 rounded resize-y mb-2"
        aria-label="Handoff content"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 border rounded"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="px-3 py-1 border rounded bg-blue-600 text-white"
        >
          Copy
        </button>
      </div>
    </dialog>
  );
}
