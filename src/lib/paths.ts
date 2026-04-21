import { homedir } from 'node:os';
import { join } from 'node:path';

/** Root directory for all fd state: `~/.foxworks-dispatch`. */
export function fdHome(): string {
  return join(homedir(), '.foxworks-dispatch');
}

/** Path to the registry file: `~/.foxworks-dispatch/sessions.json`. */
export function sessionsPath(): string {
  return join(fdHome(), 'sessions.json');
}

/** Archive root: `~/.foxworks-dispatch/archive`. */
export function archiveRoot(): string {
  return join(fdHome(), 'archive');
}
