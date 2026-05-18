// MB-T-MVP-W3-CONDUCTOR-CHAT WB1 (scaffold) + WB4 (slot composition).
//
// Three-row structural shell for the Component-3 surface
// (operator-vision 23b4362 §"Component 3 — conductor-chat" + arbitration
// commit 94d3e17 §5.3 + design bundle a20d0d4
// docs/design-handoff/conductor-v-mvp/project/conductor-chat.jsx).
//
// WB1 (d0a96bf) shipped the empty scaffold with FROZEN testid anchors
// (conductor-chat-root / -header / -thread / -composer). WB4 extends
// the component additively to fill its slots — the testid'd row anchors
// remain as the structural wrappers and now host content:
//
//   - thread slot: maps the messages prop through WB2 ConductorMessage
//     (a0baa19; user/assistant/dispatch/system roles + typing variant
//     when running > 0)
//   - header + composer slots: render-prop callbacks (renderHeader /
//     renderComposer) so mount.ts can compose operator-CC's Composer
//     (f46649d) + Header (not yet shipped at WB4 author time) without
//     a hard import dependency on cross-session files
//
// WB1 probe-01 contract preserved: root still has exactly 3 children
// (the slot divs), each with its FROZEN testid, in header→thread→composer
// DOM order. Empty-prop render still yields empty slots (probe-01 calls
// with messages=[] and omits render-props → slots empty as in WB1).

import * as React from 'react';
import {
  ConductorMessage,
  type ConductorMessageVariant,
} from './conductor-message.js';

export interface ConductorChatProps {
  messages: ReadonlyArray<ConductorMessageVariant>;
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
  /**
   * Render-prop for the header slot. Returns nodes mounted inside the
   * conductor-chat-header anchor. Default = empty.
   */
  renderHeader?: () => React.ReactNode;
  /**
   * Render-prop for the composer slot. Returns nodes mounted inside the
   * conductor-chat-composer anchor. Default = empty.
   */
  renderComposer?: () => React.ReactNode;
}

export function ConductorChat(props: ConductorChatProps): React.ReactElement {
  const headerContent = props.renderHeader ? props.renderHeader() : null;
  const composerContent = props.renderComposer ? props.renderComposer() : null;
  const running = props.running ?? 0;
  return (
    <div className="conductor" data-testid="conductor-chat-root">
      <div className="conductor-header" data-testid="conductor-chat-header">
        {headerContent}
      </div>
      <div className="conductor-thread" data-testid="conductor-chat-thread">
        {props.messages.map((m, i) => (
          <ConductorMessage key={m.id ?? i} m={m} />
        ))}
        {running > 0 && (
          <ConductorMessage m={{ role: 'typing', running }} />
        )}
      </div>
      <div className="conductor-composer" data-testid="conductor-chat-composer">
        {composerContent}
      </div>
    </div>
  );
}
