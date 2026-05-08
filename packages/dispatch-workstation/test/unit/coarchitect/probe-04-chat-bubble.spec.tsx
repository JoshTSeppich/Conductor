// @vitest-environment happy-dom
//
// MB-T21 WB1 (red) — ChatBubble component contract tests.
// Operator-acked Q-MBT21-1=a (refactor in coarchitect/) + Q-MBT21-9=a
// (letter-glyph avatars: O for user, C for assistant) + Q-MBT21-12=a
// (inline styles).
//
// Contract asserted:
//   - ChatBubble renders container div with
//       data-testid="chat-bubble-${role}" + data-role="${role}"
//   - Avatar span data-testid="chat-bubble-avatar":
//       user → "O", assistant → "C", system → "S"
//   - Body span data-testid="chat-bubble-body" containing message content
//   - Role-aligned: user bubble has style.alignSelf includes 'end' (right);
//     assistant has 'start' (left)
//
// WB1 red: skeleton returns null → all assertions fail.
// WB2 green: implementation lands JSX + inline style + glyph mapping.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatBubble } from '../../../src/coarchitect/chat-bubble.js';

describe('MB-T21 WB1 — ChatBubble contract', () => {
  it('renders user bubble with chat-bubble-user testid + data-role', () => {
    render(<ChatBubble role="user" content="hello operator world" />);
    const bubble = screen.getByTestId('chat-bubble-user');
    expect(bubble).toBeInTheDocument();
    expect(bubble).toHaveAttribute('data-role', 'user');
  });

  it('renders assistant bubble with chat-bubble-assistant testid + data-role', () => {
    render(<ChatBubble role="assistant" content="conductor reply" />);
    const bubble = screen.getByTestId('chat-bubble-assistant');
    expect(bubble).toBeInTheDocument();
    expect(bubble).toHaveAttribute('data-role', 'assistant');
  });

  it('renders avatar glyph "O" for user role', () => {
    render(<ChatBubble role="user" content="x" />);
    const avatar = screen.getByTestId('chat-bubble-avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent('O');
  });

  it('renders avatar glyph "C" for assistant role', () => {
    render(<ChatBubble role="assistant" content="x" />);
    const avatar = screen.getByTestId('chat-bubble-avatar');
    expect(avatar).toHaveTextContent('C');
  });

  it('renders body containing the message content', () => {
    const text = 'this is the bubble body content';
    render(<ChatBubble role="assistant" content={text} />);
    const body = screen.getByTestId('chat-bubble-body');
    expect(body).toBeInTheDocument();
    expect(body).toHaveTextContent(text);
  });

  it('user bubble aligns to end (right) via inline style', () => {
    render(<ChatBubble role="user" content="x" />);
    const bubble = screen.getByTestId('chat-bubble-user');
    // Q-MBT21-12=a inline-style discipline: alignSelf reflects role layout.
    expect(bubble.style.alignSelf).toMatch(/end/);
  });

  it('assistant bubble aligns to start (left) via inline style', () => {
    render(<ChatBubble role="assistant" content="x" />);
    const bubble = screen.getByTestId('chat-bubble-assistant');
    expect(bubble.style.alignSelf).toMatch(/start/);
  });
});
