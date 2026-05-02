export interface ReadScopes {
  allowed: string[];
  excluded: string[];
}

export class ReadScopeViolationError extends Error {
  readonly requestedPath: string;
  readonly configuredScopes: string[];

  constructor(requestedPath: string, configuredScopes: string[]) {
    super(
      `ReadScopeViolation: "${requestedPath}" is outside configured allowed directories [${configuredScopes.join(', ')}]`,
    );
    this.name = 'ReadScopeViolationError';
    this.requestedPath = requestedPath;
    this.configuredScopes = configuredScopes;
  }
}

/**
 * Enforce the EXPLICIT-ALLOW read-scope pattern per WORKSTATION_CONTRACT.md §4.4.
 * Throws ReadScopeViolationError if path is outside allowed directories or
 * matches an excluded sub-path.
 */
export function checkReadScope(requestedPath: string, scopes: ReadScopes): void {
  const normalized = requestedPath.endsWith('/')
    ? requestedPath.slice(0, -1)
    : requestedPath;

  // Check excluded paths first (exclusions override allows)
  for (const excluded of scopes.excluded) {
    const norm = excluded.endsWith('/') ? excluded.slice(0, -1) : excluded;
    if (normalized === norm || normalized.startsWith(norm + '/')) {
      throw new ReadScopeViolationError(requestedPath, scopes.allowed);
    }
  }

  // Check that path falls within at least one allowed scope
  for (const allowed of scopes.allowed) {
    const norm = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
    if (normalized === norm || normalized.startsWith(norm + '/')) {
      return; // allowed
    }
  }

  throw new ReadScopeViolationError(requestedPath, scopes.allowed);
}
