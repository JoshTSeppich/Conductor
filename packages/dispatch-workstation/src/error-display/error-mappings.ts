// MB-T08 Cluster 3 GREEN — error-envelope normalization + friendly titles.
//
// Multiple existing error envelopes converge on the toast surface:
//   - spawn-ipc.ts:46 SpawnErrorReply.error  →  {error_type, message, sessionName?, stderr?}
//   - console-ipc.ts:90 WorkstationError     →  {type, message}
//   - MB-T06 SessionCapExceeded (Session A's territory; envelope shape included
//     here so MB-T06 can throw without amending MB-T08 first)
//   - COARCH-T03 Anthropic SDK errors (deferred to v3.x; envelope shape MODELED)
//
// This module defines the union the toast component renders and a mapping
// table from envelope.type → friendly title.
//
// Adding a new error type: extend WorkstationDisplayError + add a row to
// FRIENDLY_TITLES below.

export interface SpawnFailedEnvelope {
  type: 'SpawnFailed';
  message: string;
  sessionName?: string;
  stderr?: string;
}

export interface SessionNameExistsEnvelope {
  type: 'SessionNameExists';
  message: string;
  sessionName?: string;
}

export interface DaemonUnreachableEnvelope {
  type: 'DaemonUnreachable';
  message: string;
}

export interface SessionAlreadyRegisteredEnvelope {
  type: 'SessionAlreadyRegistered';
  message: string;
  sessionName?: string;
}

export interface SessionCapExceededEnvelope {
  type: 'SessionCapExceeded';
  message: string;
  cap?: number;
}

export interface PanelCapExceededEnvelope {
  type: 'PanelCapExceeded';
  message: string;
}

export interface AnthropicAPIErrorEnvelope {
  type: 'AnthropicAPIError';
  message: string;
  statusCode?: number;
}

export type WorkstationDisplayError =
  | SpawnFailedEnvelope
  | SessionNameExistsEnvelope
  | DaemonUnreachableEnvelope
  | SessionAlreadyRegisteredEnvelope
  | SessionCapExceededEnvelope
  | PanelCapExceededEnvelope
  | AnthropicAPIErrorEnvelope;

export const FRIENDLY_TITLES: Record<WorkstationDisplayError['type'], string> = {
  SpawnFailed: 'Session spawn failed',
  SessionNameExists: 'Session name already in use',
  DaemonUnreachable: 'Daemon not running',
  SessionAlreadyRegistered: 'Session already registered',
  SessionCapExceeded: 'Session cap reached',
  PanelCapExceeded: 'Console panel cap reached',
  AnthropicAPIError: 'Anthropic API error',
};

export function friendlyTitle(error: WorkstationDisplayError): string {
  return FRIENDLY_TITLES[error.type];
}

/**
 * Map a spawn-ipc.ts SpawnErrorReply.error onto the display union. Spawn-ipc's
 * envelope uses `error_type` as the discriminator; the toast prefers `type`
 * (matching console-ipc.ts:91 WorkstationError + V3 contract §6.5 wording).
 */
export function fromSpawnError(spawnErr: {
  error_type: string;
  message: string;
  sessionName?: string;
  stderr?: string;
}): WorkstationDisplayError {
  switch (spawnErr.error_type) {
    case 'SpawnFailed':
      return {
        type: 'SpawnFailed',
        message: spawnErr.message,
        sessionName: spawnErr.sessionName,
        stderr: spawnErr.stderr,
      };
    case 'SessionNameExists':
      return {
        type: 'SessionNameExists',
        message: spawnErr.message,
        sessionName: spawnErr.sessionName,
      };
    case 'DaemonUnreachable':
      return { type: 'DaemonUnreachable', message: spawnErr.message };
    case 'SessionAlreadyRegistered':
      return {
        type: 'SessionAlreadyRegistered',
        message: spawnErr.message,
        sessionName: spawnErr.sessionName,
      };
    default:
      // Unknown error_type — fall through as SpawnFailed so operator still
      // sees the original message rather than a silent drop.
      return { type: 'SpawnFailed', message: spawnErr.message };
  }
}
