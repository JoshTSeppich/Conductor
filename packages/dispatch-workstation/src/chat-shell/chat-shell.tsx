// MB-T20 WB1 — Conductor chat panel shell (tab-host) red scaffold.
// Q-MBT20-1=a (Family-B tab-host shell) operator-confirmed 2026-05-07.
// WB2 ships: chat-shell-root container + chat-shell-tab-strip header
// + initial chat-shell-tab-chat tab (active by default) +
// chat-shell-tab-content active-tab content slot. WB4 wires the Chat
// tab body to ../coarchitect/chat-panel.js via direct import (Q-MBT20-3=a
// wrap; coarchitectBridge passthrough per Q-MBT20-5=a).
//
// Red scaffold returns null so test/unit/chat-shell/probe-01 fails
// until WB2 lands the contract markup.
export function ChatShell() {
  return null;
}
