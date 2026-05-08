// MB-T21 WB1 (red) — QuickPickButtons skeleton.
// Operator-acked Q-MBT21-2=b (sentinel-marker parse for QUICK_PICK options) +
// Q-MBT21-4=a (click → sendAndStream(optionText) verbatim — bridge passthrough) +
// Q-MBT21-7=a (duplicate UI; do not extract from dispatch-web orchestrator-card).
//
// Contract surface (probe-05 will assert):
//   - When options is undefined/empty → render nothing
//   - One <button data-testid="quick-pick-option-${idx}" type="button"> per option
//   - Container div data-testid="quick-pick-options"
//   - Click fires onSelect(optionText) callback (caller wires to sendAndStream)
//
// WB1 ships skeleton always returning null so probes fail RED. WB3 implements
// the button.map + click handler.

export interface QuickPickButtonsProps {
  readonly options?: readonly string[] | null;
  readonly onSelect: (optionText: string) => void;
}

export function QuickPickButtons(_props: QuickPickButtonsProps): JSX.Element | null {
  // WB1 red: return null → probe-05 testid lookups fail.
  return null;
}
