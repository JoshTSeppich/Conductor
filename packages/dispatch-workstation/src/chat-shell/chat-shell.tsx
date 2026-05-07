// MB-T20 WB2 — Conductor chat panel shell (Family-B tab-host).
// Operator-confirmed Q-MBT20-1=a (tab host) + Q-MBT20-3=a (wrap, do not
// modify coarchitect/chat-panel.tsx) + Q-MBT20-5=a (reuse
// coarchitectBridge — preload.mts unchanged).
//
// Initial tab set: single Chat tab (active by default). MB-T22..T27 add
// Commits/Tasks/toggles/meters tabs. Chat tab body is render-prop slot
// (mirrors MB-T16 picker pattern); WB4 wires renderChatTab to import +
// render coarchitect/chat-panel.js's ChatPanel inline (Q-MBT20-4=a single
// renderer per region).
//
// data-testid contract (probe-01 render tests):
//   - chat-shell-root         outer container (panel chrome)
//   - chat-shell-tab-strip    tab header position (role=tablist)
//   - chat-shell-tab-chat     initial Chat tab (role=tab; aria-selected)
//   - chat-shell-tab-content  active-tab content slot (role=tabpanel)
import type { ReactNode } from 'react';

export interface ChatShellProps {
  readonly renderChatTab?: () => ReactNode;
}

export function ChatShell({ renderChatTab }: ChatShellProps = {}) {
  return (
    <div data-testid="chat-shell-root">
      <div data-testid="chat-shell-tab-strip" role="tablist">
        <button
          data-testid="chat-shell-tab-chat"
          role="tab"
          aria-selected="true"
          type="button"
        >
          Chat
        </button>
      </div>
      <div data-testid="chat-shell-tab-content" role="tabpanel">
        {renderChatTab ? renderChatTab() : null}
      </div>
    </div>
  );
}
