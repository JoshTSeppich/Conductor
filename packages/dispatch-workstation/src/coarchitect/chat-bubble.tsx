// MB-T21 WB1 (red) — ChatBubble skeleton.
// Operator-acked Q-MBT21-1=a (refactor in place; sub-components in coarchitect/) +
// Q-MBT21-9=a (letter-glyph avatars: O for operator/user, C for conductor/assistant) +
// Q-MBT21-12=a (inline styles; no Tailwind, no stylesheet).
//
// Contract surface (probe-04 will assert):
//   - Container div has data-testid="chat-bubble-${role}" + data-role attr
//   - Avatar span has data-testid="chat-bubble-avatar" + role-specific glyph
//   - Body span has data-testid="chat-bubble-body" + message content
//
// WB1 ships skeleton that returns null so probes fail RED. WB2 implements
// the bubble JSX + inline styles for role-aligned layout.

import type { ReactNode } from 'react';

export interface ChatBubbleProps {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string | ReactNode;
}

export function ChatBubble(_props: ChatBubbleProps): JSX.Element | null {
  // WB1 red: return null → probe-04 testid lookups fail.
  return null;
}
