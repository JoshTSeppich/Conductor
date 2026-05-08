import { useState, type ReactNode } from 'react';
import type {
  CardOutput,
  MultiChoiceCardOutput,
  SendPromptToSessionOutput,
  SpawnSessionOutput,
  KillSessionOutput,
  PullHandoffFromSessionOutput,
  AssignTaskOutput,
} from 'dispatch-core/src/v3/schema.js';

type ActionVariantCard =
  | SendPromptToSessionOutput
  | SpawnSessionOutput
  | KillSessionOutput
  | PullHandoffFromSessionOutput
  | AssignTaskOutput;

type AnyCard = CardOutput | MultiChoiceCardOutput | ActionVariantCard;

// Action types that mutate session/daemon state per
// WORKSTATION_CONTRACT.md §3.3 ActionTypeEnum. read-file is the only
// read-only entry; everything else is state-mutating, so per WC §5.3
// + ratified P-0 leftover Q3 the Approve pill gates on free-form
// non-empty for state-mutating actions.
const READ_ONLY_ACTIONS: ReadonlySet<CardOutput['action']> = new Set([
  'read-file',
]);

export interface OrchestratorCardProps {
  card_id: string;
  card: AnyCard;
  /** MB-T11-A: whether this action variant requires operator approval before firing. */
  approvalRequired?: boolean;
  /**
   * Lineage line per WC §5.4: when this card supersedes prior pending
   * cards, the IPC envelope's `superseded_card_ids` is surfaced
   * "supersedes: <id>, <id>" alongside the action proposal. Optional
   * because not every card supersedes prior cards.
   */
  superseded_card_ids?: ReadonlyArray<string>;
  /**
   * True when this card has been moved to the STALE column because a
   * later card superseded it. Visual treatment per WC §5.4 + §5.5.
   * Cluster 5 wires this from the orchestrator-card-superseded IPC
   * envelope on receipt.
   */
  is_stale?: boolean;
  /**
   * True when the operator declined the card and the audit-write
   * confirmed. Pills + free-form field collapse to a "Declined"
   * lifecycle-outcome badge so the decision is visible without taking
   * up active card real-estate. Parent owns the actual
   * remove-from-list behavior; this is the in-place visual surface.
   */
  is_dismissed?: boolean;
  onApprove?: (free_form_text: string) => void;
  onDecline?: (reason: string) => void;
  onMultiChoiceSelect?: (
    selected_index: number,
    free_form_text: string | null,
  ) => void;
}

// WC §5.2 visual distinction: subtle blue tint background that
// discriminates orchestrator cards from white CC-session cards.
// SessionCard uses bg-white / dark:bg-gray-900 (SessionCard.tsx:85);
// orchestrator cards must NOT collide with that token.
const ORCHESTRATOR_CARD_TINT_CLASSES =
  'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';

const STALE_CLASSES = 'opacity-60 grayscale';
const DISMISSED_CLASSES = 'opacity-50';

const ACTION_TYPE_PILL_CLASSES =
  'text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
const SESSION_NAME_CLASSES = 'text-sm font-medium font-mono truncate';
const RATIONALE_CLASSES = 'text-xs text-gray-700 dark:text-gray-300';

function CardActionProposal({
  card,
}: {
  card: CardOutput;
}): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          data-testid="orchestrator-card-action"
          className={ACTION_TYPE_PILL_CLASSES}
        >
          {card.action}
        </span>
        <span className="text-sm font-medium truncate">{card.target}</span>
      </div>
      <p className={RATIONALE_CLASSES}>
        {card.rationale}
      </p>
    </div>
  );
}

function CardVariant({
  card_id,
  card,
  onApprove,
  onDecline,
}: {
  card_id: string;
  card: CardOutput;
  onApprove?: OrchestratorCardProps['onApprove'];
  onDecline?: OrchestratorCardProps['onDecline'];
}): ReactNode {
  const [freeForm, setFreeForm] = useState('');
  const trimmed = freeForm.trim();
  const isStateMutating = !READ_ONLY_ACTIONS.has(card.action);
  // WC §5.3: state-mutating Approve gates on non-empty free-form;
  // Decline always gates on non-empty free-form (required reason).
  const approveDisabled = isStateMutating && trimmed === '';
  const declineDisabled = trimmed === '';

  const inputId = `orchestrator-card-${card_id}-freeform`;
  return (
    <>
      <CardActionProposal card={card} />
      <label htmlFor={inputId} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
        Add notes or modifications
      </label>
      <textarea
        id={inputId}
        data-testid="orchestrator-card-freeform"
        placeholder={card.free_form_prompt}
        value={freeForm}
        onChange={(e) => setFreeForm(e.target.value)}
        rows={2}
        className="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      />
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          data-testid="orchestrator-card-decline"
          disabled={declineDisabled}
          onClick={() => onDecline?.(trimmed)}
          className="flex-1 px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200 disabled:bg-red-50 disabled:text-red-300 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800 dark:disabled:bg-red-950 dark:disabled:text-red-700"
        >
          Decline
        </button>
        <button
          type="button"
          data-testid="orchestrator-card-approve"
          disabled={approveDisabled}
          onClick={() => onApprove?.(trimmed)}
          className="flex-1 px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:bg-green-50 disabled:text-green-300 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800 dark:disabled:bg-green-950 dark:disabled:text-green-700"
        >
          Approve
        </button>
      </div>
    </>
  );
}

