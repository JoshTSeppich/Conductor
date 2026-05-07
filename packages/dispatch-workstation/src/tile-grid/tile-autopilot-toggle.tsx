// MB-T17 WB1 — TileAutopilotToggle skeleton.
//
// React toggle component for the per-session autopilot on/off control
// (MB-T17 ticket). WB1 ships a skeleton component that renders a
// placeholder div; WB3 fills in the real chrome (native
// `<input type="checkbox" role="switch">` per Q-MBT17-1=a + useEffect
// fetch on mount + onChange handler with optimistic UI per Q-MBT17-3=a +
// disabled state on bridge-missing or fetch-error per Q-MBT17-2=a).
//
// Per Q-MBT17-4=a operator-confirmed slot-population mechanism:
// TileAutopilotToggle is rendered by TileGridApp via a
// `renderAutopilotSlot` render-prop closure passed down through Tile.
// It lives inside the `<div data-slot="autopilot">` wrapper that
// survives in tile.tsx (currently a self-closing placeholder; WB4
// converts it to render-prop wrapper preserving the testid + data-slot).
//
// Per Q-MBT17-5=a: separate file (mirrors tile-approval-picker.tsx).
// Per Q-MBT17-6=a: bridge methods are OPTIONAL on the renderer-side
// WorkstationBridgeShape; this toggle degrades gracefully when the
// bridge prop is null/undefined (Q-MBT17-2=a "autopilot unavailable").

/** Slim bridge shape consumed by the toggle. TileGridApp adapts the
 *  WorkstationBridgeShape's optional methods into this required shape
 *  only when both are defined; otherwise the toggle receives null. */
export interface TileAutopilotToggleBridge {
  getSessionAutopilotEnabled(
    sessionName: string,
  ): Promise<{ enabled: boolean }>;
  setSessionAutopilotEnabled(
    sessionName: string,
    enabled: boolean,
  ): Promise<{ enabled: boolean }>;
}

export interface TileAutopilotToggleProps {
  readonly sessionName: string;
  /** Optional bridge — null/undefined → toggle renders disabled per
   *  Q-MBT17-2=a. WB3 implements the disabled-with-tooltip path. */
  readonly workstationBridge?: TileAutopilotToggleBridge | null;
}

export function TileAutopilotToggle(_props: TileAutopilotToggleProps): JSX.Element {
  // WB1 placeholder render — WB3 replaces with real <input
  // type="checkbox" role="switch"> chrome.
  return (
    <div data-testid="tile-autopilot-toggle-content" data-mb-t17-stub="true" />
  );
}
