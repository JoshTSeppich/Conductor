// MB-T21 WB3 (green) — QuickPickButtons implementation.
// Operator-acked Q-MBT21-2=b (sentinel-marker parse for QUICK_PICK options) +
// Q-MBT21-4=a (click → onSelect(optionText) → caller wires to sendAndStream
// per coarchitectBridge passthrough — preload.mts unchanged) +
// Q-MBT21-7=a (duplicate UI; do not extract from dispatch-web orchestrator-card) +
// Q-MBT21-12=a (inline styles).
//
// Contract surface (probe-05):
//   - options=undefined or [] → render nothing
//   - options=[..2-4 strings] → render <div data-testid="quick-pick-options">
//     containing one <button data-testid="quick-pick-option-${idx}"
//     type="button"> per option
//   - Click fires onSelect(optionText). The 2-4 bound is enforced by
//     parseQuickPickMarker upstream; this component renders whatever it
//     receives but trusts the parser.

export interface QuickPickButtonsProps {
  readonly options?: readonly string[] | null;
  readonly onSelect: (optionText: string) => void;
}

export function QuickPickButtons({
  options,
  onSelect,
}: QuickPickButtonsProps): JSX.Element | null {
  if (!options || options.length === 0) return null;
  return (
    <div
      data-testid="quick-pick-options"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        margin: '4px 4px 4px 36px',
        alignSelf: 'flex-start',
        maxWidth: '85%',
      }}
    >
      {options.map((opt, idx) => (
        <button
          key={idx}
          data-testid={`quick-pick-option-${idx}`}
          type="button"
          onClick={() => onSelect(opt)}
          style={{
            textAlign: 'left',
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #3b82f6',
            background: '#1e3a8a',
            color: '#dbeafe',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily:
              'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