function MultiChoiceVariant({
  card_id,
  card,
  onMultiChoiceSelect,
}: {
  card_id: string;
  card: MultiChoiceCardOutput;
  onMultiChoiceSelect?: OrchestratorCardProps['onMultiChoiceSelect'];
}): ReactNode {
  const [freeForm, setFreeForm] = useState('');
  const inputId = `orchestrator-card-${card_id}-freeform`;
  return (
    <>
      <p className="text-sm font-medium">{card.question}</p>
      <p className={RATIONALE_CLASSES}>{card.rationale}</p>
      <div className="flex flex-col gap-1 mt-1">
        {card.options.map((option, idx) => (
          <button
            key={idx}
            type="button"
            data-testid={`multi-choice-option-${idx}`}
            onClick={() => onMultiChoiceSelect?.(idx, null)}
            className="text-left px-2 py-1 text-xs rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 hover:bg-blue-100 dark:hover:bg-blue-900"
          >
            {option}
          </button>
        ))}
      </div>
      <label htmlFor={inputId} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
        None of the above
      </label>
      <textarea
        id={inputId}
        data-testid="multi-choice-freeform"
        placeholder="Describe a different routing"
        value={freeForm}
        onChange={(e) => setFreeForm(e.target.value)}
        rows={2}
        className="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
      />
      <button
        type="button"
        data-testid="multi-choice-freeform-submit"
        disabled={freeForm.trim() === ''}
        onClick={() => onMultiChoiceSelect?.(-1, freeForm.trim())}
        className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:bg-blue-50 disabled:text-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800 dark:disabled:bg-blue-950 dark:disabled:text-blue-700"
      >
        Submit
      </button>
    </>
  );
}

function SendPromptVariant({ card }: { card: SendPromptToSessionOutput }): ReactNode {
  const preview = card.prompt.slice(0, 200);
  const isLong = card.prompt.length > 200;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span data-testid="orchestrator-card-action-type" className={ACTION_TYPE_PILL_CLASSES}>
          {card.type}
        </span>
        <span data-testid="orchestrator-card-session-name" className={SESSION_NAME_CLASSES}>
          {card.sessionName}
        </span>
      </div>
      <p
        data-testid="orchestrator-card-prompt-preview"
        className="text-xs text-gray-800 dark:text-gray-200 font-mono bg-gray-100 dark:bg-gray-800 rounded p-1"
      >
        {preview}
      </p>
      {isLong && (
        <span
          data-testid="orchestrator-card-prompt-length-indicator"
          className="text-[10px] text-gray-500 dark:text-gray-400"
        >
          {card.prompt.length} chars
        </span>
      )}
      <p className={RATIONALE_CLASSES}>{card.rationale}</p>
    </div>
  );
}

function SpawnSessionVariant({ card }: { card: SpawnSessionOutput }): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span data-testid="orchestrator-card-action-type" className={ACTION_TYPE_PILL_CLASSES}>
          {card.type}
        </span>
        <span data-testid="orchestrator-card-session-name" className={SESSION_NAME_CLASSES}>
          {card.sessionName}
        </span>
      </div>
      <p
        data-testid="orchestrator-card-repo-path"
        className="text-xs font-mono text-gray-700 dark:text-gray-300"
      >
        {card.repoPath}
      </p>
      {card.initialPrompt && (
        <p
          data-testid="orchestrator-card-initial-prompt-preview"
          className="text-xs text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded p-1"
        >
          {card.initialPrompt}
        </p>
      )}
      <p className={RATIONALE_CLASSES}>{card.rationale}</p>
    </div>
  );
}

function KillSessionVariant({ card }: { card: KillSessionOutput }): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span data-testid="orchestrator-card-action-type" className={ACTION_TYPE_PILL_CLASSES}>
          {card.type}
        </span>
        <span data-testid="orchestrator-card-session-name" className={SESSION_NAME_CLASSES}>
          {card.sessionName}
        </span>
      </div>
      {card.reason && (
        <p data-testid="orchestrator-card-kill-reason" className={RATIONALE_CLASSES}>
          {card.reason}
        </p>
      )}
      <p className={RATIONALE_CLASSES}>{card.rationale}</p>
    </div>
  );
}

