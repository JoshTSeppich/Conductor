// MB-T21 WB2 (green) — ChatBubble implementation.
// Operator-acked Q-MBT21-1=a (refactor in coarchitect/) + Q-MBT21-9=a
// (letter-glyph avatars: O for user, C for assistant, S for system) +
// Q-MBT21-12=a (inline styles).
//
// Visual contract:
//   - User bubble: row-reverse layout, alignSelf=flex-end (right-side); blue
//     body. Avatar glyph "O" on the right (next to the body via reverse).
//   - Assistant bubble: row layout, alignSelf=flex-start (left-side); slate
//     body. Avatar glyph "C" on the left.
//   - System bubble: row layout, alignSelf=flex-start (left-side); muted body.
//     Avatar glyph "S".
//
// Testid contract (probe-04):
//   - data-testid="chat-bubble-${role}" + data-role="${role}" on container
//   - data-testid="chat-bubble-avatar" on glyph span
//   - data-testid="chat-bubble-body" on body span

import type { ReactNode } from 'react';

export interface ChatBubbleProps {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string | ReactNode;
}

const GLYPH: Record<ChatBubbleProps['role'], string> = {
  user: 'O',
  assistant: 'C',
  system: 'S',
};

const ALIGN_SELF: Record<ChatBubbleProps['role'], string> = {
  user: 'flex-end',
  assistant: 'flex-start',
  system: 'flex-start',
};

const AVATAR_BG: Record<ChatBubbleProps['role'], string> = {
  user: '#2563eb',
  assistant: '#374151',
  system: '#6b7280',
};

const BODY_BG: Record<ChatBubbleProps['role'], string> = {
  user: '#1e40af',
  assistant: '#1f2937',
  system: '#374151',
};

export function ChatBubble({ role, content }: ChatBubbleProps): JSX.Element {
  return (
    <div
      data-testid={`chat-bubble-${role}`}
      data-role={role}
      style={{
        alignSelf: ALIGN_SELF[role],
        display: 'flex',
        flexDirection: role === 'user' ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 8,
        margin: '4px 4px',
        maxWidth: '85%',
      }}
    >
      <span
        data-testid="chat-bubble-avatar"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: AVATAR_BG[role],
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          fontFamily:
            'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
          userSelect: 'none',
        }}
      >
        {GLYPH[role]}
      </span>
      <span
        data-testid="chat-bubble-body"
        style={{
          background: BODY_BG[role],
          color: '#e5e7eb',
          padding: '6px 10px',
          borderRadius: 12,
          fontSize: 13,
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {content}
      </span>
    </div>
  );
}
