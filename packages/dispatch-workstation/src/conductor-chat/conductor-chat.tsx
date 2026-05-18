// MB-T-MVP-W3-CONDUCTOR-CHAT WB1 — ConductorChat scaffold.
//
// Three-row structural shell for the Component-3 surface
// (operator-vision 23b4362 §"Component 3 — conductor-chat" + arbitration
// commit 94d3e17 §5.3 + design bundle a20d0d4
// docs/design-handoff/conductor-v-mvp/project/conductor-chat.jsx).
//
// WB1 ships the shell only: three named row anchors at stable testids
// (header / thread / composer) in DOM order. Content slots are empty here
// and filled by later WBs (WB2 = message role rendering into thread;
// WB3 = composer paperclip+textarea+send; WB4 = header brand+controls).

import * as React from 'react';

export interface ConductorChatProps {
  messages: ReadonlyArray<unknown>;
  onSend: (text: string) => void;
  attached?: { name: string; steps: number } | null;
  queue?: ReadonlyArray<unknown>;
  running?: number;
  total?: number;
  paused?: boolean;
  onAttach?: () => void;
  onDetach?: () => void;
  onDispatchNext?: () => void;
  onTogglePause?: () => void;
  onCancel?: () => void;
}

export function ConductorChat(_props: ConductorChatProps): React.ReactElement {
  return (
    <div className="conductor" data-testid="conductor-chat-root">
      <div className="conductor-header"   data-testid="conductor-chat-header" />
      <div className="conductor-thread"   data-testid="conductor-chat-thread" />
      <div className="conductor-composer" data-testid="conductor-chat-composer" />
    </div>
  );
}