function PullHandoffVariant({ card }: { card: PullHandoffFromSessionOutput }): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span data-testid="orchestrator-card-action-type" className={ACTION_TYPE_PILL_CLASSES}>
          {card.type}
        </span>
        <span data-testid="orchestrator-card-session-name" className={SESSION_NAME_CLASSES}>
          {card.sessionName}
        </span>
      </div>
      <p className={RATIONALE_CLASSES}>{card.rationale}</p>
    </div>
  );
}

function AssignTaskVariant({ card }: { card: AssignTaskOutput }): ReactNode {
  const params = card.parameters;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span data-testid="orchestrator-card-action-type" className={ACTION_TYPE_PILL_CLASSES}>
          {card.type}
        </span>
        <span data-testid="orchestrator-card-session-name" className={SESSION_NAME_CLASSES}>
          {card.sessionName}
        </span>
      </div>
      <p
        data-testid="orchestrator-card-task-description"
        className="text-xs text-gray-800 dark:text-gray-200"
      >
        {card.taskDescription}
      </p>
      {params && Object.keys(params).length > 0 && (
        <table data-testid="orchestrator-card-parameters-table" className="text-xs w-full">
          <tbody>
            {Object.entries(params).map(([k, v]) => (
              <tr key={k}>
                <td className="font-medium pr-2 text-gray-700 dark:text-gray-300">{k}</td>
                <td className="text-gray-600 dark:text-gray-400">{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className={RATIONALE_CLASSES}>{card.rationale}</p>
    </div>
  );
}

function CardBody({
  card_id,
  card,
  onApprove,
  onDecline,
  onMultiChoiceSelect,
}: {
  card_id: string;
  card: AnyCard;
  onApprove?: OrchestratorCardProps['onApprove'];
  onDecline?: OrchestratorCardProps['onDecline'];
  onMultiChoiceSelect?: OrchestratorCardProps['onMultiChoiceSelect'];
}): ReactNode {
  if (card.type === 'card') {
    return (
      <CardVariant
        card_id={card_id}
        card={card}
        onApprove={onApprove}
        onDecline={onDecline}
      />
    );
  }
  if (card.type === 'multi-choice-card') {
    return (
      <MultiChoiceVariant
        card_id={card_id}
        card={card}
        onMultiChoiceSelect={onMultiChoiceSelect}
      />
    );
  }
  if (card.type === 'send-prompt-to-session') {
    return <SendPromptVariant card={card} />;
  }
  if (card.type === 'spawn-session') {
    return <SpawnSessionVariant card={card} />;
  }
  if (card.type === 'kill-session') {
    return <KillSessionVariant card={card} />;
  }
  if (card.type === 'pull-handoff-from-session') {
    return <PullHandoffVariant card={card} />;
  }
  return <AssignTaskVariant card={card} />;
}

function DismissedBody({ card }: { card: AnyCard }): ReactNode {
  return (
    <>
      {card.type === 'card' ? (
        <CardActionProposal card={card} />
      ) : card.type === 'multi-choice-card' ? (
        <p className="text-sm font-medium">{card.question}</p>
      ) : (
        <p className="text-xs font-medium">{card.type}</p>
      )}
      <span
        data-testid="orchestrator-card-dismissed-badge"
        className="self-start text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      >
        Declined
      </span>
    </>
  );
}

export function OrchestratorCard({
  card_id,
  card,
  approvalRequired,
  superseded_card_ids,
  is_stale,
  is_dismissed,
  onApprove,
  onDecline,
  onMultiChoiceSelect,
}: OrchestratorCardProps): ReactNode {
  const lifecycleClass = is_dismissed
    ? ` ${DISMISSED_CLASSES}`
    : is_stale
      ? ` ${STALE_CLASSES}`
      : '';
  return (
    <div
      data-testid="orchestrator-card"
      data-card-id={card_id}
      className={`p-2 rounded shadow border ${ORCHESTRATOR_CARD_TINT_CLASSES} flex flex-col gap-1${lifecycleClass}`}
    >
      {superseded_card_ids && superseded_card_ids.length > 0 && (
        <p
          data-testid="orchestrator-card-supersedes"
          className="text-[10px] uppercase tracking-wide text-blue-700 dark:text-blue-300"
        >
          supersedes: {superseded_card_ids.join(', ')}
        </p>
      )}
      {approvalRequired === true && (
        <span
          data-testid="approval-required-indicator"
          className="self-start text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
        >
          Approval required
        </span>
      )}
      {approvalRequired === false && (
        <span
          data-testid="fires-automatically-indicator"
          className="self-start text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
        >
          Fires automatically
        </span>
      )}
      {is_dismissed ? (
        <DismissedBody card={card} />
      ) : (
        <CardBody
          card_id={card_id}
          card={card}
          onApprove={onApprove}
          onDecline={onDecline}
          onMultiChoiceSelect={onMultiChoiceSelect}
        />
      )}
    </div>
  );
}
