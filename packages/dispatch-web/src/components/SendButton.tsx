import type { ReactNode } from 'react';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';
import { useUIStore } from '../store/ui.js';

export interface SendButtonProps {
  session: SessionResponseV2Type;
}

// Per WEB-T14: trigger surface for SendModal (T15). Disabled when
// session.state !== 'armed' per contract §4.4 (POST returns 422
// for non-armed; UI prevents the call rather than surfacing 422).
// Click opens modal via Zustand store action; modal rendering ships
// in WEB-T15.
export function SendButton({ session }: SendButtonProps): ReactNode {
  const openSendModal = useUIStore((s) => s.openSendModal);
  const disabled = session.state !== 'armed';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => openSendModal()}
      className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Send
    </button>
  );
}
